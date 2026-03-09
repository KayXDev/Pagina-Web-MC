import dbConnect from '@/lib/mongodb';
import LoyaltyEvent from '@/models/LoyaltyEvent';
import ShopOrder from '@/models/ShopOrder';
import User from '@/models/User';

const DEFAULT_EARNING_POINTS_PER_EURO = 10;
const DEFAULT_REDEMPTION_POINTS_PER_EURO = 200;

function readEarningPointsPerEuro() {
  const raw = Number(process.env.LOYALTY_EARNING_POINTS_PER_EURO || process.env.LOYALTY_POINTS_PER_EURO || DEFAULT_EARNING_POINTS_PER_EURO);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_EARNING_POINTS_PER_EURO;
}

function readRedemptionPointsPerEuro() {
  const raw = Number(process.env.LOYALTY_REDEMPTION_POINTS_PER_EURO || DEFAULT_REDEMPTION_POINTS_PER_EURO);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REDEMPTION_POINTS_PER_EURO;
}

export function getLoyaltyRedemptionRate() {
  return readRedemptionPointsPerEuro();
}

export function getLoyaltyEarningRate() {
  return readEarningPointsPerEuro();
}

export function calculateLoyaltyPoints(totalPrice: number) {
  const normalizedTotal = Number(totalPrice || 0);
  if (!Number.isFinite(normalizedTotal) || normalizedTotal <= 0) return 0;
  return Math.max(0, Math.floor(normalizedTotal * readEarningPointsPerEuro()));
}

export function getLoyaltyEarningPreview(totalPrice: number) {
  const basedOnTotal = Math.max(0, Math.round((Number(totalPrice || 0) + Number.EPSILON) * 100) / 100);
  return {
    points: calculateLoyaltyPoints(basedOnTotal),
    basedOnTotal,
    pointsPerCurrencyUnit: readEarningPointsPerEuro(),
  };
}

export function calculateLoyaltyDiscount(pointsToRedeem: number) {
  const safePoints = Math.max(0, Math.floor(Number(pointsToRedeem || 0)));
  if (!safePoints) return 0;
  return Math.round(((safePoints / getLoyaltyRedemptionRate()) + Number.EPSILON) * 100) / 100;
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

  const order = await ShopOrder.findById(orderId);
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' as const };
  if (String((order as any).status || '') !== 'PAID') return { ok: false, reason: 'ORDER_NOT_PAID' as const };

  const userId = String((order as any).userId || '').trim();
  if (!userId) return { ok: true, skipped: 'NO_USER' as const, points: 0 };

  const points = calculateLoyaltyPoints(Number((order as any).totalPrice || 0));
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