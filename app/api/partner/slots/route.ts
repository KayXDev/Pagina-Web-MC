import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import PartnerBooking from '@/models/PartnerBooking';
import { PARTNER_MAX_DAYS, PARTNER_SLOTS, computeTotalEurWithConfig } from '@/lib/partnerPricing';
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
      { status: 'PENDING', createdAt: { $lt: staleCutoff } },
      { $set: { status: 'CANCELED', slotActiveKey: '' } }
    );

    const activeOrPending = await PartnerBooking.find({ status: { $in: ['ACTIVE', 'PENDING'] } })
      .select('slot status endsAt createdAt')
      .lean();

    const blocked = new Set<number>();
    for (const b of activeOrPending as any[]) {
      const slot = Number(b.slot);
      if (!slot) continue;
      if (String(b.status) === 'ACTIVE') {
        if (b.endsAt && new Date(b.endsAt).getTime() > Date.now()) blocked.add(slot);
      } else {
        // PENDING booking blocks for up to 30min
        const createdAtMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (createdAtMs && createdAtMs > staleCutoff.getTime()) blocked.add(slot);
      }
    }

    const slots = Array.from({ length: PARTNER_SLOTS }, (_, i) => i + 1).map((slot) => {
      const price = computeTotalEurWithConfig({ slot, kind: parsed.data.kind, days: parsed.data.days, config: pricingConfig });
      return {
        slot,
        available: !blocked.has(slot),
        days: price.days,
        dailyPriceEur: price.dailyPriceEur,
        discountPct: price.discountPct,
        totalEur: price.totalEur,
      };
    });

    return NextResponse.json({ slots });
  } catch (error: any) {
    console.error('Partner slots error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
