import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import dbConnect from '@/lib/mongodb';
import PartnerAd from '@/models/PartnerAd';
import PartnerBooking from '@/models/PartnerBooking';
import { PARTNER_PAID_MAX_SLOT, PARTNER_VIP_SLOT } from '@/lib/partnerPricing';
import { getPartnerSlotOverrides } from '@/lib/partnerSlotOverridesStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    noStore();
    await dbConnect();

    const overrides = await getPartnerSlotOverrides();
    const manualBySlot = new Map<number, string>();

    const vipAdId = String((overrides as any)?.vipAdId || '').trim();
    if (vipAdId) manualBySlot.set(PARTNER_VIP_SLOT, vipAdId);

    for (let i = 0; i < PARTNER_PAID_MAX_SLOT; i++) {
      const adId = String((overrides as any).slots?.[i] || '').trim();
      if (adId) manualBySlot.set(i + 1, adId);
    }

    const now = new Date();
    await PartnerBooking.updateMany(
      { status: 'ACTIVE', endsAt: { $lt: now } },
      { $set: { status: 'EXPIRED', slotActiveKey: '' } }
    );

    const featuredSlots = [PARTNER_VIP_SLOT, ...Array.from({ length: PARTNER_PAID_MAX_SLOT }, (_, i) => i + 1)];
    const activeBookingsRaw = await PartnerBooking.find({ status: 'ACTIVE', endsAt: { $gt: now }, slot: { $in: featuredSlots } })
      .select('adId slot endsAt startsAt kind days')
      .lean();

    const activeBookings = (activeBookingsRaw as any[]).filter((b: any) => !manualBySlot.has(Number(b.slot)));

    const manualAdIds = Array.from(new Set(Array.from(manualBySlot.values())));

    const bookingAdIds = Array.from(new Set(activeBookings.map((b: any) => String(b.adId || '')).filter(Boolean)));
    const adIds = Array.from(new Set([...bookingAdIds, ...manualAdIds]));

    const ads = await PartnerAd.find({ _id: { $in: adIds }, status: 'APPROVED' })
      .select('serverName address version description website discord banner ownerUsername')
      .lean();

    const adById = new Map<string, any>(ads.map((a: any) => [String(a._id), a]));

    const manualItems = Array.from(manualBySlot.entries())
      .map(([slot, adId]) => {
        const ad = adById.get(String(adId));
        if (!ad) return null;
        return {
          slot: Number(slot),
          ad: {
            id: String(ad._id),
            serverName: String(ad.serverName || ''),
            address: String(ad.address || ''),
            version: String(ad.version || ''),
            description: String(ad.description || ''),
            website: String(ad.website || ''),
            discord: String(ad.discord || ''),
            banner: String(ad.banner || ''),
            ownerUsername: String(ad.ownerUsername || ''),
          },
        };
      })
      .filter(Boolean);

    const items = [...manualItems, ...activeBookings
      .map((b: any) => {
        const ad = adById.get(String(b.adId));
        if (!ad) return null;
        return {
          slot: Number(b.slot),
          endsAt: b.endsAt,
          startsAt: b.startsAt,
          ad: {
            id: String(ad._id),
            serverName: String(ad.serverName || ''),
            address: String(ad.address || ''),
            version: String(ad.version || ''),
            description: String(ad.description || ''),
            website: String(ad.website || ''),
            discord: String(ad.discord || ''),
            banner: String(ad.banner || ''),
            ownerUsername: String(ad.ownerUsername || ''),
          },
        };
      })
      .filter(Boolean)]
      .sort((a: any, b: any) => {
        if (Number(a.slot) === PARTNER_VIP_SLOT && Number(b.slot) !== PARTNER_VIP_SLOT) return -1;
        if (Number(b.slot) === PARTNER_VIP_SLOT && Number(a.slot) !== PARTNER_VIP_SLOT) return 1;
        return a.slot - b.slot;
      });

    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Partner active error:', error);
    return NextResponse.json(
      { error: 'Error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
