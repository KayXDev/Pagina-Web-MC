'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FaAward,
  FaBell,
  FaCheckCircle,
  FaCoins,
  FaGift,
  FaHeart,
  FaMedal,
  FaShoppingCart,
  FaStar,
  FaVoteYea,
} from 'react-icons/fa';

import { Badge, Button, Card } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { formatPrice } from '@/lib/utils';
import { useProfile } from '../_components/profile-context';

type RewardItem = {
  key: string;
  icon: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  rewardLabelEs: string;
  rewardLabelEn: string;
  pointsAwarded: number;
  balanceAwarded: number;
  current: number;
  target: number;
  unlocked: boolean;
  claimed: boolean;
  claimable: boolean;
  progressPercent: number;
};

type RewardsResponse = {
  rewards: RewardItem[];
  summary: {
    total: number;
    unlocked: number;
    claimed: number;
    claimable: number;
  };
};

type WishlistItem = {
  _id: string;
  productId: string;
  alertOnRestock: boolean;
  alertOnPriceDrop: boolean;
  lastKnownPrice: number;
  product: {
    _id: string;
    name: string;
    price: number;
    image?: string;
    isUnlimited?: boolean;
    stock?: number;
    isActive?: boolean;
    category?: string;
  } | null;
};

function RewardIcon({ icon }: { icon: string }) {
  const key = String(icon || '').toUpperCase();
  if (key === 'VOTE') return <FaVoteYea />;
  if (key === 'SHOP') return <FaShoppingCart />;
  if (key === 'HEART') return <FaHeart />;
  if (key === 'STAR') return <FaStar />;
  if (key === 'LIKE') return <FaMedal />;
  if (key === 'PICKAXE') return <FaAward />;
  return <FaGift />;
}

