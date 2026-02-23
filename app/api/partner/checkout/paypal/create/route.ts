import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import PartnerAd from '@/models/PartnerAd';
import PartnerBooking from '@/models/PartnerBooking';
import { PARTNER_MAX_DAYS, computeTotalEurWithConfig, normalizeDays } from '@/lib/partnerPricing';
import { paypalCreateOrder } from '@/lib/paypal';
import { getPartnerPricingConfig } from '@/lib/partnerPricingStore';

const schema = z.object({
  slot: z.number().int().min(1).max(10),
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

    const now = new Date();
    await PartnerBooking.updateMany(
      { status: 'ACTIVE', endsAt: { $lt: now } },
      { $set: { status: 'EXPIRED', slotActiveKey: '' } }
    );

    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
    await PartnerBooking.updateMany(
      { status: 'PENDING', createdAt: { $lt: staleCutoff } },
      { $set: { status: 'CANCELED', slotActiveKey: '' } }
    );

    const blocked = await PartnerBooking.findOne({ slot: parsed.data.slot, status: { $in: ['PENDING', 'ACTIVE'] } })
      .select('_id status endsAt createdAt')
      .lean();

    if (blocked) {
      if (String((blocked as any).status) === 'ACTIVE') {
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
        { error: 'El precio configurado es 0€. No se puede crear un pago con importe 0€. Sube el precio para poder probar el pago.' },
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
        provider: 'PAYPAL',
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

    const siteUrl = getSiteUrl(request);
    const returnUrl = `${siteUrl}/partner/paypal/return?bookingId=${encodeURIComponent(bookingId)}`;
    const cancelUrl = `${siteUrl}/partner/paypal/cancel?bookingId=${encodeURIComponent(bookingId)}`;

    const description = String(process.env.SITE_NAME || 'Partner') + ` - Slot #${parsed.data.slot}`;

    const created = await paypalCreateOrder({
      totalPrice: pricing.totalEur,
      currency,
      description,
      customId: bookingId,
      returnUrl,
      cancelUrl,
    });

    await PartnerBooking.updateOne(
      { _id: bookingId },
      { $set: { paypalOrderId: created.paypalOrderId, paypalStatus: created.status } }
    );

    return NextResponse.json({ bookingId, paypalOrderId: created.paypalOrderId, approvalUrl: created.approvalUrl });
  } catch (error: any) {
    console.error('Partner paypal create error:', error);
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
