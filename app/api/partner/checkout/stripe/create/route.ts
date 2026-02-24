import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import PartnerAd from '@/models/PartnerAd';
import PartnerBooking from '@/models/PartnerBooking';
import { PARTNER_MAX_DAYS, PARTNER_PAID_MAX_SLOT, PARTNER_VIP_SLOT, computeTotalEurWithConfig, normalizeDays } from '@/lib/partnerPricing';
import { getStripe, toStripeAmount } from '@/lib/stripe';
import { getPartnerPricingConfig } from '@/lib/partnerPricingStore';
import { getPartnerSlotOverrides } from '@/lib/partnerSlotOverridesStore';

const schema = z.object({
  slot: z
    .number()
    .int()
    .refine((s) => Number(s) === PARTNER_VIP_SLOT || (Number(s) >= 1 && Number(s) <= PARTNER_PAID_MAX_SLOT), {
      message: `Slot inválido (solo VIP y #1–#${PARTNER_PAID_MAX_SLOT})`,
    }),
  kind: z.enum(['CUSTOM', 'MONTHLY']),
  days: z.number().int().min(1).max(PARTNER_MAX_DAYS).optional(),

  serverName: z.string().min(3).max(60),
  address: z.string().min(3).max(80),
  version: z.string().max(30).optional().or(z.literal('')),
  description: z.string().min(20).max(500),
  website: z.string().max(200).optional().or(z.literal('')),
  discord: z.string().max(200).optional().or(z.literal('')),
  banner: z.string().max(500).optional().or(z.literal('')),
});

