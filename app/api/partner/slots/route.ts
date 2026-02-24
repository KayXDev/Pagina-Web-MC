import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import PartnerBooking from '@/models/PartnerBooking';
import { getPartnerSlotOverrides } from '@/lib/partnerSlotOverridesStore';
import {
  PARTNER_MAX_DAYS,
  PARTNER_VIP_SLOT,
  PARTNER_PAID_MAX_SLOT,
  computeTotalEurWithConfig,
  isVipSlot,
} from '@/lib/partnerPricing';
import { getPartnerPricingConfig } from '@/lib/partnerPricingStore';

export const dynamic = 'force-dynamic';

const schema = z.object({
  kind: z.enum(['CUSTOM', 'MONTHLY']).default('CUSTOM'),
  days: z.coerce.number().int().min(1).max(PARTNER_MAX_DAYS).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({
      kind: searchParams.get('kind') || 'CUSTOM',
      days: searchParams.get('days') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();

    const pricingConfig = await getPartnerPricingConfig();

    const now = new Date();
    await PartnerBooking.updateMany(
      { status: 'ACTIVE', endsAt: { $lt: now } },
      { $set: { status: 'EXPIRED', slotActiveKey: '' } }
    );

    // Also clear stale pending reservations (older than 30 min)
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
    await PartnerBooking.updateMany(
      // Only cancel unpaid payment reservations; don't cancel already-paid pending reviews,
      // and don't cancel free requests.
      { status: 'PENDING', createdAt: { $lt: staleCutoff }, paidAt: { $exists: false }, provider: { $in: ['PAYPAL', 'STRIPE'] } },
      { $set: { status: 'CANCELED', slotActiveKey: '' } }
    );

    const activeOrPending = await PartnerBooking.find({ status: { $in: ['ACTIVE', 'PENDING'] } })
      .select('slot status endsAt createdAt paidAt provider')
      .lean();

    const blocked = new Set<number>();
    for (const b of activeOrPending as any[]) {
      const slot = Number(b.slot);
      if (!Number.isFinite(slot)) continue;
      if (String(b.status) === 'ACTIVE') {
        if (b.endsAt && new Date(b.endsAt).getTime() > Date.now()) blocked.add(slot);
      } else {
        const provider = String(b.provider || '').toUpperCase();
        const hasPaidAt = Boolean(b.paidAt);
        if (hasPaidAt || provider === 'FREE') {
          // Pending reviews (already paid) and free requests block until approved/rejected.
          blocked.add(slot);
          continue;
        }

        // Payment reservations block for up to 30min
        const createdAtMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (createdAtMs && createdAtMs > staleCutoff.getTime()) blocked.add(slot);
      }
    }

    // Admin manual overrides also occupy slots (even without bookings).
    const overrides = await getPartnerSlotOverrides();
    const vipAdId = String((overrides as any)?.vipAdId || '').trim();
    if (vipAdId) blocked.add(PARTNER_VIP_SLOT);
    for (let i = 0; i < PARTNER_PAID_MAX_SLOT; i++) {
      const adId = String((overrides as any)?.slots?.[i] || '').trim();
      if (adId) blocked.add(i + 1);
    }

    const vipPrice = computeTotalEurWithConfig({ slot: PARTNER_VIP_SLOT, kind: parsed.data.kind, days: parsed.data.days, config: pricingConfig });
    const vip = {
      slot: PARTNER_VIP_SLOT,
      vip: true,
      free: false,
      paid: true,
      available: !blocked.has(PARTNER_VIP_SLOT),
      days: vipPrice.days,
      dailyPriceEur: vipPrice.dailyPriceEur,
      discountPct: vipPrice.discountPct,
      totalEur: vipPrice.totalEur,
    };

    const slots = [
      vip,
      ...Array.from({ length: PARTNER_PAID_MAX_SLOT }, (_, i) => i + 1).map((slot) => {
        const price = computeTotalEurWithConfig({ slot, kind: parsed.data.kind, days: parsed.data.days, config: pricingConfig });
        return {
          slot,
          vip: isVipSlot(slot),
          free: false,
          paid: true,
          available: !blocked.has(slot),
          days: price.days,
          dailyPriceEur: price.dailyPriceEur,
          discountPct: price.discountPct,
          totalEur: price.totalEur,
        };
      }),
    ];

    return NextResponse.json({ slots });
  } catch (error: any) {
    console.error('Partner slots error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
