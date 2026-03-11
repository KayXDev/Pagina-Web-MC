import dbConnect from '@/lib/mongodb';
import LoyaltyEvent from '@/models/LoyaltyEvent';
import ShopOrder from '@/models/ShopOrder';
import Settings from '@/models/Settings';
import User from '@/models/User';

const DEFAULT_EARNING_POINTS_PER_EURO = 10;
const DEFAULT_REDEMPTION_POINTS_PER_EURO = 100;
const DEFAULT_BALANCE_POINTS_PER_EURO = 100;

export type LoyaltyConfig = {
  earningPointsPerEuro: number;
  redemptionPointsPerEuro: number;
  balancePointsPerEuro: number;
};

function readEarningPointsPerEuro() {
  const raw = Number(process.env.LOYALTY_EARNING_POINTS_PER_EURO || process.env.LOYALTY_POINTS_PER_EURO || DEFAULT_EARNING_POINTS_PER_EURO);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_EARNING_POINTS_PER_EURO;
}

function readRedemptionPointsPerEuro() {
  const raw = Number(process.env.LOYALTY_REDEMPTION_POINTS_PER_EURO || DEFAULT_REDEMPTION_POINTS_PER_EURO);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REDEMPTION_POINTS_PER_EURO;
}

function readBalancePointsPerEuro() {
  const raw = Number(process.env.LOYALTY_BALANCE_POINTS_PER_EURO || process.env.LOYALTY_REDEMPTION_POINTS_PER_EURO || DEFAULT_BALANCE_POINTS_PER_EURO);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BALANCE_POINTS_PER_EURO;
}

function sanitizePositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  await dbConnect();

  const settings = await Settings.find({
    key: {
      $in: [
        'loyalty_earning_points_per_euro',
        'loyalty_redemption_points_per_euro',
        'loyalty_balance_points_per_euro',
      ],
    },
  })
    .lean()
    .catch(() => []);

  const map = new Map((Array.isArray(settings) ? settings : []).map((setting: any) => [String(setting.key), String(setting.value)]));

  return {
    earningPointsPerEuro: sanitizePositiveNumber(map.get('loyalty_earning_points_per_euro'), readEarningPointsPerEuro()),
    redemptionPointsPerEuro: sanitizePositiveNumber(map.get('loyalty_redemption_points_per_euro'), readRedemptionPointsPerEuro()),
    balancePointsPerEuro: sanitizePositiveNumber(map.get('loyalty_balance_points_per_euro'), readBalancePointsPerEuro()),
  };
}

export function getLoyaltyRedemptionRate(config?: Partial<LoyaltyConfig>) {
  return sanitizePositiveNumber(config?.redemptionPointsPerEuro, readRedemptionPointsPerEuro());
}

export function getLoyaltyEarningRate(config?: Partial<LoyaltyConfig>) {
  return sanitizePositiveNumber(config?.earningPointsPerEuro, readEarningPointsPerEuro());
}

export function getLoyaltyBalanceRate(config?: Partial<LoyaltyConfig>) {
  return sanitizePositiveNumber(config?.balancePointsPerEuro, readBalancePointsPerEuro());
}

export function calculateLoyaltyPoints(totalPrice: number, config?: Partial<LoyaltyConfig>) {
  const normalizedTotal = Number(totalPrice || 0);
  if (!Number.isFinite(normalizedTotal) || normalizedTotal <= 0) return 0;
  return Math.max(0, Math.floor(normalizedTotal * getLoyaltyEarningRate(config)));
}

export function getLoyaltyEarningPreview(totalPrice: number, config?: Partial<LoyaltyConfig>) {
  const basedOnTotal = Math.max(0, Math.round((Number(totalPrice || 0) + Number.EPSILON) * 100) / 100);
  return {
    points: calculateLoyaltyPoints(basedOnTotal, config),
    basedOnTotal,
    pointsPerCurrencyUnit: getLoyaltyEarningRate(config),
  };
}

export function calculateLoyaltyDiscount(pointsToRedeem: number, config?: Partial<LoyaltyConfig>) {
  const safePoints = Math.max(0, Math.floor(Number(pointsToRedeem || 0)));
  if (!safePoints) return 0;
  return Math.round(((safePoints / getLoyaltyRedemptionRate(config)) + Number.EPSILON) * 100) / 100;
}

