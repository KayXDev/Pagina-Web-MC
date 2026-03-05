'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaShoppingCart, FaCheck, FaTags, FaHeart, FaRegHeart } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Card, Button, Badge, Input } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
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
    setWishlist(readLocalWishlist());

    const onWishlistUpdated = () => setWishlist(readLocalWishlist());
    window.addEventListener('shop-wishlist-updated', onWishlistUpdated);
    return () => window.removeEventListener('shop-wishlist-updated', onWishlistUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const byMin = Number.isFinite(min) && priceMin.trim() !== '' ? Number(p.price) >= min : true;
      const byMax = Number.isFinite(max) && priceMax.trim() !== '' ? Number(p.price) <= max : true;
      return byMin && byMax;
    })
    .sort((a, b) => {
      if (priceSort === 'LOW_TO_HIGH') return Number(a.price) - Number(b.price);
      if (priceSort === 'HIGH_TO_LOW') return Number(b.price) - Number(a.price);
      return 0;
    });

  const toggleWishlist = (productId: string) => {
    const id = String(productId || '').trim();
    if (!id) return;

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
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <PageHeader
        title={t(lang, 'shop.title')}
        description={t(lang, 'shop.headerDesc')}
        icon={<FaShoppingCart className="text-6xl text-minecraft-gold" />}
      />

      {/* Gate: Require Minecraft username before showing shop */}
      {!shopUnlocked ? (
        <div className="max-w-3xl mx-auto">
          <Card
            hover={false}
            className="border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-950/25 rounded-2xl p-0 overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-gray-950/30">
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

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                <div className="md:col-span-5">
                  <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20 overflow-hidden flex items-center justify-center shrink-0">
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
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20 p-4">
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
                        className="whitespace-nowrap"
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
          {/* Minecraft Account (summary) */}
          <div className="max-w-5xl mx-auto mb-8 flex justify-center">
            <Card
              hover={false}
              className="border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-950/25 rounded-2xl p-4 w-full max-w-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20 overflow-hidden flex items-center justify-center shrink-0">
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
                    className="whitespace-nowrap"
                  >
                    <span>{signOutLabel}</span>
                  </Button>
                ) : null}
              </div>
            </Card>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-4 mb-12">
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 flex-1">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
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
              className="border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-950/25 rounded-2xl"
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
              <div className="mt-3 flex items-center gap-3">
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
              </div>
            </Card>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shimmer h-96">
                  <div></div>
                </Card>
              ))}
            </div>
          ) : (
            <AnimatedSection>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full flex flex-col">
                      {/* Product Image */}
                      <div className="relative w-full h-48 bg-gradient-to-br from-minecraft-grass/20 to-minecraft-diamond/20 rounded-md mb-4 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleWishlist(product._id)}
                          className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full grid place-items-center bg-white/90 text-gray-700 hover:bg-white border border-gray-200 dark:bg-black/60 dark:text-gray-200 dark:border-white/10 dark:hover:bg-black/80"
                          aria-label={lang === 'es' ? 'Añadir a favoritos' : 'Add to wishlist'}
                        >
                          {wishlist.includes(String(product._id)) ? (
                            <FaHeart className="text-red-500" />
                          ) : (
                            <FaRegHeart />
                          )}
                        </button>
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
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white min-w-0 truncate">{product.name}</h3>
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

                        <p className="text-gray-600 dark:text-gray-400 mb-4">{product.description}</p>

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
                      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl font-bold text-minecraft-gold">{formatPrice(product.price)}</span>
                          <Button
                            onClick={() => addToCart(product._id)}
                            disabled={
                              savingCart ||
                              (product.isUnlimited === false && Number(product.stock ?? 0) <= 0)
                            }
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
