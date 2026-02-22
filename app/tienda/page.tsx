'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaShoppingCart, FaCheck, FaTags } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Card, Button, Badge, Input } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import type { MinecraftAccountSource } from '@/lib/minecraftAccount';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  features: string[];
  image?: string;
}

export default function TiendaPage() {
  const { status } = useSession();
  const [lang, setLang] = useState<Lang>('es');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const changeMinecraftLabel = lang === 'es' ? 'Cambiar' : 'Change';

  const [minecraftUsernameInput, setMinecraftUsernameInput] = useState('');
  const [minecraftResolved, setMinecraftResolved] = useState<null | {
    username: string;
    uuid: string;
    source: MinecraftAccountSource;
  }>(null);
  const [checkingMinecraft, setCheckingMinecraft] = useState(false);
  const [savingMinecraft, setSavingMinecraft] = useState(false);
  const [shopUnlocked, setShopUnlocked] = useState(false);

  useEffect(() => {
    setLang(getClientLangFromCookie());
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

  const uuidForCrafatar = (uuid: string) => String(uuid || '').replace(/-/g, '');

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
        const response = await fetch('/api/products');
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

  const filteredProducts = selectedCategory === 'ALL' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

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

  const linkMinecraftToAccount = async () => {
    if (status !== 'authenticated') return;
    const username = (minecraftResolved?.username || minecraftUsernameInput).trim();
    if (!username) return;

    setSavingMinecraft(true);
    try {
      const res = await fetch('/api/profile/minecraft', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      const linked = {
        username: String((data as any).minecraftUsername || username),
        uuid: String((data as any).minecraftUuid || ''),
        source: 'mojang' as MinecraftAccountSource,
      };
      setMinecraftUsernameInput(linked.username);
      if (linked.uuid) setMinecraftResolved(linked);
      toast.success(t(lang, 'shop.minecraftSaved'));
      setShopUnlocked(true);
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setSavingMinecraft(false);
    }
  };

  const unlinkMinecraftFromAccount = async () => {
    if (status !== 'authenticated') return;
    setSavingMinecraft(true);
    try {
      const res = await fetch('/api/profile/minecraft', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlink: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      setMinecraftResolved(null);
      toast.success(t(lang, 'shop.minecraftUnlinked'));
      setShopUnlocked(false);
      try {
        localStorage.removeItem('shop.minecraft.uuid');
      } catch {
        // ignore
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setSavingMinecraft(false);
    }
  };

  const handlePurchase = async (product: Product) => {
    if (!minecraftResolved?.uuid) {
      toast.error(t(lang, 'shop.minecraftNeedUsername'));
      return;
    }

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id,
          minecraftUsername: minecraftResolved.username,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      toast.success(t(lang, 'shop.orderCreated'));
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    }
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
          <Card hover={false} className="border-white/10 bg-gray-950/25 rounded-2xl p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 bg-gray-950/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white text-xl font-semibold">{t(lang, 'shop.minecraftTitle')}</div>
                  <div className="text-sm text-gray-400 mt-1">{t(lang, 'shop.minecraftDesc')}</div>
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
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl border border-white/10 bg-black/20 overflow-hidden flex items-center justify-center shrink-0">
                        {minecraftResolved?.uuid ? (
                          <img
                            src={`https://crafatar.com/avatars/${uuidForCrafatar(minecraftResolved.uuid)}?size=160&overlay=true`}
                            alt={minecraftResolved.username}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://minotar.net/avatar/${encodeURIComponent(minecraftResolved.username)}/160`;
                            }}
                          />
                        ) : (
                          <FaTags className="text-3xl text-gray-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-400">{t(lang, 'shop.minecraftLabel')}</div>
                        <div className="text-white text-lg font-semibold truncate mt-0.5">
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
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-gray-400 mb-2">{t(lang, 'shop.minecraftLabel')}</div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <Input
                          value={minecraftUsernameInput}
                          onChange={(e) => setMinecraftUsernameInput(e.target.value)}
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
                      <Button
                        disabled={!minecraftResolved?.uuid || checkingMinecraft}
                        onClick={() => setShopUnlocked(Boolean(minecraftResolved?.uuid))}
                        className="whitespace-nowrap"
                      >
                        {t(lang, 'shop.enterShop')}
                      </Button>
                    </div>

                    {status === 'authenticated' && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          disabled={savingMinecraft || !minecraftResolved?.uuid}
                          onClick={linkMinecraftToAccount}
                        >
                          {t(lang, 'shop.minecraftSave')}
                        </Button>
                        <Button variant="danger" disabled={savingMinecraft} onClick={unlinkMinecraftFromAccount}>
                          {t(lang, 'shop.minecraftUnlink')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* Minecraft Account (summary) */}
          <Card hover={false} className="mb-8 border-white/10 bg-gray-950/25 rounded-2xl px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl border border-white/10 bg-black/20 overflow-hidden flex items-center justify-center shrink-0">
                  {minecraftResolved?.uuid ? (
                    <img
                      src={`https://crafatar.com/avatars/${uuidForCrafatar(minecraftResolved.uuid)}?size=80&overlay=true`}
                      alt={minecraftResolved.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://minotar.net/avatar/${encodeURIComponent(minecraftResolved.username)}/80`;
                      }}
                    />
                  ) : (
                    <FaTags className="text-xl text-gray-500" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs text-gray-400">{t(lang, 'shop.minecraftTitle')}</div>
                  <div className="flex items-center gap-2 min-w-0 mt-0.5">
                    <div className="text-white font-semibold truncate">
                      {minecraftResolved?.username || minecraftUsernameInput.trim() || '—'}
                    </div>
                    <Badge variant={minecraftResolved?.uuid ? 'success' : 'warning'}>
                      {minecraftResolved?.uuid ? t(lang, 'shop.minecraftVerified') : t(lang, 'shop.minecraftNeedUsername')}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => setShopUnlocked(false)} className="whitespace-nowrap">
                  {changeMinecraftLabel}
                </Button>
                {status === 'authenticated' ? (
                  <Button variant="danger" disabled={savingMinecraft} onClick={unlinkMinecraftFromAccount} className="whitespace-nowrap">
                    {t(lang, 'shop.minecraftUnlink')}
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                  selectedCategory === category.value
                    ? 'bg-minecraft-grass text-white'
                    : 'bg-gray-900/50 text-gray-300 hover:bg-gray-800'
                }`}
              >
                {category.label}
              </button>
            ))}
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
                      <div className="w-full h-48 bg-gradient-to-br from-minecraft-grass/20 to-minecraft-diamond/20 rounded-md mb-4 flex items-center justify-center">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-32 object-contain" />
                        ) : (
                          <FaTags className="text-6xl text-minecraft-gold" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-grow">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white min-w-0 truncate">{product.name}</h3>
                          <div className="shrink-0">
                            <Badge variant="info">{product.category}</Badge>
                          </div>
                        </div>
                        <p className="text-gray-400 mb-4">{product.description}</p>

                        {/* Features */}
                        {product.features && product.features.length > 0 && (
                          <ul className="space-y-2 mb-4">
                            {product.features.slice(0, 3).map((feature, i) => (
                              <li key={i} className="flex items-start space-x-2 text-sm text-gray-300">
                                <FaCheck className="text-minecraft-grass mt-1 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Price and Buy Button */}
                      <div className="mt-auto pt-4 border-t border-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl font-bold text-minecraft-gold">{formatPrice(product.price)}</span>
                          <Button onClick={() => handlePurchase(product)}>
                            <FaShoppingCart />
                            <span>{t(lang, 'shop.buy')}</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-400 text-lg">{t(lang, 'shop.emptyCategory')}</p>
                </div>
              )}
            </AnimatedSection>
          )}
        </>
      )}
    </div>
  );
}
