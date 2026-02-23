import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import {
  PARTNER_MAX_DAYS,
  PARTNER_SLOTS,
  type PartnerDurationKind,
  computeTotalEurWithConfig,
  getDefaultPartnerPricingConfigFromEnv,
  type PartnerPricingConfig,
} from '@/lib/partnerPricing';

const SETTINGS_KEY = 'partnerPricing';

function normalizeConfig(raw: any): PartnerPricingConfig {
  const fallback = getDefaultPartnerPricingConfigFromEnv();

  // New format: slotTotalsEur
  const rawTotals = raw?.slotTotalsEur;
  if (Array.isArray(rawTotals) && rawTotals.length === PARTNER_SLOTS) {
    const normalizedTotals = rawTotals.map((row: any, slotIdx: number) => {
      const arr = Array.isArray(row) ? row : [];
      const nums = arr.map((n: any) => Number(n));
      const out = Array.from({ length: PARTNER_MAX_DAYS }, (_, i) => {
        const v = Number(nums[i]);
        if (Number.isFinite(v) && v >= 0) return Math.round(v * 100) / 100;
        // If not provided/invalid, keep a sensible fallback instead of accidentally setting 0.
        return Number(fallback.slotTotalsEur?.[slotIdx]?.[i] ?? 0);
      });
      return out;
    });

    const ok = normalizedTotals.length === PARTNER_SLOTS && normalizedTotals.every((r) => Array.isArray(r) && r.length === PARTNER_MAX_DAYS);
    if (ok) return { slotTotalsEur: normalizedTotals };
  }

  // Back-compat: old format slotDailyPricesEur => derive totals
  const slotDailyPricesEurRaw = raw?.slotDailyPricesEur;
  const slotDailyPricesEur = Array.isArray(slotDailyPricesEurRaw)
    ? slotDailyPricesEurRaw.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n >= 0)
    : [];

  if (slotDailyPricesEur.length === PARTNER_SLOTS) {
    const slotTotalsEur = slotDailyPricesEur.map((d: number) =>
      Array.from({ length: PARTNER_MAX_DAYS }, (_, idx) => Math.round((d * (idx + 1)) * 100) / 100)
    );
    return { slotTotalsEur };
  }

  return fallback;
}

export async function getPartnerPricingConfig(): Promise<PartnerPricingConfig> {
  await dbConnect();

  const row = await Settings.findOne({ key: SETTINGS_KEY }).select('value').lean();
  if (!row?.value) return getDefaultPartnerPricingConfigFromEnv();

  try {
    const parsed = JSON.parse(String((row as any).value || ''));
    return normalizeConfig(parsed);
  } catch {
    return getDefaultPartnerPricingConfigFromEnv();
  }
}

export async function setPartnerPricingConfig(config: PartnerPricingConfig): Promise<void> {
  await dbConnect();
  await Settings.updateOne(
    { key: SETTINGS_KEY },
    {
      $set: {
        key: SETTINGS_KEY,
        value: JSON.stringify(normalizeConfig(config)),
        description: 'Partner pricing configuration (fixed totals per day and slot)',
      },
    },
    { upsert: true }
  );
}

export async function computePartnerTotalFromStore(params: { slot: number; kind: PartnerDurationKind; days?: number }) {
  const config = await getPartnerPricingConfig();
  const total = computeTotalEurWithConfig({ ...params, config });
  return { config, total };
}