export function calculateBalanceFromLoyaltyPoints(pointsToConvert: number, config?: Partial<LoyaltyConfig>) {
  const safePoints = Math.max(0, Math.floor(Number(pointsToConvert || 0)));
  if (!safePoints) return 0;
  return Math.round(((safePoints / getLoyaltyBalanceRate(config)) + Number.EPSILON) * 100) / 100;
}

export function getLoyaltyTier(points: number) {
  const total = Math.max(0, Math.floor(Number(points || 0)));
  if (total >= 2500) return 'Diamond';
  if (total >= 1000) return 'Gold';
  if (total >= 250) return 'Silver';
  return 'Bronze';
}

export async function applyOrderLoyalty(orderId: string) {
  await dbConnect();
  const loyaltyConfig = await getLoyaltyConfig();

  const order = await ShopOrder.findById(orderId);
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' as const };
  if (String((order as any).status || '') !== 'PAID') return { ok: false, reason: 'ORDER_NOT_PAID' as const };

  const userId = String((order as any).userId || '').trim();
  if (!userId) return { ok: true, skipped: 'NO_USER' as const, points: 0 };

  const points = calculateLoyaltyPoints(Number((order as any).totalPrice || 0), loyaltyConfig);
  const appliedAt = new Date();

  const lock = await ShopOrder.updateOne(
    { _id: order._id, loyaltyAppliedAt: { $exists: false } },
    {
      $set: {
        loyaltyAppliedAt: appliedAt,
        loyaltyPointsAwarded: points,
      },
    }
  );

  if (Number((lock as any).modifiedCount || 0) === 0) {
    return {
      ok: true,
      alreadyApplied: true,
      points: Number((order as any).loyaltyPointsAwarded || 0),
    };
  }

  if (points > 0) {
    await User.updateOne(
      { _id: userId },
      {
        $inc: {
          loyaltyPoints: points,
          loyaltyLifetimePoints: points,
        },
        $set: {
          loyaltyLastEarnedAt: appliedAt,
        },
      }
    ).catch(() => null);
  }

  await LoyaltyEvent.updateOne(
    { orderId: String(order._id), type: 'ORDER_EARNED' },
    {
      $setOnInsert: {
        userId,
        orderId: String(order._id),
        type: 'ORDER_EARNED',
        points,
        amountSpent: Number((order as any).totalPrice || 0),
        currency: String((order as any).currency || 'EUR'),
        description: String((order as any).isGift)
          ? 'Puntos obtenidos por una compra regalo'
          : 'Puntos obtenidos por una compra en la tienda',
      },
    },
    { upsert: true }
  ).catch(() => null);

  return { ok: true, points };
}

export async function applyOrderLoyaltyRedemption(orderId: string) {
  await dbConnect();

  const order = await ShopOrder.findById(orderId);
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' as const };
  if (String((order as any).status || '') !== 'PAID') return { ok: false, reason: 'ORDER_NOT_PAID' as const };

  const userId = String((order as any).userId || '').trim();
  const pointsUsed = Math.max(0, Math.floor(Number((order as any).loyaltyPointsUsed || 0)));
  if (!userId || pointsUsed <= 0) return { ok: true, skipped: 'NO_REDEMPTION' as const, pointsUsed: 0 };

  const redeemedAt = new Date();
  const lock = await ShopOrder.updateOne(
    { _id: order._id, loyaltyRedeemedAt: { $exists: false } },
    {
      $set: {
        loyaltyRedeemedAt: redeemedAt,
      },
    }
  );

  if (Number((lock as any).modifiedCount || 0) === 0) {
    return { ok: true, alreadyApplied: true, pointsUsed };
  }

  await User.updateOne(
    { _id: userId },
    {
      $inc: {
        loyaltyPoints: -pointsUsed,
      },
    }
  ).catch(() => null);

  await LoyaltyEvent.updateOne(
    { orderId: String(order._id), type: 'ORDER_REDEEMED' },
    {
      $setOnInsert: {
        userId,
        orderId: String(order._id),
        type: 'ORDER_REDEEMED',
        points: -pointsUsed,
        amountSpent: Number((order as any).loyaltyDiscountAmount || 0),
        currency: String((order as any).currency || 'EUR'),
        description: 'Puntos canjeados en una compra de la tienda',
      },
    },
    { upsert: true }
  ).catch(() => null);

  return { ok: true, pointsUsed };
}