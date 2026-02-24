import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import PartnerAd from '@/models/PartnerAd';
import PartnerBooking from '@/models/PartnerBooking';
import { PARTNER_MAX_DAYS, PARTNER_PAID_MAX_SLOT, PARTNER_SLOTS, normalizeDays } from '@/lib/partnerPricing';
import { getPartnerSlotOverrides } from '@/lib/partnerSlotOverridesStore';

export const dynamic = 'force-dynamic';

const schema = z.object({
  slot: z
    .number()
    .int()
    .refine((s) => Number(s) >= PARTNER_PAID_MAX_SLOT + 1 && Number(s) <= PARTNER_SLOTS, {
      message: `Slot inválido (gratis solo #${PARTNER_PAID_MAX_SLOT + 1}–#${PARTNER_SLOTS})`,
    }),
  kind: z.enum(['CUSTOM', 'MONTHLY']),
  days: z.number().int().min(1).max(PARTNER_MAX_DAYS).optional(),

  note: z.string().min(20).max(300),

  serverName: z.string().min(3).max(60),
  address: z.string().min(3).max(80),
  version: z.string().max(30).optional().or(z.literal('')),
  description: z.string().min(20).max(500),
  website: z.string().max(200).optional().or(z.literal('')),
  discord: z.string().max(200).optional().or(z.literal('')),
  banner: z.string().max(500).optional().or(z.literal('')),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    // Admin manual overrides occupy slots too.
    const overrides = await getPartnerSlotOverrides();
    const isSlotManual = Number(parsed.data.slot) >= 1 && Boolean(String((overrides as any)?.slots?.[Number(parsed.data.slot) - 1] || '').trim());
    if (isSlotManual) {
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

    // Ensure slot is available
    const now = new Date();
    await PartnerBooking.updateMany(
      { status: 'ACTIVE', endsAt: { $lt: now } },
      { $set: { status: 'EXPIRED', slotActiveKey: '' } }
    );

    // Clear stale payment reservations (older than 30 min). Do not clear paid pending reviews, and do not clear free requests.
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
    await PartnerBooking.updateMany(
      { status: 'PENDING', createdAt: { $lt: staleCutoff }, paidAt: { $exists: false }, provider: { $in: ['PAYPAL', 'STRIPE'] } },
      { $set: { status: 'CANCELED', slotActiveKey: '' } }
    );

    const blocked = await PartnerBooking.findOne({ slot: parsed.data.slot, status: { $in: ['PENDING', 'ACTIVE'] } })
      .select('_id status endsAt createdAt paidAt provider')
      .lean();

    if (blocked) {
      return NextResponse.json({ error: 'Slot no disponible' }, { status: 409 });
    }

    const headers = new Headers(request.headers);
    const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '';
    const userAgent = headers.get('user-agent') || '';

    try {
      await PartnerBooking.create({
        adId,
        userId: user.id,
        slot: parsed.data.slot,
        kind,
        days,
        currency: 'EUR',
        dailyPriceEur: 0,
        discountPct: 0,
        totalPrice: 0,
        status: 'PENDING',
        provider: 'FREE',
        slotActiveKey: `SLOT#${parsed.data.slot}`,
        requestNote: String(parsed.data.note || '').trim(),
        ip,
        userAgent,
      });
    } catch (err: any) {
      if (String(err?.code) === '11000') {
        return NextResponse.json({ error: 'Slot no disponible' }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Partner free request error:', error);
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
