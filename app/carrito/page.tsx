'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FaMinus, FaPlus, FaShoppingCart, FaTags, FaTrash } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Card, Input } from '@/components/ui';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';

type CartItem = { productId: string; quantity: number };

type Product = {
  _id: string;
  name: string;
  price: number;
  image?: string;
};

export default function CartPage() {
  const { status } = useSession();
  const [lang, setLang] = useState<Lang>('es');

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [savingCart, setSavingCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [minecraftUuid, setMinecraftUuid] = useState('');
  const [checkingMinecraft, setCheckingMinecraft] = useState(false);

  const cartTitle = lang === 'es' ? 'Carrito' : 'Cart';
  const emptyLabel = lang === 'es' ? 'Tu carrito está vacío.' : 'Your cart is empty.';
  const backToShopLabel = lang === 'es' ? 'Volver a la tienda' : 'Back to shop';
  const checkoutLabel = lang === 'es' ? 'Pagar con PayPal' : 'Pay with PayPal';
  const minecraftLabel = lang === 'es' ? 'Cuenta Minecraft (Java)' : 'Minecraft account (Java)';
  const minecraftPlaceholder = lang === 'es' ? 'Tu username de Minecraft' : 'Your Minecraft username';
  const verifyLabel = lang === 'es' ? 'Verificar' : 'Verify';
  const cartErrorLabel = lang === 'es' ? 'Error al guardar el carrito' : 'Failed to save cart';
  const needMinecraftLabel =
    lang === 'es'
      ? 'Introduce y verifica tu username de Minecraft para poder pagar.'
      : 'Enter and verify your Minecraft username to checkout.';

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const localCartKey = 'shop.cart.items';
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

  useEffect(() => {
    // Minecraft username (cached)
    try {
      const cachedUser = localStorage.getItem('shop.minecraft.username');
      const cachedUuid = localStorage.getItem('shop.minecraft.uuid');
      if (cachedUser) setMinecraftUsername(String(cachedUser));
      if (cachedUuid) setMinecraftUuid(String(cachedUuid));
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
        if (username) setMinecraftUsername(username);
        if (uuid) setMinecraftUuid(uuid);
      } catch {
        // ignore
      }
    };
    loadLinked();
  }, [status]);

  const verifyMinecraft = async () => {
    const username = minecraftUsername.trim();
    if (!username) {
      toast.error(needMinecraftLabel);
      return;
    }

    setCheckingMinecraft(true);
    try {
      const res = await fetch(`/api/minecraft/resolve?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      const resolvedUser = String((data as any).username || username);
      const resolvedUuid = String((data as any).uuid || '');
      if (!resolvedUuid) throw new Error(lang === 'es' ? 'UUID inválido' : 'Invalid UUID');

      setMinecraftUsername(resolvedUser);
      setMinecraftUuid(resolvedUuid);
      try {
        localStorage.setItem('shop.minecraft.username', resolvedUser);
        localStorage.setItem('shop.minecraft.uuid', resolvedUuid);
      } catch {
        // ignore
      }

      toast.success(lang === 'es' ? 'Cuenta verificada' : 'Account verified');
    } catch (err: any) {
      setMinecraftUuid('');
      try {
        localStorage.removeItem('shop.minecraft.uuid');
      } catch {
        // ignore
      }
      toast.error(err?.message || needMinecraftLabel);
    } finally {
      setCheckingMinecraft(false);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch('/api/products', { cache: 'no-store' });
        const data = await res.json().catch(() => ([]));
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

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
      setSavingCart(true);
      try {
        const res = await fetch('/api/shop/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: normalized }),
        });
        if (!res.ok) toast.error(cartErrorLabel);
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

  const totalQty = useMemo(() => cartItems.reduce((sum, it) => sum + (it.quantity || 0), 0), [cartItems]);

  const productById = useMemo(() => {
    return new Map<string, Product>(products.map((p) => [String(p._id), p]));
  }, [products]);

  const totalPrice = useMemo(() => {
    return cartItems.reduce((sum, it) => {
      const p = productById.get(String(it.productId));
      const unit = Number(p?.price || 0);
      return sum + unit * Number(it.quantity || 0);
    }, 0);
  }, [cartItems, productById]);

  const setQty = async (productId: string, quantity: number) => {
    const q = Math.min(99, Math.max(1, Math.floor(Number(quantity || 1))));
    const next = cartItems.map((it) => (it.productId === productId ? { ...it, quantity: q } : it));
    await persistCart(next);
  };

  const removeFromCart = async (productId: string) => {
    const next = cartItems.filter((it) => it.productId !== productId);
    await persistCart(next);
  };

  const checkout = async () => {
    const username = minecraftUsername.trim();
    if (!username) {
      toast.error(needMinecraftLabel);
      return;
    }
    if (!cartItems.length) return;

    setCheckingOut(true);
    try {
      const res = await fetch('/api/shop/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minecraftUsername: username, items: cartItems }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      const approvalUrl = String((data as any).approvalUrl || '').trim();
      if (!approvalUrl) throw new Error(lang === 'es' ? 'No se pudo iniciar el pago' : 'Failed to start payment');

      toast.info(lang === 'es' ? 'Redirigiendo a PayPal…' : 'Redirecting to PayPal…');
      window.location.href = approvalUrl;
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <PageHeader
        title={cartTitle}
        description={lang === 'es' ? 'Revisa tu compra y paga cuando estés listo.' : 'Review your purchase and checkout when ready.'}
        icon={<FaShoppingCart className="text-6xl text-minecraft-gold" />}
      />

      <div className="max-w-4xl mx-auto">
        <Card hover={false} className="border-white/10 bg-gray-950/25 rounded-2xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-gray-950/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-semibold">{cartTitle}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {loadingCart || loadingProducts ? (lang === 'es' ? 'Cargando…' : 'Loading…') : lang === 'es' ? 'Productos y cantidades.' : 'Items and quantities.'}
                </div>
              </div>
              <Badge variant={totalQty ? 'info' : 'default'}>{totalQty}</Badge>
            </div>
          </div>

          <div className="p-6">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <div className="text-gray-400">{emptyLabel}</div>
                <Link href="/tienda">
                  <Button variant="secondary">{backToShopLabel}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-1">{minecraftLabel}</div>
                      <Input
                        value={minecraftUsername}
                        onChange={(e) => {
                          setMinecraftUsername(e.target.value);
                          setMinecraftUuid('');
                        }}
                        placeholder={minecraftPlaceholder}
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={minecraftUuid ? 'success' : 'warning'}>
                          {minecraftUuid ? (lang === 'es' ? 'Verificado' : 'Verified') : (lang === 'es' ? 'Sin verificar' : 'Not verified')}
                        </Badge>
                        {!minecraftUuid ? <div className="text-xs text-yellow-400/90">{needMinecraftLabel}</div> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        disabled={checkingMinecraft}
                        onClick={verifyMinecraft}
                        className="whitespace-nowrap"
                      >
                        <span>{verifyLabel}</span>
                      </Button>
                      <Link href="/tienda">
                        <Button variant="secondary" className="whitespace-nowrap">
                          {backToShopLabel}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {cartItems.map((it) => {
                  const p = productById.get(String(it.productId));
                  const name = p?.name || (lang === 'es' ? 'Producto' : 'Product');
                  const unit = Number(p?.price || 0);
                  const line = unit * it.quantity;

                  return (
                    <div
                      key={it.productId}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center overflow-hidden shrink-0">
                          {p?.image ? (
                            // Keep <img> to match existing codebase pattern
                            <img src={p.image} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <FaTags className="text-xl text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-semibold truncate">{name}</div>
                          <div className="text-sm text-gray-400 mt-0.5">{formatPrice(unit)}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={savingCart || checkingOut || it.quantity <= 1}
                          onClick={() => setQty(it.productId, it.quantity - 1)}
                          className="!px-3"
                        >
                          <FaMinus />
                          <span className="sr-only">-</span>
                        </Button>

                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={it.quantity}
                          disabled={savingCart || checkingOut}
                          onChange={(e) => setQty(it.productId, Number(e.target.value))}
                          className="w-20 text-center"
                        />

                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={savingCart || checkingOut || it.quantity >= 99}
                          onClick={() => setQty(it.productId, it.quantity + 1)}
                          className="!px-3"
                        >
                          <FaPlus />
                          <span className="sr-only">+</span>
                        </Button>

                        <div className="text-white font-semibold w-32 text-right">{formatPrice(line)}</div>

                        <Button
                          variant="danger"
                          size="sm"
                          disabled={savingCart || checkingOut}
                          onClick={() => removeFromCart(it.productId)}
                        >
                          <FaTrash />
                          <span>{lang === 'es' ? 'Quitar' : 'Remove'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-gray-400">
                      {lang === 'es' ? 'Total' : 'Total'}:{' '}
                      <span className="text-white font-semibold">{formatPrice(totalPrice)}</span>
                    </div>
                    <Button onClick={checkout} disabled={checkingOut || savingCart} className="whitespace-nowrap">
                      <FaShoppingCart />
                      <span>{checkoutLabel}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
