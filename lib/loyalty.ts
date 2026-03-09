import dbConnect from '@/lib/mongodb';
import LoyaltyEvent from '@/models/LoyaltyEvent';
import ShopOrder from '@/models/ShopOrder';
import User from '@/models/User';

const DEFAULT_POINTS_PER_EURO = 10;

function readPointsPerEuro() {
  const raw = Number(process.env.LOYALTY_POINTS_PER_EURO || DEFAULT_POINTS_PER_EURO);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_POINTS_PER_EURO;
}

export function calculateLoyaltyPoints(totalPrice: number) {
  const normalizedTotal = Number(totalPrice || 0);
  if (!Number.isFinite(normalizedTotal) || normalizedTotal <= 0) return 0;
  return Math.max(0, Math.floor(normalizedTotal * readPointsPerEuro()));
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