function getSiteUrl(request: Request): string {
  const fromEnv = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    // Admin manual overrides occupy slots too.
    const overrides = await getPartnerSlotOverrides();
    const isVipManual = Number(parsed.data.slot) === Number(PARTNER_VIP_SLOT) && Boolean(String((overrides as any)?.vipAdId || '').trim());
    const isSlotManual = Number(parsed.data.slot) >= 1 && Boolean(String((overrides as any)?.slots?.[Number(parsed.data.slot) - 1] || '').trim());
    if (isVipManual || isSlotManual) {
      return NextResponse.json({ error: 'Slot no disponible' }, { status: 409 });
    }

    const existingAd = await PartnerAd.findOne({ userId: user.id }).lean();

    const nextData = {
      serverName: parsed.data.serverName,
      address: parsed.data.address,
      version: parsed.data.version || '',
      description: parsed.data.description,
      website: parsed.data.website || '',
      discord: parsed.data.discord || '',
      banner: parsed.data.banner || '',
    };

    const ownerUsername = String((user as any).name || user.email || '');

    let adId = '';
    if (!existingAd) {
      const createdAd = await PartnerAd.create({
        userId: user.id,
        ownerUsername,
        ...nextData,
        status: 'PENDING_REVIEW',
        rejectionReason: '',
      });
      adId = String(createdAd._id);
    } else {
      const current = existingAd as any;
      const changed =
        String(current.serverName || '') !== String(nextData.serverName || '') ||
        String(current.address || '') !== String(nextData.address || '') ||
        String(current.version || '') !== String(nextData.version || '') ||
        String(current.description || '') !== String(nextData.description || '') ||
        String(current.website || '') !== String(nextData.website || '') ||
        String(current.discord || '') !== String(nextData.discord || '') ||
        String(current.banner || '') !== String(nextData.banner || '');

      const nextStatus = String(current.status) === 'APPROVED' && !changed ? 'APPROVED' : 'PENDING_REVIEW';
      await PartnerAd.updateOne(
        { _id: current._id, userId: user.id },
        {
          $set: {
            ownerUsername,
            ...nextData,
            status: nextStatus,
            rejectionReason: nextStatus === 'PENDING_REVIEW' ? '' : String(current.rejectionReason || ''),
          },
        }
      );
      adId = String(current._id);
    }

    const kind = parsed.data.kind;
    const days = normalizeDays(kind, parsed.data.days);

    // Ensure slot is available (unique partial index also helps)
    const now = new Date();
    await PartnerBooking.updateMany(
      { status: 'ACTIVE', endsAt: { $lt: now } },
      { $set: { status: 'EXPIRED', slotActiveKey: '' } }
    );

    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
    await PartnerBooking.updateMany(
      // Only cancel unpaid payment reservations; don't cancel already-paid pending reviews,
      // and don't cancel free requests.
      { status: 'PENDING', createdAt: { $lt: staleCutoff }, paidAt: { $exists: false }, provider: { $in: ['PAYPAL', 'STRIPE'] } },
      { $set: { status: 'CANCELED', slotActiveKey: '' } }
    );

    const blocked = await PartnerBooking.findOne({ slot: parsed.data.slot, status: { $in: ['PENDING', 'ACTIVE'] } })
      .select('_id status endsAt createdAt paidAt provider')
      .lean();

    if (blocked) {
      if (String((blocked as any).status) === 'ACTIVE') {
        return NextResponse.json({ error: 'Slot no disponible' }, { status: 409 });
      }
      const provider = String((blocked as any).provider || '').toUpperCase();
      const hasPaidAt = Boolean((blocked as any).paidAt);
      if (hasPaidAt || provider === 'FREE') {
        return NextResponse.json({ error: 'Slot no disponible' }, { status: 409 });
      }
      const createdAtMs = (blocked as any).createdAt ? new Date((blocked as any).createdAt).getTime() : 0;
      if (createdAtMs && createdAtMs > staleCutoff.getTime()) {
        return NextResponse.json({ error: 'Slot no disponible' }, { status: 409 });
      }
    }

    const pricingConfig = await getPartnerPricingConfig();
    const pricing = computeTotalEurWithConfig({ slot: parsed.data.slot, kind, days, config: pricingConfig });
    const currency = 'EUR';

    if (!Number.isFinite(pricing.totalEur) || pricing.totalEur <= 0) {
      return NextResponse.json(
        { error: 'El precio configurado es 0€. Stripe no permite pagos de 0€. Sube el precio para poder probar el pago.' },
        { status: 400 }
      );
    }

    const headers = new Headers(request.headers);
    const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '';
    const userAgent = headers.get('user-agent') || '';

    let bookingId = '';
    try {
      const created = await PartnerBooking.create({
        adId,
        userId: user.id,
        slot: parsed.data.slot,
        kind,
        days: pricing.days,
        currency,
        dailyPriceEur: pricing.dailyPriceEur,
        discountPct: pricing.discountPct,
        totalPrice: pricing.totalEur,
        status: 'PENDING',
        provider: 'STRIPE',
        slotActiveKey: `SLOT#${parsed.data.slot}`,
        ip,
        userAgent,
      });
      bookingId = String(created._id);
    } catch (err: any) {
      if (String(err?.code) === '11000') {
        return NextResponse.json({ error: 'Slot no disponible' }, { status: 409 });
      }
      throw err;
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl(request);

    const slotLabel = parsed.data.slot === 0 ? 'VIP' : `#${parsed.data.slot}`;

    const label = kind === 'MONTHLY'
      ? `Partner Slot ${slotLabel} - 30 días (-${pricing.discountPct}%)`
      : `Partner Slot ${slotLabel} - ${pricing.days} días`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: String(currency).toLowerCase(),
            unit_amount: toStripeAmount(pricing.totalEur),
            product_data: { name: label },
          },
        },
      ],
      client_reference_id: bookingId,
      metadata: { bookingId },
      customer_email: user.email ? String(user.email) : undefined,
      success_url: `${siteUrl}/partner/stripe/success?bookingId=${encodeURIComponent(bookingId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/partner/stripe/cancel?bookingId=${encodeURIComponent(bookingId)}`,
    });

    await PartnerBooking.updateOne(
      { _id: bookingId },
      {
        $set: {
          stripeCheckoutSessionId: String(session.id || ''),
          stripeStatus: String((session as any).status || ''),
          stripePaymentStatus: String((session as any).payment_status || ''),
        },
      }
    );

    const url = String((session as any).url || '').trim();
    if (!url) return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 500 });

    return NextResponse.json({ bookingId, sessionId: String(session.id || ''), url });
  } catch (error: any) {
    console.error('Partner stripe create error:', error);
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
