import dbConnect from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import ReferralProfile from '@/models/ReferralProfile';
import ReferralEvent from '@/models/ReferralEvent';
import ShopOrder from '@/models/ShopOrder';
import User from '@/models/User';

function normalizeReferralCode(raw: string) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

function randomSuffix(size = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < size; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function ensureReferralProfileForUser(user: {
  id: string;
  username?: string;
}) {
  await dbConnect();

  const userId = String(user.id || '').trim();
  if (!userId) throw new Error('Unauthorized');

  const existing = await ReferralProfile.findOne({ userId }).lean();
  if (existing) return existing;

  const base = normalizeReferralCode(user.username || 'PLAYER').slice(0, 10) || 'PLAYER';

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = normalizeReferralCode(`${base}-${randomSuffix(5)}`);
    const exists = await ReferralProfile.findOne({ code: candidate }).lean();
    if (exists) continue;

    try {
      const created = await ReferralProfile.create({
        userId,
        code: candidate,
        active: true,
      });
      return created.toObject();
    } catch {
      // retry on duplicate race
    }
  }

  throw new Error('No se pudo generar código de referido');
}

export async function applyOrderIncentives(orderId: string) {
  await dbConnect();

  const order = await ShopOrder.findById(orderId);
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' as const };
  if (String((order as any).status) !== 'PAID') return { ok: false, reason: 'ORDER_NOT_PAID' as const };

  const updates: Record<string, any> = {};

  const couponCode = String((order as any).couponCode || '').trim().toUpperCase();
  if (couponCode && !(order as any).couponUsageAppliedAt) {
    const markCoupon = await ShopOrder.updateOne(
      { _id: order._id, couponUsageAppliedAt: { $exists: false } },
      { $set: { couponUsageAppliedAt: new Date() } }
    );

    if (Number((markCoupon as any).modifiedCount || 0) > 0) {
      await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: 1 } }).catch(() => null);
      updates.couponUsageApplied = true;
    }
  }

  const referrerUserId = String((order as any).referralReferrerUserId || '').trim();
  const referralCode = String((order as any).referralCode || '').trim().toUpperCase();
  const rewardAmount = Number((order as any).referralRewardAmount || 0);
  const discountAmount = Number((order as any).referralDiscountAmount || 0);
  const totalPrice = Number((order as any).totalPrice || 0);
  const referredUserId = String((order as any).userId || '').trim();

  if (referrerUserId && referralCode && rewardAmount > 0 && totalPrice > 0 && !(order as any).referralRewardAppliedAt) {
    const markReferral = await ShopOrder.updateOne(
      { _id: order._id, referralRewardAppliedAt: { $exists: false } },
      { $set: { referralRewardAppliedAt: new Date() } }
    );

    if (Number((markReferral as any).modifiedCount || 0) > 0) {
      await User.updateOne(
        { _id: referrerUserId },
        { $inc: { balance: rewardAmount } }
      ).catch(() => null);

      await ReferralProfile.updateOne(
        { userId: referrerUserId },
        {
          $inc: {
            successfulInvites: 1,
            totalDiscountGiven: discountAmount > 0 ? discountAmount : 0,
            totalRewardsGiven: rewardAmount,
          },
        }
      ).catch(() => null);

      await ReferralEvent.updateOne(
        { orderId: String(order._id) },
        {
          $setOnInsert: {
            orderId: String(order._id),
            referrerUserId,
            referredUserId,
            referralCode,
            discountAmount: discountAmount > 0 ? discountAmount : 0,
            rewardAmount,
            status: 'REWARDED',
          },
        },
        { upsert: true }
      ).catch(() => null);

      updates.referralRewardApplied = true;
    }
  }

  return { ok: true, updates };
}
