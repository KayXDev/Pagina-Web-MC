export type PartnerDurationKind = 'CUSTOM' | 'MONTHLY';

export type PartnerPricingConfig = {
  // slotTotalsEur[slotIndex][dayIndex] => total price for that slot and day count (dayIndex=0 => 1 day)
  slotTotalsEur: number[][];
};

export const PARTNER_SLOTS = 10;
export const PARTNER_MAX_DAYS = 30;

const DEFAULT_DAILY_PRICES_EUR = [
  5.0,  // #1
  4.0,  // #2
  3.0,  // #3
  2.5,  // #4
  2.0,  // #5
  1.5,  // #6
  1.2,  // #7
  1.0,  // #8
  0.8,  // #9
  0.6,  // #10
];

export function getDefaultPartnerPricingConfigFromEnv(): PartnerPricingConfig {
  const daily = getSlotDailyPricesEur();
  const slotTotalsEur = daily.map((d) =>
    Array.from({ length: PARTNER_MAX_DAYS }, (_, idx) => {
      const days = idx + 1;
      const total = Number(d) * days;
      return Math.round(total * 100) / 100;
    })
  );

  // Ensure correct shape
  const normalized = slotTotalsEur.length === PARTNER_SLOTS ? slotTotalsEur : Array.from({ length: PARTNER_SLOTS }, () => Array(PARTNER_MAX_DAYS).fill(0));
  return { slotTotalsEur: normalized };
}

export function getPartnerCurrency(): string {
  return String(process.env.PARTNER_CURRENCY || process.env.SHOP_CURRENCY || 'EUR').toUpperCase();
}

export function getMonthlyDiscountPct(): number {
  const raw = Number(process.env.PARTNER_MONTHLY_DISCOUNT_PCT ?? 15);
  if (!Number.isFinite(raw)) return 15;
  return Math.min(80, Math.max(0, raw));
}

export function getSlotDailyPricesEur(): number[] {
  const raw = String(process.env.PARTNER_SLOT_DAILY_PRICES_JSON || '').trim();
  if (!raw) return DEFAULT_DAILY_PRICES_EUR;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_DAILY_PRICES_EUR;
    const nums = parsed.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0);
    if (nums.length !== PARTNER_SLOTS) return DEFAULT_DAILY_PRICES_EUR;
    return nums;
  } catch {
    return DEFAULT_DAILY_PRICES_EUR;
  }
}

export function getDailyPriceEur(slot: number): number {
  const idx = Math.floor(slot) - 1;
  const prices = getSlotDailyPricesEur();
  if (idx < 0 || idx >= prices.length) return prices[prices.length - 1];
  return prices[idx];
}

export function getDailyPriceEurWithConfig(slot: number, config: PartnerPricingConfig): number {
  const idx = Math.floor(slot) - 1;
  const row = Array.isArray(config?.slotTotalsEur) ? config.slotTotalsEur[idx] : null;
  const day1 = Array.isArray(row) ? Number(row[0]) : NaN;
  if (Number.isFinite(day1) && day1 >= 0) return Math.round(day1 * 100) / 100;
  return getDailyPriceEur(slot);
}

export function normalizeDays(kind: PartnerDurationKind, daysRaw?: number): number {
  if (kind === 'MONTHLY') return 30;
  const d = Math.floor(Number(daysRaw || 0));
  if (!Number.isFinite(d) || d <= 0) return 1;
  return Math.min(PARTNER_MAX_DAYS, Math.max(1, d));
}

export function computeTotalEur(params: {
  slot: number;
  kind: PartnerDurationKind;
  days?: number;
}): { days: number; dailyPriceEur: number; discountPct: number; totalEur: number } {
  return computeTotalEurWithConfig({
    slot: params.slot,
    kind: params.kind,
    days: params.days,
    config: getDefaultPartnerPricingConfigFromEnv(),
  });
}

export function computeTotalEurWithConfig(params: {
  slot: number;
  kind: PartnerDurationKind;
  days?: number;
  config: PartnerPricingConfig;
}): { days: number; dailyPriceEur: number; discountPct: number; totalEur: number } {
  const days = normalizeDays(params.kind, params.days);

  const slotIdx = Math.floor(params.slot) - 1;
  const row = Array.isArray(params.config?.slotTotalsEur) ? params.config.slotTotalsEur[slotIdx] : null;
  const fromTable = Array.isArray(row) ? Number(row[days - 1]) : NaN;
  const fallbackDaily = getDailyPriceEurWithConfig(params.slot, params.config);

  const total = Number.isFinite(fromTable) && fromTable >= 0
    ? Math.round(fromTable * 100) / 100
    : Math.round((fallbackDaily * days) * 100) / 100;

  const daily = days > 0 ? total / days : total;

  return {
    days,
    dailyPriceEur: Math.round(daily * 100) / 100,
    discountPct: 0,
    totalEur: total,
  };
}
