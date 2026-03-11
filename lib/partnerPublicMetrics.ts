import PartnerBooking from '@/models/PartnerBooking';
import { PARTNER_VIP_SLOT } from '@/lib/partnerPricing';

export type PartnerPublicMetrics = {
  totalCampaigns: number;
  totalBookedDays: number;
  vipCampaigns: number;
  firstPromotedAt: string | null;
  lastBookedAt: string | null;
};

const DEFAULT_METRICS: PartnerPublicMetrics = {
  totalCampaigns: 0,
  totalBookedDays: 0,
  vipCampaigns: 0,
  firstPromotedAt: null,
  lastBookedAt: null,
};

export async function getPartnerPublicMetricsMap(adIds: string[]) {
  const ids = Array.from(new Set(adIds.map((value) => String(value || '').trim()).filter(Boolean)));
  if (!ids.length) return new Map<string, PartnerPublicMetrics>();

  const rows = await PartnerBooking.aggregate([
    {
      $match: {
        adId: { $in: ids },
        status: { $in: ['ACTIVE', 'EXPIRED'] },
      },
    },
    {
      $group: {
        _id: '$adId',
        totalCampaigns: { $sum: 1 },
        totalBookedDays: { $sum: { $ifNull: ['$days', 0] } },
        vipCampaigns: {
          $sum: {
            $cond: [{ $eq: ['$slot', PARTNER_VIP_SLOT] }, 1, 0],
          },
        },
        firstPromotedAt: {
          $min: {
            $ifNull: ['$startsAt', '$createdAt'],
          },
        },
        lastBookedAt: {
          $max: {
            $ifNull: ['$endsAt', '$updatedAt'],
          },
        },
      },
    },
  ]);

  const result = new Map<string, PartnerPublicMetrics>();
  for (const row of rows as any[]) {
    const adId = String(row?._id || '').trim();
    if (!adId) continue;
    result.set(adId, {
      totalCampaigns: Number(row?.totalCampaigns || 0),
      totalBookedDays: Number(row?.totalBookedDays || 0),
      vipCampaigns: Number(row?.vipCampaigns || 0),
      firstPromotedAt: row?.firstPromotedAt ? new Date(row.firstPromotedAt).toISOString() : null,
      lastBookedAt: row?.lastBookedAt ? new Date(row.lastBookedAt).toISOString() : null,
    });
  }

  return result;
}

export function getDefaultPartnerPublicMetrics() {
  return DEFAULT_METRICS;
}