export default function PerfilRecompensasPage() {
  const lang = useClientLang();
  const { status, refresh } = useProfile();
  const [loading, setLoading] = useState(true);
  const [claimingKey, setClaimingKey] = useState('');
  const [rewardsData, setRewardsData] = useState<RewardsResponse | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [updatingAlertProductId, setUpdatingAlertProductId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [rewardsRes, wishlistRes] = await Promise.all([
        fetch('/api/profile/rewards', { cache: 'no-store' }),
        fetch('/api/shop/wishlist', { cache: 'no-store' }),
      ]);

      const rewardsData = await rewardsRes.json().catch(() => ({}));
      const wishlistData = await wishlistRes.json().catch(() => ({}));

      if (rewardsRes.ok) {
        setRewardsData(rewardsData as RewardsResponse);
      } else {
        setRewardsData({
          rewards: [],
          summary: { total: 0, unlocked: 0, claimed: 0, claimable: 0 },
        });
      }

      if (wishlistRes.ok) {
        setWishlistItems(Array.isArray((wishlistData as any).items) ? ((wishlistData as any).items as WishlistItem[]) : []);
      } else {
        setWishlistItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    void load();
  }, [status]);

  const claimReward = async (rewardKey: string) => {
    if (!rewardKey) return;
    setClaimingKey(rewardKey);
    try {
      const res = await fetch('/api/profile/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setRewardsData({
        rewards: Array.isArray((data as any).rewards) ? ((data as any).rewards as RewardItem[]) : [],
        summary: (data as any).summary || { total: 0, unlocked: 0, claimed: 0, claimable: 0 },
      });
      await refresh();
    } finally {
      setClaimingKey('');
    }
  };

  const updateAlerts = async (productId: string, nextRestock: boolean, nextPriceDrop: boolean) => {
    setUpdatingAlertProductId(productId);
    try {
      const res = await fetch('/api/shop/wishlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-alerts',
          productId,
          alertOnRestock: nextRestock,
          alertOnPriceDrop: nextPriceDrop,
        }),
      });
      if (res.ok) {
        setWishlistItems((prev) =>
          prev.map((item) =>
            item.productId === productId
              ? { ...item, alertOnRestock: nextRestock, alertOnPriceDrop: nextPriceDrop }
              : item
          )
        );
      }
    } finally {
      setUpdatingAlertProductId('');
    }
  };

  const summary = rewardsData?.summary || { total: 0, unlocked: 0, claimed: 0, claimable: 0 };
  const rewards = Array.isArray(rewardsData?.rewards) ? rewardsData!.rewards : [];

  const activeAlertsCount = useMemo(
    () => wishlistItems.filter((item) => item.alertOnPriceDrop || item.alertOnRestock).length,
    [wishlistItems]
  );

  return (
    <div className="space-y-4">
      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-gray-900 dark:text-white font-bold">{lang === 'es' ? 'Centro de recompensas' : 'Rewards center'}</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {lang === 'es'
                ? 'Desbloquea hitos, reclama bonuses y gestiona alertas de tu wishlist.'
                : 'Unlock milestones, claim bonuses, and manage your wishlist alerts.'}
            </div>
          </div>
          <Link href="/tienda">
            <Button type="button" variant="secondary" className="gap-2">
              <FaShoppingCart />
              <span>{lang === 'es' ? 'Ir a tienda' : 'Go to shop'}</span>
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.16em] text-gray-500">{lang === 'es' ? 'Desbloqueadas' : 'Unlocked'}</div>
          <div className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{loading ? '...' : summary.unlocked}</div>
        </Card>
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.16em] text-gray-500">{lang === 'es' ? 'Reclamables' : 'Claimable'}</div>
          <div className="mt-2 text-3xl font-black text-minecraft-gold">{loading ? '...' : summary.claimable}</div>
        </Card>
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.16em] text-gray-500">{lang === 'es' ? 'Reclamadas' : 'Claimed'}</div>
          <div className="mt-2 text-3xl font-black text-minecraft-grass">{loading ? '...' : summary.claimed}</div>
        </Card>
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.16em] text-gray-500">{lang === 'es' ? 'Alertas activas' : 'Active alerts'}</div>
          <div className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{loading ? '...' : activeAlertsCount}</div>
        </Card>
      </div>

      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex items-center justify-between gap-3">
          <div className="text-gray-900 dark:text-white font-bold">{lang === 'es' ? 'Logros y hitos' : 'Achievements and milestones'}</div>
          <Badge variant="info">{rewards.length}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rewards.map((reward) => {
            const title = lang === 'es' ? reward.titleEs : reward.titleEn;
            const description = lang === 'es' ? reward.descriptionEs : reward.descriptionEn;
            const rewardLabel = lang === 'es' ? reward.rewardLabelEs : reward.rewardLabelEn;

            return (
              <div key={reward.key} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-minecraft-gold/20 bg-minecraft-gold/10 text-minecraft-gold">
                    <RewardIcon icon={reward.icon} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
                      {reward.claimed ? <Badge variant="success">{lang === 'es' ? 'Reclamada' : 'Claimed'}</Badge> : null}
                      {reward.claimable ? <Badge variant="warning">{lang === 'es' ? 'Lista' : 'Ready'}</Badge> : null}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-200">
                      <FaGift className="text-minecraft-gold" />
                      <span>{rewardLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span>{lang === 'es' ? 'Progreso' : 'Progress'}</span>
                    <span>{reward.current} / {reward.target}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-minecraft-gold to-minecraft-grass" style={{ width: `${reward.progressPercent}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  {reward.claimed ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-600 dark:text-green-400">
                      <FaCheckCircle />
                      <span>{lang === 'es' ? 'Ya reclamada' : 'Already claimed'}</span>
                    </div>
                  ) : reward.claimable ? (
                    <Button type="button" onClick={() => claimReward(reward.key)} disabled={claimingKey === reward.key} className="gap-2">
                      <FaCoins />
                      <span>
                        {claimingKey === reward.key
                          ? lang === 'es' ? 'Reclamando...' : 'Claiming...'
                          : lang === 'es' ? 'Reclamar recompensa' : 'Claim reward'}
                      </span>
                    </Button>
                  ) : (
                    <div className="text-sm text-gray-500">{lang === 'es' ? 'Sigue avanzando para desbloquearla.' : 'Keep progressing to unlock it.'}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-gray-900 dark:text-white font-bold">{lang === 'es' ? 'Wishlist y alertas' : 'Wishlist and alerts'}</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {lang === 'es'
                ? 'Activa avisos por reposición y bajada de precio en tus productos guardados.'
                : 'Enable restock and price-drop alerts for your saved products.'}
            </div>
          </div>
          <Badge variant="info">{wishlistItems.length}</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">{t(lang, 'common.loading')}</div>
          ) : wishlistItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">
              {lang === 'es'
                ? 'Todavía no tienes productos guardados en la wishlist.'
                : 'You do not have any saved wishlist products yet.'}
            </div>
          ) : (
            wishlistItems.map((item) => {
              const product = item.product;
              return (
                <div key={item._id || item.productId} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-gray-900 dark:text-white">{product?.name || item.productId}</div>
                        {product?.category ? <Badge variant="default">{product.category}</Badge> : null}
                        {product && !product.isUnlimited ? (
                          Number(product.stock || 0) > 0 ? <Badge variant="success">{lang === 'es' ? 'En stock' : 'In stock'}</Badge> : <Badge variant="warning">{lang === 'es' ? 'Sin stock' : 'Out of stock'}</Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {product ? formatPrice(Number(product.price || 0), lang === 'es' ? 'es-ES' : 'en-US') : '-'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                      <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-200">
                        <FaBell className="text-minecraft-gold" />
                        <span>{lang === 'es' ? 'Reposición' : 'Restock'}</span>
                        <input
                          type="checkbox"
                          checked={item.alertOnRestock}
                          disabled={updatingAlertProductId === item.productId}
                          onChange={(e) => updateAlerts(item.productId, e.target.checked, item.alertOnPriceDrop)}
                          className="h-4 w-4"
                        />
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-200">
                        <FaCoins className="text-minecraft-grass" />
                        <span>{lang === 'es' ? 'Bajada de precio' : 'Price drop'}</span>
                        <input
                          type="checkbox"
                          checked={item.alertOnPriceDrop}
                          disabled={updatingAlertProductId === item.productId}
                          onChange={(e) => updateAlerts(item.productId, item.alertOnRestock, e.target.checked)}
                          className="h-4 w-4"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}