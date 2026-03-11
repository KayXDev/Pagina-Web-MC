'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaShoppingCart, FaCheck, FaTags, FaHeart, FaRegHeart, FaBell, FaBolt, FaBalanceScale, FaClock } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Card, Button, Badge, Input } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { getProductEffectivePrice, getProductOfferCountdown, getProductReferencePrice, isProductOfferActive } from '@/lib/productOffers';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import type { MinecraftAccountSource } from '@/lib/minecraftAccount';

function uuidForCrafatar(uuid: string) {
  return String(uuid || '').replace(/-/g, '');
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  compareAtPrice?: number;
  saleStartsAt?: string;
  saleEndsAt?: string;
  offerLabel?: string;
  bonusBalanceAmount?: number;
  category: string;
  features: string[];
  image?: string;
  isUnlimited?: boolean;
  stock?: number;
}

export default function TiendaPage() {
  const { status } = useSession();
  const lang = useClientLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [priceSort, setPriceSort] = useState<'DEFAULT' | 'LOW_TO_HIGH' | 'HIGH_TO_LOW'>('DEFAULT');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [offerNow, setOfferNow] = useState(() => Date.now());

  const addToCartLabel = lang === 'es' ? 'Añadir' : 'Add';
  const cartErrorLabel = lang === 'es' ? 'Error al guardar el carrito' : 'Failed to save cart';

  const [minecraftUsernameInput, setMinecraftUsernameInput] = useState('');
  const [minecraftResolved, setMinecraftResolved] = useState<null | {
    username: string;
    uuid: string;
    source: MinecraftAccountSource;
  }>(null);
  const [checkingMinecraft, setCheckingMinecraft] = useState(false);
  const [savingMinecraft, setSavingMinecraft] = useState(false);
  const [shopUnlocked, setShopUnlocked] = useState(false);

  const minecraftAvatarPrimary = minecraftResolved?.uuid
    ? `https://crafatar.com/avatars/${uuidForCrafatar(minecraftResolved.uuid)}?size=160&overlay=true`
    : '';
  const minecraftAvatarFallback = minecraftResolved?.username
    ? `https://minotar.net/avatar/${encodeURIComponent(minecraftResolved.username)}/160`
    : '';
  const [minecraftAvatarSrc, setMinecraftAvatarSrc] = useState('');

  useEffect(() => {
    setMinecraftAvatarSrc(minecraftAvatarPrimary);
  }, [minecraftAvatarPrimary]);

  const signOutLabel = lang === 'es' ? 'Salir' : 'Sign out';

  type CartItem = { productId: string; quantity: number };
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [savingCart, setSavingCart] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setOfferNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;

    const matchesMaintenancePath = (paths: string[], currentPath: string) => {
      const cur = (currentPath || '').trim();
      if (!cur.startsWith('/')) return false;

      for (const raw of paths) {
        const p0 = String(raw || '').trim();
        if (!p0) continue;

        const isWildcard = p0.endsWith('*');
        const base = (isWildcard ? p0.slice(0, -1) : p0).replace(/\/+$/, '') || '/';

        if (base === '/') return true;
        if (cur === base) return true;
        if (cur.startsWith(base + '/')) return true;
        if (cur === base + '/') return true;
      }

      return false;
    };

    const check = async () => {
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        const enabled = Boolean((data as any).enabled);
        const paths = Array.isArray((data as any).paths) ? ((data as any).paths as any[]).map((p) => String(p)) : [];
        const pathname = window.location.pathname;

        if (enabled) {
          if (matchesMaintenancePath(paths, pathname) && pathname !== '/mantenimiento') {
            window.location.href = '/mantenimiento';
          }
        }
      } catch {
        // ignore
      }
    };

    // Run once and poll, so toggling maintenance in admin reflects without refresh.
    check();
    const id = window.setInterval(check, 5000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    // Prefill from localStorage first (guests)
    try {
      const cachedUser = localStorage.getItem('shop.minecraft.username');
      const cachedUuid = localStorage.getItem('shop.minecraft.uuid');
      if (cachedUser) setMinecraftUsernameInput(String(cachedUser));
      if (cachedUser && cachedUuid) {
        setMinecraftResolved({
          username: String(cachedUser),
          uuid: String(cachedUuid),
          source: 'mojang',
        });
        setShopUnlocked(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const localCartKey = 'shop.cart.items';
  const localWishlistKey = 'shop.wishlist.items';

  const readLocalWishlist = (): string[] => {
    try {
      const raw = localStorage.getItem(localWishlistKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return Array.from(new Set(parsed.map((id: any) => String(id || '').trim()).filter(Boolean)));
    } catch {
      return [];
    }
  };

  const writeLocalWishlist = (items: string[]) => {
    try {
      localStorage.setItem(localWishlistKey, JSON.stringify(Array.from(new Set(items))));
      window.dispatchEvent(new Event('shop-wishlist-updated'));
    } catch {
      // ignore
    }
  };

  const readLocalCart = (): CartItem[] => {
    try {
      const raw = localStorage.getItem(localCartKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((it: any) => ({ productId: String(it?.productId || ''), quantity: Number(it?.quantity || 0) }))
        .filter((it: CartItem) => Boolean(it.productId) && Number.isFinite(it.quantity) && it.quantity > 0)
        .map((it: CartItem) => ({ ...it, quantity: Math.min(99, Math.max(1, Math.floor(it.quantity))) }));
    } catch {
      return [];
    }
  };

  const writeLocalCart = (items: CartItem[]) => {
    try {
      localStorage.setItem(localCartKey, JSON.stringify(items));
      window.dispatchEvent(new Event('shop-cart-updated'));
    } catch {
      // ignore
    }
  };

  const normalizeCart = (items: CartItem[]): CartItem[] => {
    const map = new Map<string, number>();
    for (const it of items) {
      const id = String(it.productId || '').trim();
      const qty = Math.floor(Number(it.quantity || 0));
      if (!id || !Number.isFinite(qty) || qty <= 0) continue;
      map.set(id, Math.min(99, (map.get(id) || 0) + qty));
    }
    return Array.from(map.entries()).map(([productId, quantity]) => ({ productId, quantity }));
  };

  const loadCart = async () => {
    setLoadingCart(true);
    try {
      if (status === 'authenticated') {
        const local = readLocalCart();
        const res = await fetch('/api/shop/cart', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const serverItems = res.ok && Array.isArray((data as any).items) ? ((data as any).items as CartItem[]) : [];
        const merged = normalizeCart([...(serverItems || []), ...(local || [])]);
        setCartItems(merged);

        // If there was anything locally, migrate to server and clear local
        if (local.length) {
          writeLocalCart([]);
          await fetch('/api/shop/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: merged }),
          }).catch(() => null);
        }
      } else {
        setCartItems(readLocalCart());
      }
    } finally {
      setLoadingCart(false);
    }
  };

  const persistCart = async (items: CartItem[]) => {
    const normalized = normalizeCart(items);
    setCartItems(normalized);

    if (status === 'authenticated') {
      // Avoid stale local cart resurrecting items after server-side updates.
      try {
        localStorage.setItem(localCartKey, JSON.stringify([]));
      } catch {
        // ignore
      }

      setSavingCart(true);
      try {
        const res = await fetch('/api/shop/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: normalized }),
        });
        if (!res.ok) {
          toast.error(cartErrorLabel);
        }
        window.dispatchEvent(new Event('shop-cart-updated'));
      } catch {
        toast.error(cartErrorLabel);
      } finally {
        setSavingCart(false);
      }
    } else {
      writeLocalCart(normalized);
    }
  };

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    // Sync cart across pages/components (e.g., navbar dropdown remove).
    const onCartUpdated = () => loadCart();
    window.addEventListener('shop-cart-updated', onCartUpdated);
    return () => window.removeEventListener('shop-cart-updated', onCartUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    let active = true;

    const loadWishlist = async () => {
      if (status !== 'authenticated') {
        if (!active) return;
        setWishlist(readLocalWishlist());
        return;
      }

      setWishlistLoading(true);
      try {
        const localIds = readLocalWishlist();
        const res = await fetch('/api/shop/wishlist', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const serverItems = res.ok && Array.isArray((data as any).items) ? ((data as any).items as Array<{ productId: string }>) : [];
        const serverIds = serverItems.map((item) => String(item.productId || '').trim()).filter(Boolean);
        const merged = Array.from(new Set([...serverIds, ...localIds]));

        if (!active) return;
        setWishlist(merged);

        if (localIds.length > 0) {
          await fetch('/api/shop/wishlist', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'sync',
              items: merged.map((productId) => ({ productId, alertOnRestock: true, alertOnPriceDrop: true })),
            }),
          }).catch(() => null);
          writeLocalWishlist([]);
        }
      } finally {
        if (active) setWishlistLoading(false);
      }
    };

    void loadWishlist();

    if (status !== 'authenticated') {
      const onWishlistUpdated = () => setWishlist(readLocalWishlist());
      window.addEventListener('shop-wishlist-updated', onWishlistUpdated);
      return () => {
        active = false;
        window.removeEventListener('shop-wishlist-updated', onWishlistUpdated);
      };
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    // If logged in, prefer the account-linked MC user
    const loadLinked = async () => {
      if (status !== 'authenticated') return;
      try {
        const res = await fetch('/api/profile/minecraft', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const username = String((data as any).minecraftUsername || '');
        const uuid = String((data as any).minecraftUuid || '');
        if (username) setMinecraftUsernameInput(username);
        if (username && uuid) {
          setMinecraftResolved({ username, uuid, source: 'mojang' });
          setShopUnlocked(true);
        }
      } catch {
        // ignore
      }
    };
    loadLinked();
  }, [status]);


  const categories = [
    { value: 'ALL', label: t(lang, 'shop.categories.all') },
    { value: 'RANK', label: t(lang, 'shop.categories.rank') },
    { value: 'BUNDLES', label: t(lang, 'shop.categories.bundles') },
    { value: 'CURRENCY', label: t(lang, 'shop.categories.currency') },
    { value: 'KEYS', label: t(lang, 'shop.categories.keys') },
    { value: 'SPECIAL', label: t(lang, 'shop.categories.special') },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        toast.error(t(lang, 'shop.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [lang]);

  const filteredProducts = products
    .filter((p) => (selectedCategory === 'ALL' ? true : p.category === selectedCategory))
    .filter((p) => (wishlistOnly ? wishlist.includes(String(p._id)) : true))
    .filter((p) => {
      const min = Number(priceMin);
      const max = Number(priceMax);
      const currentPrice = getProductEffectivePrice(p, offerNow);
      const byMin = Number.isFinite(min) && priceMin.trim() !== '' ? Number(currentPrice) >= min : true;
      const byMax = Number.isFinite(max) && priceMax.trim() !== '' ? Number(currentPrice) <= max : true;
      return byMin && byMax;
    })
    .sort((a, b) => {
      const priceA = getProductEffectivePrice(a, offerNow);
      const priceB = getProductEffectivePrice(b, offerNow);
      if (priceSort === 'LOW_TO_HIGH') return Number(priceA) - Number(priceB);
      if (priceSort === 'HIGH_TO_LOW') return Number(priceB) - Number(priceA);
      return 0;
    });

  const liveOfferProducts = filteredProducts.filter((product) => isProductOfferActive(product, offerNow));
  const compareProducts = products.filter(
    (product) => compareSelection.includes(String(product._id)) && ['RANK', 'BUNDLES'].includes(String(product.category || '').toUpperCase())
  );

  const toggleCompare = (productId: string) => {
    const id = String(productId || '').trim();
    if (!id) return;
    setCompareSelection((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const formatCountdown = (ms: number | null) => {
    if (ms === null) return '';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const toggleWishlist = async (productId: string) => {
    const id = String(productId || '').trim();
    if (!id) return;

    if (status === 'authenticated') {
      const previous = wishlist;
      const has = previous.includes(id);
      const next = has ? previous.filter((x) => x !== id) : [...previous, id];
      setWishlist(next);
      try {
        const res = await fetch('/api/shop/wishlist', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle', productId: id }),
        });
        if (!res.ok) {
          setWishlist(previous);
        }
      } catch {
        setWishlist(previous);
      }
      return;
    }

    setWishlist((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      writeLocalWishlist(next);
      return next;
    });
  };

  const checkMinecraft = async () => {
    const username = minecraftUsernameInput.trim();
    if (!username) {
      toast.error(t(lang, 'shop.minecraftNeedUsername'));
      return;
    }

    setCheckingMinecraft(true);
    try {
      const res = await fetch(`/api/minecraft/resolve?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      const resolved = {
        username: String((data as any).username || username),
        uuid: String((data as any).uuid || ''),
        source: String((data as any).source || 'mojang') as MinecraftAccountSource,
      };
      if (!resolved.uuid) throw new Error('UUID inválido');

      setMinecraftResolved(resolved);
      try {
        localStorage.setItem('shop.minecraft.username', resolved.username);
        localStorage.setItem('shop.minecraft.uuid', resolved.uuid);
      } catch {
        // ignore
      }
      toast.success(t(lang, 'shop.minecraftVerified'));
      setShopUnlocked(true);
    } catch (err: any) {
      setMinecraftResolved(null);
      toast.error(err?.message || t(lang, 'shop.minecraftNeedUsername'));
      setShopUnlocked(false);
    } finally {
      setCheckingMinecraft(false);
    }
  };

  const addToCart = async (productId: string) => {
    const product = products.find((p) => p._id === productId);
    const isUnlimited = Boolean((product as any)?.isUnlimited);
    const stock = Number((product as any)?.stock);
    const safeStock = Number.isFinite(stock) ? stock : 0;
    if (product && !isUnlimited && safeStock <= 0) {
      toast.error(lang === 'es' ? 'Sin stock disponible' : 'Out of stock');
      return;
    }

    const next = normalizeCart([...cartItems, { productId, quantity: 1 }]);
    await persistCart(next);
  };

  const setQty = async (productId: string, quantity: number) => {
    const q = Math.min(99, Math.max(1, Math.floor(Number(quantity || 1))));
    const next = cartItems.map((it) => (it.productId === productId ? { ...it, quantity: q } : it));
    await persistCart(next);
  };

  const removeFromCart = async (productId: string) => {
    const next = cartItems.filter((it) => it.productId !== productId);
    await persistCart(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <PageHeader
        title={t(lang, 'shop.title')}
        description={t(lang, 'shop.headerDesc')}
        icon={<FaShoppingCart className="text-6xl text-minecraft-gold" />}
      />

      {/* Gate: Require Minecraft username before showing shop */}
      {!shopUnlocked ? (
        <div className="mx-auto max-w-3xl">
          <Card
            hover={false}
            className="overflow-hidden rounded-[30px] border border-gray-200 bg-white/80 p-0 dark:border-white/10 dark:bg-gray-950/25"
          >
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-5 dark:border-white/10 dark:bg-gray-950/30 sm:px-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-gray-900 dark:text-white text-xl font-semibold">{t(lang, 'shop.minecraftTitle')}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t(lang, 'shop.minecraftDesc')}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={minecraftResolved?.uuid ? 'success' : 'warning'}>
                    {minecraftResolved?.uuid ? t(lang, 'shop.minecraftVerified') : t(lang, 'shop.minecraftNeedUsername')}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-5">
                <div className="md:col-span-5">
                  <div className="rounded-[24px] border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20 sm:h-20 sm:w-20">
                        {minecraftResolved?.uuid ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={minecraftAvatarSrc || minecraftAvatarPrimary}
                              alt={minecraftResolved.username}
                              fill
                              sizes="80px"
                              className="object-cover"
                              onError={() => {
                                if (!minecraftAvatarFallback) return;
                                setMinecraftAvatarSrc((cur) => (cur === minecraftAvatarFallback ? cur : minecraftAvatarFallback));
                              }}
                            />
                          </div>
                        ) : (
                          <FaTags className="text-3xl text-gray-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'shop.minecraftLabel')}</div>
                        <div className="text-gray-900 dark:text-white text-lg font-semibold truncate mt-0.5">
                          {minecraftResolved?.username || minecraftUsernameInput.trim() || '—'}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={minecraftResolved?.uuid ? 'success' : 'warning'}>
                            {minecraftResolved?.uuid ? t(lang, 'shop.minecraftVerified') : t(lang, 'shop.minecraftNeedUsername')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">{t(lang, 'shop.minecraftLabel')}</div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <Input
                          value={minecraftUsernameInput}
                          onChange={(e) => {
                            const next = e.target.value;
                            setMinecraftUsernameInput(next);
                            if (minecraftResolved?.username && minecraftResolved.username !== next.trim()) {
                              setMinecraftResolved(null);
                            }
                          }}
                          placeholder={t(lang, 'shop.minecraftPlaceholder')}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        disabled={checkingMinecraft}
                        onClick={checkMinecraft}
                        className="w-full whitespace-nowrap sm:w-auto"
                      >
                        {t(lang, 'shop.minecraftCheck')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="mx-auto mb-10 flex max-w-5xl flex-col items-center gap-4 sm:mb-12">
            {/* Minecraft Account (summary) */}
            <div className="flex justify-center">
              <Card
                hover={false}
                className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white/80 p-4 dark:border-white/10 dark:bg-gray-950/25"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20 sm:h-16 sm:w-16">
                    {minecraftResolved?.uuid ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={minecraftAvatarSrc || minecraftAvatarPrimary}
                          alt={minecraftResolved.username}
                          fill
                          sizes="64px"
                          className="object-cover"
                          onError={() => {
                            if (!minecraftAvatarFallback) return;
                            setMinecraftAvatarSrc((cur) => (cur === minecraftAvatarFallback ? cur : minecraftAvatarFallback));
                          }}
                        />
                      </div>
                    ) : (
                      <FaTags className="text-2xl text-gray-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'shop.minecraftTitle')}</div>
                    <div className="text-gray-900 dark:text-white text-lg font-semibold truncate mt-0.5">
                      {minecraftResolved?.username || minecraftUsernameInput.trim() || '—'}
                    </div>
                    <div className="mt-2">
                      <Badge variant={minecraftResolved?.uuid ? 'success' : 'warning'}>
                        {minecraftResolved?.uuid ? t(lang, 'shop.minecraftVerified') : t(lang, 'shop.minecraftNeedUsername')}
                      </Badge>
                    </div>
                  </div>

                  {minecraftResolved || minecraftUsernameInput.trim() ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setMinecraftResolved(null);
                        setMinecraftUsernameInput('');
                        setShopUnlocked(false);
                        try {
                          localStorage.removeItem('shop.minecraft.username');
                          localStorage.removeItem('shop.minecraft.uuid');
                        } catch {
                          // ignore
                        }
                      }}
                      className="w-full whitespace-nowrap sm:w-auto"
                    >
                      <span>{signOutLabel}</span>
                    </Button>
                  ) : null}
                </div>
              </Card>
            </div>

            {/* Category Filter */}
            <div className="-mx-1 flex w-full max-w-4xl gap-3 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`shrink-0 rounded-full px-5 py-2.5 font-medium transition-all duration-200 ${
                    selectedCategory === category.value
                      ? 'bg-minecraft-grass text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <Card
              hover={false}
              className="w-full max-w-4xl rounded-[28px] border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-950/25"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Input
                  type="number"
                  min="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder={lang === 'es' ? 'Precio minimo' : 'Min price'}
                />
                <Input
                  type="number"
                  min="0"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder={lang === 'es' ? 'Precio maximo' : 'Max price'}
                />
                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value as 'DEFAULT' | 'LOW_TO_HIGH' | 'HIGH_TO_LOW')}
                  className="w-full px-4 py-2.5 bg-white/90 border border-gray-300/80 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-minecraft-diamond/60 focus:border-transparent transition-all duration-200 dark:bg-gray-950/30 dark:border-white/10 dark:text-gray-100"
                >
                  <option value="DEFAULT">{lang === 'es' ? 'Orden por defecto' : 'Default order'}</option>
                  <option value="LOW_TO_HIGH">{lang === 'es' ? 'Precio: menor a mayor' : 'Price: low to high'}</option>
                  <option value="HIGH_TO_LOW">{lang === 'es' ? 'Precio: mayor a menor' : 'Price: high to low'}</option>
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setPriceMin('');
                    setPriceMax('');
                    setPriceSort('DEFAULT');
                    setSelectedCategory('ALL');
                    setWishlistOnly(false);
                  }}
                >
                  <span>{lang === 'es' ? 'Limpiar filtros' : 'Clear filters'}</span>
                </Button>
              </div>
              <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setWishlistOnly((v) => !v)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    wishlistOnly
                      ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-black/20 dark:text-gray-300 dark:hover:bg-white/10'
                  }`}
                >
                  <FaHeart className={wishlistOnly ? 'text-red-500' : 'text-gray-400'} />
                  <span>{lang === 'es' ? 'Solo favoritos' : 'Wishlist only'}</span>
                </button>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {lang === 'es' ? 'Favoritos guardados' : 'Saved wishlist'}: {wishlist.length}
                </div>
                {status === 'authenticated' ? (
                  <Link href="/perfil/recompensas" className="text-xs font-semibold text-minecraft-diamond hover:text-minecraft-diamond/80">
                    {wishlistLoading
                      ? lang === 'es' ? 'Sincronizando wishlist...' : 'Syncing wishlist...'
                      : lang === 'es' ? 'Gestionar alertas en recompensas' : 'Manage alerts in rewards'}
                  </Link>
                ) : null}
              </div>
            </Card>

            {liveOfferProducts.length > 0 ? (
              <Card hover={false} className="w-full max-w-4xl rounded-[28px] border border-minecraft-gold/20 bg-gradient-to-br from-minecraft-gold/10 via-white/70 to-minecraft-diamond/10 dark:border-minecraft-gold/20 dark:bg-gray-950/30">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-minecraft-gold/20 bg-minecraft-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-minecraft-gold">
                      <FaBolt />
                      <span>{lang === 'es' ? 'Ofertas en vivo' : 'Live offers'}</span>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                      {lang === 'es' ? 'Flash sales activas ahora mismo' : 'Flash sales running right now'}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Aprovecha las rebajas temporales antes de que termine el contador.'
                        : 'Take advantage of temporary price drops before the timer ends.'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[24rem]">
                    {liveOfferProducts.slice(0, 2).map((product) => {
                      const effectivePrice = getProductEffectivePrice(product, offerNow);
                      const referencePrice = getProductReferencePrice(product, offerNow);
                      const countdown = getProductOfferCountdown(product, offerNow);
                      return (
                        <div key={product._id} className="rounded-2xl border border-white/50 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
                          <div className="font-semibold text-gray-900 dark:text-white">{product.name}</div>
                          <div className="mt-2 flex items-center gap-2">
                            {referencePrice > effectivePrice ? (
                              <span className="text-sm text-gray-500 line-through dark:text-gray-400">{formatPrice(referencePrice, lang === 'es' ? 'es-ES' : 'en-US')}</span>
                            ) : null}
                            <span className="text-lg font-bold text-minecraft-gold">{formatPrice(effectivePrice, lang === 'es' ? 'es-ES' : 'en-US')}</span>
                          </div>
                          {countdown !== null ? (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">
                              <FaClock />
                              <span>{formatCountdown(countdown)}</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ) : null}

            {compareProducts.length > 0 ? (
              <Card hover={false} className="w-full max-w-4xl rounded-[28px] border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-950/25">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-minecraft-diamond/20 bg-minecraft-diamond/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-minecraft-diamond">
                        <FaBalanceScale />
                        <span>{lang === 'es' ? 'Comparador rápido' : 'Quick compare'}</span>
                      </div>
                      <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                        {lang === 'es' ? 'Comparando ranks y bundles' : 'Comparing ranks and bundles'}
                      </div>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setCompareSelection([])}>
                      <span>{lang === 'es' ? 'Limpiar comparador' : 'Clear compare'}</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {compareProducts.map((product) => {
                      const effectivePrice = getProductEffectivePrice(product, offerNow);
                      const referencePrice = getProductReferencePrice(product, offerNow);
                      return (
                        <div key={product._id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{product.name}</div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{product.category}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleCompare(product._id)}
                              className="rounded-full border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-white dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
                            >
                              {lang === 'es' ? 'Quitar' : 'Remove'}
                            </button>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {referencePrice > effectivePrice ? (
                              <span className="text-sm text-gray-500 line-through dark:text-gray-400">{formatPrice(referencePrice, lang === 'es' ? 'es-ES' : 'en-US')}</span>
                            ) : null}
                            <span className="text-2xl font-bold text-minecraft-gold">{formatPrice(effectivePrice, lang === 'es' ? 'es-ES' : 'en-US')}</span>
                          </div>

                          {Number(product.bonusBalanceAmount || 0) > 0 ? (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
                              <FaBolt />
                              <span>{lang === 'es' ? `Bonus ${formatPrice(Number(product.bonusBalanceAmount || 0), 'es-ES')}` : `Bonus ${formatPrice(Number(product.bonusBalanceAmount || 0), 'en-US')}`}</span>
                            </div>
                          ) : null}

                          <ul className="mt-4 space-y-2">
                            {(product.features || []).slice(0, 6).map((feature, index) => (
                              <li key={`${product._id}-feature-${index}`} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <FaCheck className="mt-1 shrink-0 text-minecraft-grass" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ) : null}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shimmer h-96">
                  <div></div>
                </Card>
              ))}
            </div>
          ) : (
            <AnimatedSection>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full rounded-[30px] flex flex-col overflow-hidden">
                      {/* Product Image */}
                      <div className="relative mb-4 h-48 w-full overflow-hidden rounded-[22px] bg-gradient-to-br from-minecraft-grass/20 to-minecraft-diamond/20 sm:h-52">
                        {isProductOfferActive(product, offerNow) ? (
                          <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/85 px-3 py-1 text-[11px] font-semibold text-white shadow-lg shadow-red-500/20">
                              <FaBolt />
                              <span>{product.offerLabel || (lang === 'es' ? 'Oferta limitada' : 'Limited offer')}</span>
                            </div>
                            {getProductOfferCountdown(product, offerNow) !== null ? (
                              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                                <FaClock />
                                <span>{formatCountdown(getProductOfferCountdown(product, offerNow))}</span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            void toggleWishlist(product._id);
                          }}
                          className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full grid place-items-center bg-white/90 text-gray-700 hover:bg-white border border-gray-200 dark:bg-black/60 dark:text-gray-200 dark:border-white/10 dark:hover:bg-black/80"
                          aria-label={lang === 'es' ? 'Añadir a favoritos' : 'Add to wishlist'}
                        >
                          {wishlist.includes(String(product._id)) ? (
                            <FaHeart className="text-red-500" />
                          ) : (
                            <FaRegHeart />
                          )}
                        </button>
                        {status === 'authenticated' && wishlist.includes(String(product._id)) ? (
                          <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-minecraft-diamond/20 bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm dark:bg-black/55">
                            <FaBell className="text-minecraft-diamond" />
                            <span>{lang === 'es' ? 'Alertas on' : 'Alerts on'}</span>
                          </div>
                        ) : null}
                        {['RANK', 'BUNDLES'].includes(String(product.category || '').toUpperCase()) ? (
                          <button
                            type="button"
                            onClick={() => toggleCompare(product._id)}
                            className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm hover:bg-black/60"
                          >
                            <FaBalanceScale />
                            <span>{compareSelection.includes(String(product._id)) ? (lang === 'es' ? 'En comparador' : 'In compare') : (lang === 'es' ? 'Comparar' : 'Compare')}</span>
                          </button>
                        ) : null}
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-contain p-6"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FaTags className="text-6xl text-minecraft-gold" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-grow">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="min-w-0 truncate text-xl font-bold text-gray-900 dark:text-white">{product.name}</h3>
                          <div className="shrink-0">
                            <Badge variant="info">{product.category}</Badge>
                          </div>
                        </div>

                        {product.isUnlimited === false && (
                          <div className="mb-3">
                            {Number(product.stock ?? 0) > 0 ? (
                              <Badge variant="default">
                                {(lang === 'es' ? 'Stock' : 'Stock') + ': ' + String(product.stock ?? 0)}
                              </Badge>
                            ) : (
                              <Badge variant="danger">{lang === 'es' ? 'Sin stock' : 'Out of stock'}</Badge>
                            )}
                          </div>
                        )}

                        {Number(product.bonusBalanceAmount || 0) > 0 ? (
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                            <FaBolt />
                            <span>
                              {lang === 'es'
                                ? `Bonus de saldo ${formatPrice(Number(product.bonusBalanceAmount || 0), 'es-ES')}`
                                : `Balance bonus ${formatPrice(Number(product.bonusBalanceAmount || 0), 'en-US')}`}
                            </span>
                          </div>
                        ) : null}

                        <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">{product.description}</p>

                        {/* Features */}
                        {product.features && product.features.length > 0 && (
                          <ul className="space-y-2 mb-4">
                            {product.features.slice(0, 3).map((feature, i) => (
                              <li key={i} className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300">
                                <FaCheck className="text-minecraft-grass mt-1 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Price and Buy Button */}
                      <div className="mt-auto border-t border-gray-200 pt-4 dark:border-gray-800">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-col">
                            {getProductReferencePrice(product, offerNow) > getProductEffectivePrice(product, offerNow) ? (
                              <span className="text-sm text-gray-500 line-through dark:text-gray-400">
                                {formatPrice(getProductReferencePrice(product, offerNow), lang === 'es' ? 'es-ES' : 'en-US')}
                              </span>
                            ) : null}
                            <span className="text-3xl font-bold text-minecraft-gold">{formatPrice(getProductEffectivePrice(product, offerNow), lang === 'es' ? 'es-ES' : 'en-US')}</span>
                          </div>
                          <Button
                            onClick={() => addToCart(product._id)}
                            disabled={
                              savingCart ||
                              (product.isUnlimited === false && Number(product.stock ?? 0) <= 0)
                            }
                            className="w-full justify-center sm:w-auto"
                          >
                            <FaShoppingCart />
                            <span>{addToCartLabel}</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-600 dark:text-gray-400 text-lg">{t(lang, 'shop.emptyCategory')}</p>
                </div>
              )}
            </AnimatedSection>
          )}
        </>
      )}
    </div>
  );
}
