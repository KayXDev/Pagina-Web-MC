import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import User from '@/models/User';

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export async function applyOrderStoreBalance(orderId: string) {
  await dbConnect();

  const order = await ShopOrder.findById(orderId);
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' as const };
  if (String((order as any).status || '') !== 'PAID') return { ok: false, reason: 'ORDER_NOT_PAID' as const };

  const userId = String((order as any).userId || '').trim();
  const balanceUsedAmount = round2(Number((order as any).balanceUsedAmount || 0));
  if (!userId || balanceUsedAmount <= 0) {
    return { ok: true, skipped: 'NO_BALANCE_USAGE' as const, balanceUsedAmount: 0 };
  }

  const appliedAt = new Date();
  const lock = await ShopOrder.updateOne(
    { _id: order._id, balanceAppliedAt: { $exists: false } },
    {
      $set: {
        balanceAppliedAt: appliedAt,
      },
    }
  );

  if (Number((lock as any).modifiedCount || 0) === 0) {
    return { ok: true, alreadyApplied: true, balanceUsedAmount };
  }

  await User.updateOne(
    { _id: userId },
    {
      $inc: {
        balance: -balanceUsedAmount,
      },
    }
  ).catch(() => null);

  return { ok: true, balanceUsedAmount };
}