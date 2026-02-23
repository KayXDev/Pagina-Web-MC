import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PartnerAd from '@/models/PartnerAd';
import PartnerBooking from '@/models/PartnerBooking';
import { PARTNER_SLOTS } from '@/lib/partnerPricing';
import { getPartnerSlotOverrides } from '@/lib/partnerSlotOverridesStore';

export async function GET() {
  try {
    await dbConnect();

    const overrides = await getPartnerSlotOverrides();
    const manualBySlot = new Map<number, string>();
    for (let i = 0; i < PARTNER_SLOTS; i++) {
      const adId = String(overrides.slots?.[i] || '').trim();
      if (adId) manualBySlot.set(i + 1, adId);
    }

    const now = new Date();
    await PartnerBooking.updateMany(
      { status: 'ACTIVE', endsAt: { $lt: now } },
      { $set: { status: 'EXPIRED', slotActiveKey: '' } }
    );

    const activeBookingsRaw = await PartnerBooking.find({ status: 'ACTIVE', endsAt: { $gt: now } })
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
      .sort((a: any, b: any) => a.slot - b.slot);

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Partner active error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
