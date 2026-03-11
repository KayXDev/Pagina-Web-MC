import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';
import { buildRewardsProgress } from '@/lib/rewards';
import { requireAuth } from '@/lib/session';
import LoyaltyEvent from '@/models/LoyaltyEvent';
import Notification from '@/models/Notification';
import RewardClaim from '@/models/RewardClaim';
import ShopOrder from '@/models/ShopOrder';
import ShopWishlistItem from '@/models/ShopWishlistItem';
import User from '@/models/User';
import VoteEvent from '@/models/VoteEvent';
import ForumPost from '@/models/ForumPost';

async function resolveUserIdFromSessionUser(user: any) {
  const direct = typeof user?.id === 'string' && user.id ? user.id : '';
  if (direct) return direct;

  const alt = typeof user?._id === 'string' && user._id ? user._id : '';
  if (alt) return alt;

  const email = typeof user?.email === 'string' ? user.email.toLowerCase() : '';
  if (!email) throw new Error('Unauthorized');

  const found = await User.findOne({ email }, { _id: 1 }).lean();
  const id = found?._id ? String((found as any)._id) : '';
  if (!id) throw new Error('Unauthorized');
  return id;
}

async function loadRewardState(userId: string) {
  const [user, votesCount, paidOrdersCount, forumPosts, wishlistCount, claims] = await Promise.all([
    User.findById(userId)
      .select('_id loyaltyPoints loyaltyLifetimePoints balance minecraftLinkedAt minecraftUuid minecraftUsername')
      .lean(),
    VoteEvent.countDocuments({ userId }),
    ShopOrder.countDocuments({ userId, status: { $in: ['PAID', 'DELIVERED'] } }),
    ForumPost.find({ authorId: userId }).select('likesCount').lean(),
    ShopWishlistItem.countDocuments({ userId }),
    RewardClaim.find({ userId }).select('rewardKey').lean(),
  ]);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const forumPostsCount = Array.isArray(forumPosts) ? forumPosts.length : 0;
  const forumLikesReceived = Array.isArray(forumPosts)
    ? forumPosts.reduce((sum, post) => sum + Math.max(0, Number((post as any).likesCount || 0)), 0)
    : 0;
  const claimedKeys = new Set(
    (Array.isArray(claims) ? claims : [])
      .map((claim) => String((claim as any).rewardKey || '').trim())
      .filter(Boolean)
  );

  const rewards = buildRewardsProgress(
    {
      hasMinecraftLinked: Boolean((user as any).minecraftLinkedAt || (user as any).minecraftUuid || (user as any).minecraftUsername),
      votesCount,
      paidOrdersCount,
      loyaltyLifetimePoints: Math.max(0, Math.floor(Number((user as any).loyaltyLifetimePoints || 0))),
      forumPostsCount,
      forumLikesReceived,
      wishlistCount,
    },
    claimedKeys
  );

  return {
    user,
    rewards,
    summary: {
      total: rewards.length,
      unlocked: rewards.filter((reward) => reward.unlocked).length,
      claimed: rewards.filter((reward) => reward.claimed).length,
      claimable: rewards.filter((reward) => reward.claimable).length,
    },
  };
}

export async function GET() {
  try {
    const sessionUser = await requireAuth();
    await dbConnect();
    const userId = await resolveUserIdFromSessionUser(sessionUser);
    const state = await loadRewardState(userId);
    return NextResponse.json(state);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    console.error('Error loading rewards:', error);
    return NextResponse.json({ error: 'Error al cargar recompensas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json().catch(() => ({}));
    await dbConnect();

    const userId = await resolveUserIdFromSessionUser(sessionUser);
    const rewardKey = String((body as any).rewardKey || '').trim();
    if (!rewardKey) {
      return NextResponse.json({ error: 'rewardKey requerido' }, { status: 400 });
    }

    const state = await loadRewardState(userId);
    const reward = state.rewards.find((entry) => entry.key === rewardKey);

    if (!reward) {
      return NextResponse.json({ error: 'Recompensa no encontrada' }, { status: 404 });
    }

    if (!reward.claimable) {
      return NextResponse.json({ error: 'La recompensa todavía no se puede reclamar' }, { status: 400 });
    }

    const existingClaim = await RewardClaim.findOne({ userId, rewardKey }).lean();
    if (existingClaim) {
      return NextResponse.json({ error: 'La recompensa ya fue reclamada' }, { status: 409 });
    }

    const nextBalance = Math.max(0, Number((state.user as any).balance || 0)) + Number(reward.balanceAwarded || 0);
    const nextLoyaltyPoints = Math.max(0, Number((state.user as any).loyaltyPoints || 0)) + Number(reward.pointsAwarded || 0);
    const nextLoyaltyLifetimePoints =
      Math.max(0, Number((state.user as any).loyaltyLifetimePoints || 0)) + Number(reward.pointsAwarded || 0);

    await Promise.all([
      RewardClaim.create({
        userId,
        rewardKey: reward.key,
        rewardTitle: reward.titleEs,
        pointsAwarded: reward.pointsAwarded,
        balanceAwarded: reward.balanceAwarded,
      }),
      User.findByIdAndUpdate(userId, {
        $set: {
          balance: nextBalance,
          loyaltyPoints: nextLoyaltyPoints,
          loyaltyLifetimePoints: nextLoyaltyLifetimePoints,
          loyaltyLastEarnedAt: new Date(),
        },
      }),
      Notification.create({
        userId,
        type: 'SUCCESS',
        title: 'Recompensa reclamada',
        message: `Has reclamado ${reward.titleEs}.`,
        href: '/perfil/recompensas',
      }),
      LoyaltyEvent.create({
        userId,
        type: 'ADMIN_SENT',
        points: Number(reward.pointsAwarded || 0),
        amountSpent: Number(reward.balanceAwarded || 0),
        currency: 'EUR',
        description: `Reward claimed: ${reward.titleEn}`,
        meta: {
          rewardKey: reward.key,
          balanceAwarded: reward.balanceAwarded,
        },
      }),
    ]);

    const refreshed = await loadRewardState(userId);
    return NextResponse.json({ ok: true, ...refreshed });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Error claiming reward:', error);
    return NextResponse.json({ error: 'Error al reclamar recompensa' }, { status: 500 });
  }
}