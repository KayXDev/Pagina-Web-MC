'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import {
  FaArrowRight,
  FaCheckCircle,
  FaCoins,
  FaCreditCard,
  FaGift,
  FaLock,
  FaMinus,
  FaPlus,
  FaShieldAlt,
  FaShoppingCart,
  FaTags,
  FaTrash,
} from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Card, Input } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { formatPrice } from '@/lib/utils';

type CartItem = { productId: string; quantity: number };

type Product = {
  _id: string;
  name: string;
  price: number;
  image?: string;
};

type ProfileLoyalty = {
  loyaltyPoints?: number;
  balance?: number;
};

export default function CartPage() {
  const { status } = useSession();
  const lang = useClientLang();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [savingCart, setSavingCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkingOutStripe, setCheckingOutStripe] = useState(false);
  const [checkingOutBalance, setCheckingOutBalance] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountPreview, setDiscountPreview] = useState<null | {
    subtotal: number;
    totalPrice: number;
    coupon?: { code: string; discountAmount: number } | null;
    referral?: { code: string; discountAmount: number } | null;
    loyalty?: { pointsUsed: number; discountAmount: number; availablePoints?: number; pointsPerCurrencyUnit?: number; maxUsablePoints?: number } | null;
    storeBalance?: { availableBalance: number; appliedBalance: number } | null;
    loyaltyEarned?: { points: number; basedOnTotal: number; pointsPerCurrencyUnit?: number } | null;
    loyaltyConfig?: {
      earningPointsPerCurrencyUnit?: number;
      redemptionPointsPerCurrencyUnit?: number;
      balancePointsPerCurrencyUnit?: number;
    } | null;
  }>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [availableLoyaltyPoints, setAvailableLoyaltyPoints] = useState(0);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [availableStoreBalance, setAvailableStoreBalance] = useState(0);
  const [useStoreBalance, setUseStoreBalance] = useState(false);

  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [minecraftUuid, setMinecraftUuid] = useState('');
  const [checkingMinecraft, setCheckingMinecraft] = useState(false);
  const [giftEnabled, setGiftEnabled] = useState(false);
  const [giftRecipientUsername, setGiftRecipientUsername] = useState('');
  const [giftMessage, setGiftMessage] = useState('');

  const cartTitle = lang === 'es' ? 'Carrito' : 'Cart';
  const emptyLabel = lang === 'es' ? 'Tu carrito está vacío.' : 'Your cart is empty.';
  const backToShopLabel = lang === 'es' ? 'Volver a la tienda' : 'Back to shop';
  const checkoutLabel = lang === 'es' ? 'Pagar con PayPal' : 'Pay with PayPal';
  const stripeCheckoutLabel =
    lang === 'es' ? 'Pagar con tarjeta / Apple Pay' : 'Pay with card / Apple Pay';
  const minecraftLabel = lang === 'es' ? 'Cuenta Minecraft (Java)' : 'Minecraft account (Java)';
  const minecraftPlaceholder = lang === 'es' ? 'Tu username de Minecraft' : 'Your Minecraft username';
  const verifyLabel = lang === 'es' ? 'Verificar' : 'Verify';
  const cartErrorLabel = lang === 'es' ? 'Error al guardar el carrito' : 'Failed to save cart';
  const needMinecraftLabel =
    lang === 'es'
      ? 'Introduce y verifica tu username de Minecraft para poder pagar.'
      : 'Enter and verify your Minecraft username to checkout.';
  const requiresMinecraftVerification = !giftEnabled;
  const giftRecipientLabel = lang === 'es' ? 'Usuario destinatario' : 'Recipient username';
  const giftMessageLabel = lang === 'es' ? 'Mensaje opcional' : 'Optional message';

  const localCartKey = 'shop.cart.items';
  const storeBalancePreferenceKey = 'shop.useStoreBalance';
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

  const loadProfileLoyalty = useCallback(async () => {
    if (status !== 'authenticated') {
      setAvailableLoyaltyPoints(0);
      setAvailableStoreBalance(0);
      setLoyaltyPointsToRedeem(0);
      setUseStoreBalance(false);
      return;
    }

    try {
      const res = await fetch('/api/profile', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const points = Math.max(0, Math.floor(Number((data as ProfileLoyalty)?.loyaltyPoints || 0)));
      const balance = Math.max(0, Number((data as ProfileLoyalty)?.balance || 0));
      setAvailableLoyaltyPoints(points);
      setAvailableStoreBalance(balance);
      setLoyaltyPointsToRedeem((current) => Math.min(current, points));
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      try {
        setUseStoreBalance(window.localStorage.getItem(storeBalancePreferenceKey) === 'true');
      } catch {
        setUseStoreBalance(false);
      }
    }
  }, [status]);

  useEffect(() => {
    void loadProfileLoyalty();
  }, [loadProfileLoyalty]);

  useEffect(() => {
    const syncBalancePreference = () => {
      if (typeof window === 'undefined') return;
      try {
        setUseStoreBalance(window.localStorage.getItem(storeBalancePreferenceKey) === 'true');
      } catch {
        setUseStoreBalance(false);
      }
      void loadProfileLoyalty();
    };

    window.addEventListener('shop-balance-preference-updated', syncBalancePreference);
    window.addEventListener('shop-balance-updated', syncBalancePreference);
    return () => {
      window.removeEventListener('shop-balance-preference-updated', syncBalancePreference);
      window.removeEventListener('shop-balance-updated', syncBalancePreference);
    };
  }, [loadProfileLoyalty]);

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

  const previewSubtotal = discountPreview?.subtotal ?? totalPrice;
  const previewTotal = discountPreview?.totalPrice ?? totalPrice;
  const estimatedLoyaltyEarned = Math.max(0, Math.floor(Number(discountPreview?.loyaltyEarned?.points || 0)));
  const totalSavings = Math.max(0, previewSubtotal - previewTotal);
  const loyaltyRedemptionRate = Math.max(1, Math.floor(Number(discountPreview?.loyalty?.pointsPerCurrencyUnit || 0)) || 100);
  const maxRedeemablePoints = Math.max(
    0,
    Math.min(
      availableLoyaltyPoints,
      Math.floor(Number(discountPreview?.loyalty?.maxUsablePoints || previewTotal * loyaltyRedemptionRate))
    )
  );
  const appliedStoreBalance = Math.max(0, Number(discountPreview?.storeBalance?.appliedBalance || 0));
  const currentAvailableStoreBalance = Math.max(0, Number(discountPreview?.storeBalance?.availableBalance ?? availableStoreBalance));
  const balanceCheckoutRequiredAmount = Math.max(0, previewTotal + appliedStoreBalance);
  const canPayFullyWithBalance = status === 'authenticated' && balanceCheckoutRequiredAmount > 0 && currentAvailableStoreBalance >= balanceCheckoutRequiredAmount;
  const checkoutBlocked = requiresMinecraftVerification ? !minecraftUuid : !giftRecipientUsername.trim();
  const isCheckoutBusy = checkingOut || checkingOutStripe || checkingOutBalance || savingCart;
  const checkoutStatusLabel = giftEnabled
    ? lang === 'es'
      ? 'Pedido regalo'
      : 'Gift order'
    : minecraftUuid
      ? lang === 'es'
        ? 'Cuenta verificada'
        : 'Account verified'
      : lang === 'es'
        ? 'Pendiente de verificar'
        : 'Verification pending';

  const heroMetrics = [
    {
      label: lang === 'es' ? 'Artículos' : 'Items',
      value: String(totalQty),
      tone: 'from-minecraft-gold/16 to-transparent',
    },
    {
      label: lang === 'es' ? 'Total actual' : 'Current total',
      value: formatPrice(previewTotal),
      tone: 'from-minecraft-diamond/16 to-transparent',
    },
    {
      label: lang === 'es' ? 'Ahorro' : 'Savings',
      value: totalSavings > 0 ? formatPrice(totalSavings) : lang === 'es' ? 'Sin ahorro' : 'No savings',
      tone: 'from-minecraft-grass/16 to-transparent',
    },
    {
      label: lang === 'es' ? 'Saldo disponible' : 'Available balance',
      value: status === 'authenticated' ? formatPrice(currentAvailableStoreBalance) : lang === 'es' ? 'Inicia sesión' : 'Sign in',
      tone: 'from-white/10 to-transparent',
    },
  ];

  const cartSteps = [
    {
      title: lang === 'es' ? 'Revisa productos' : 'Review items',
      text: lang === 'es' ? 'Ajusta cantidades y limpia lo que no necesites.' : 'Adjust quantities and remove what you do not need.',
    },
    {
      title: lang === 'es' ? 'Activa ventajas' : 'Apply perks',
      text: lang === 'es' ? 'Usa cupón, puntos loyalty y saldo si te compensa.' : 'Use coupons, loyalty points, and balance when it helps.',
    },
    {
      title: lang === 'es' ? 'Verifica destino' : 'Verify target',
      text: lang === 'es' ? 'Comprueba la cuenta Minecraft o el destinatario del regalo.' : 'Confirm the Minecraft account or gift recipient.',
    },
    {
      title: lang === 'es' ? 'Elige pago' : 'Choose payment',
      text: lang === 'es' ? 'Saldo, tarjeta o PayPal desde un solo panel final.' : 'Balance, card, or PayPal from one final panel.',
    },
  ];

  const paymentOptions = [
    {
      title: lang === 'es' ? 'Saldo del usuario' : 'User balance',
      text: canPayFullyWithBalance
        ? lang === 'es'
          ? 'Disponible para cubrir el pedido completo ahora mismo.'
          : 'Available to cover the full order right now.'
        : lang === 'es'
          ? 'Úsalo como pago total si cubre todo el pedido.'
          : 'Use it as full payment when it covers the whole order.',
      active: currentAvailableStoreBalance > 0,
    },
    {
      title: lang === 'es' ? 'Tarjeta / Apple Pay' : 'Card / Apple Pay',
      text: lang === 'es' ? 'Checkout rápido para cerrar la compra al instante.' : 'Fast checkout to close the purchase right away.',
      active: true,
    },
    {
      title: 'PayPal',
      text: lang === 'es' ? 'Método clásico si prefieres aprobar el pago fuera.' : 'Classic option if you prefer approving payment off-site.',
      active: true,
    },
  ];

  useEffect(() => {
    const run = async () => {
      if (!cartItems.length) {
        setDiscountPreview(null);
        return;
      }

      if (!couponCode.trim()) {
        if (!loyaltyPointsToRedeem && !useStoreBalance && status !== 'authenticated') {
          setDiscountPreview({ subtotal: totalPrice, totalPrice });
          return;
        }
      }

      setDiscountLoading(true);
      try {
        const res = await fetch('/api/shop/discounts/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems,
            couponCode: couponCode.trim(),
            loyaltyPointsToRedeem,
            useBalance: useStoreBalance,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any).error || 'Error');

        setDiscountPreview({
          subtotal: Number((data as any).subtotal || totalPrice),
          totalPrice: Number((data as any).totalPrice || totalPrice),
          coupon: (data as any).coupon || null,
          referral: (data as any).referral || null,
          loyalty: (data as any).loyalty || null,
          storeBalance: (data as any).storeBalance || null,
          loyaltyEarned: (data as any).loyaltyEarned || null,
          loyaltyConfig: (data as any).loyaltyConfig || null,
        });
      } catch {
        setDiscountPreview({ subtotal: totalPrice, totalPrice });
      } finally {
        setDiscountLoading(false);
      }
    };
    run();
  }, [cartItems, couponCode, totalPrice, loyaltyPointsToRedeem, useStoreBalance, availableStoreBalance, status]);

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
    if (giftEnabled && status !== 'authenticated') {
      toast.error(lang === 'es' ? 'Debes iniciar sesión para enviar regalos.' : 'You must be signed in to send gifts.');
      return;
    }
    if (giftEnabled && !giftRecipientUsername.trim()) {
      toast.error(lang === 'es' ? 'Indica el usuario que recibirá el regalo.' : 'Enter the username that will receive the gift.');
      return;
    }
    if (requiresMinecraftVerification && !username) {
      toast.error(needMinecraftLabel);
      return;
    }
    if (!cartItems.length) return;

    setCheckingOut(true);
    try {
      const res = await fetch('/api/shop/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minecraftUsername: username,
          items: cartItems,
          couponCode: couponCode.trim(),
          loyaltyPointsToRedeem,
            useBalance: useStoreBalance,
          gift: giftEnabled
            ? {
                recipientUsername: giftRecipientUsername.trim(),
                message: giftMessage.trim(),
              }
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      if ((data as any).free) {
        // Clear cart (both guest + authenticated)
        try {
          localStorage.setItem('shop.cart.items', JSON.stringify([]));
          window.dispatchEvent(new Event('shop-cart-updated'));
        } catch {
          // ignore
        }
        await fetch('/api/shop/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [] }),
        }).catch(() => null);

        setCartItems([]);
        toast.success(lang === 'es' ? 'Pedido confirmado (0€)' : 'Order confirmed (€0)');
        return;
      }

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

  const checkoutStripeSession = async () => {
    const username = minecraftUsername.trim();
    if (giftEnabled && status !== 'authenticated') {
      toast.error(lang === 'es' ? 'Debes iniciar sesión para enviar regalos.' : 'You must be signed in to send gifts.');
      return;
    }
    if (giftEnabled && !giftRecipientUsername.trim()) {
      toast.error(lang === 'es' ? 'Indica el usuario que recibirá el regalo.' : 'Enter the username that will receive the gift.');
      return;
    }
    if (requiresMinecraftVerification && !username) {
      toast.error(needMinecraftLabel);
      return;
    }
    if (!cartItems.length) return;

    setCheckingOutStripe(true);
    try {
      const res = await fetch('/api/shop/stripe/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minecraftUsername: username,
          items: cartItems,
          couponCode: couponCode.trim(),
          loyaltyPointsToRedeem,
            useBalance: useStoreBalance,
          gift: giftEnabled
            ? {
                recipientUsername: giftRecipientUsername.trim(),
                message: giftMessage.trim(),
              }
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      if ((data as any).free) {
        // Clear cart (both guest + authenticated)
        try {
          localStorage.setItem('shop.cart.items', JSON.stringify([]));
          window.dispatchEvent(new Event('shop-cart-updated'));
        } catch {
          // ignore
        }
        await fetch('/api/shop/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [] }),
        }).catch(() => null);

        setCartItems([]);
        toast.success(lang === 'es' ? 'Pedido confirmado (0€)' : 'Order confirmed (€0)');
        return;
      }

      const url = String((data as any).url || '').trim();
      if (!url) throw new Error(lang === 'es' ? 'No se pudo iniciar el pago' : 'Failed to start payment');

      toast.info(lang === 'es' ? 'Redirigiendo a Stripe…' : 'Redirecting to Stripe…');
      window.location.href = url;
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setCheckingOutStripe(false);
    }
  };

  const checkoutWithBalance = async () => {
    const username = minecraftUsername.trim();
    if (status !== 'authenticated') {
      toast.error(lang === 'es' ? 'Debes iniciar sesión para pagar con saldo.' : 'You must be signed in to pay with balance.');
      return;
    }
    if (giftEnabled && !giftRecipientUsername.trim()) {
      toast.error(lang === 'es' ? 'Indica el usuario que recibirá el regalo.' : 'Enter the username that will receive the gift.');
      return;
    }
    if (requiresMinecraftVerification && !username) {
      toast.error(needMinecraftLabel);
      return;
    }
    if (!cartItems.length) return;
    if (!canPayFullyWithBalance) {
      toast.error(lang === 'es' ? 'Tu saldo no cubre el pedido completo.' : 'Your balance does not cover the full order.');
      return;
    }

    setCheckingOutBalance(true);
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minecraftUsername: username,
          items: cartItems,
          couponCode: couponCode.trim(),
          loyaltyPointsToRedeem,
          payWithBalance: true,
          gift: giftEnabled
            ? {
                recipientUsername: giftRecipientUsername.trim(),
                message: giftMessage.trim(),
              }
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      try {
        localStorage.setItem('shop.cart.items', JSON.stringify([]));
        window.dispatchEvent(new Event('shop-cart-updated'));
        window.dispatchEvent(new CustomEvent('shop-balance-updated', { detail: data }));
      } catch {
        // ignore
      }

      await fetch('/api/shop/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      }).catch(() => null);

      setCartItems([]);
      await loadProfileLoyalty();
      toast.success(lang === 'es' ? 'Pedido pagado con tu saldo.' : 'Order paid with your balance.');
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setCheckingOutBalance(false);
    }
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(234,179,8,0.16),transparent_36%)]" />

      <PageHeader
        title={cartTitle}
        description={lang === 'es' ? 'Organiza tu pedido, aplica ventajas y entra al checkout con todo claro.' : 'Organize your order, apply perks, and head into checkout with everything clear.'}
        icon={<FaShoppingCart className="text-6xl text-minecraft-gold" />}
      />

      <div className="mt-8 grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(234,179,8,0.14),rgba(2,6,23,0.24)_34%,rgba(6,182,212,0.1)_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_30%),linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)]" />
          <div className="relative">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-minecraft-gold/20 bg-minecraft-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-minecraft-gold">
                  <FaShoppingCart />
                  <span>{lang === 'es' ? 'Zona de checkout' : 'Checkout zone'}</span>
                </div>
                <div className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                  {lang === 'es' ? 'Haz que el pedido se sienta premium antes de pagar.' : 'Make the order feel premium before you pay.'}
                </div>
                <div className="mt-3 max-w-2xl text-sm leading-6 text-gray-200 sm:text-[15px]">
                  {status === 'authenticated' && estimatedLoyaltyEarned > 0
                    ? lang === 'es'
                      ? `Con este pedido ganarás aproximadamente ${estimatedLoyaltyEarned} puntos loyalty, y además puedes combinar descuento, saldo y verificación sin salir de la misma pantalla.`
                      : `This order will earn you approximately ${estimatedLoyaltyEarned} loyalty points, and you can combine discounts, balance, and verification without leaving the same screen.`
                    : totalSavings > 0
                      ? lang === 'es'
                        ? `Ya tienes ${formatPrice(totalSavings)} de ahorro aplicado. Ahora el flujo se centra en revisar, verificar y cerrar la compra sin ruido.`
                        : `You already have ${formatPrice(totalSavings)} in savings applied. The flow now focuses on reviewing, verifying, and finishing the purchase without noise.`
                      : lang === 'es'
                        ? 'El carrito ahora separa mejor productos, ventajas y pago para que la compra sea más clara, más visual y bastante más cómoda.'
                        : 'The cart now separates items, perks, and payment more clearly so the purchase feels cleaner, more visual, and much more comfortable.'}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/tienda">
                    <Button className="rounded-2xl px-5">
                      <span>{lang === 'es' ? 'Seguir comprando' : 'Keep shopping'}</span>
                      <FaArrowRight />
                    </Button>
                  </Link>
                  {status === 'authenticated' ? (
                    <Link href="/perfil">
                      <Button variant="secondary" className="rounded-2xl px-5">
                        <span>{lang === 'es' ? 'Ir a mi perfil' : 'Go to my profile'}</span>
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-sm lg:max-w-[280px]">
                <div className="text-[11px] uppercase tracking-[0.24em] text-gray-500">{lang === 'es' ? 'Estado del pedido' : 'Order state'}</div>
                <div className="mt-3 flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-minecraft-gold">
                    <FaCheckCircle className={giftEnabled || minecraftUuid ? 'text-minecraft-grass' : 'text-minecraft-gold'} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-white">{checkoutStatusLabel}</div>
                    <div className="mt-1 text-sm text-gray-300">
                      {giftEnabled
                        ? lang === 'es'
                          ? 'Estás preparando un regalo, así que el destino del pedido manda.'
                          : 'You are preparing a gift, so the order target takes priority.'
                        : minecraftUuid
                          ? lang === 'es'
                            ? 'La cuenta Minecraft ya está validada para continuar.'
                            : 'The Minecraft account is already validated to continue.'
                          : lang === 'es'
                            ? 'Solo te falta validar la cuenta Minecraft antes del pago.'
                            : 'You only need to validate the Minecraft account before payment.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {heroMetrics.map((metric) => (
            <div key={metric.label} className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/25 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.tone}`} />
              <div className="relative">
                <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{metric.label}</div>
                <div className="mt-3 text-2xl font-black text-white">{metric.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cartSteps.map((step, index) => (
          <div key={step.title} className="rounded-[26px] border border-white/10 bg-gray-950/30 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="text-[11px] uppercase tracking-[0.24em] text-minecraft-gold/80">0{index + 1}</div>
            <div className="mt-2 text-lg font-bold text-white">{step.title}</div>
            <div className="mt-2 text-sm leading-6 text-gray-300">{step.text}</div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        {cartItems.length === 0 ? (
          <Card hover={false} className="relative rounded-[32px] border-white/10 bg-gray-950/25 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_40%)]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-3xl border border-white/10 bg-white/5 grid place-items-center text-minecraft-gold text-xl shrink-0">
                  <FaShoppingCart />
                </div>
                <div>
                  <div className="text-white font-semibold text-2xl">{emptyLabel}</div>
                  <div className="text-gray-300 text-sm mt-2 max-w-xl">
                    {lang === 'es'
                      ? 'Cuando añadas artículos aquí, verás el pedido separado por bloques: productos, ventajas, verificación de Minecraft y checkout.'
                      : 'Once you add items here, the order will be split into clearer blocks for products, perks, Minecraft verification, and checkout.'}
                  </div>
                </div>
              </div>
              <Link href="/tienda">
                <Button variant="secondary" className="whitespace-nowrap rounded-2xl px-5">
                  <span>{backToShopLabel}</span>
                  <FaArrowRight />
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <Card hover={false} className="rounded-[32px] border-white/10 bg-gray-950/25 overflow-hidden">
                <div className="border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent p-6 sm:p-7">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.28em] text-minecraft-gold/80">{lang === 'es' ? 'Inventario del pedido' : 'Order inventory'}</div>
                      <div className="mt-2 text-white font-black text-2xl">{lang === 'es' ? 'Tus productos' : 'Your items'}</div>
                      <div className="mt-2 text-sm text-gray-300 max-w-2xl">
                        {loadingCart || loadingProducts
                          ? lang === 'es'
                            ? 'Cargando tus líneas del pedido…'
                            : 'Loading your order lines...'
                          : savingCart
                            ? lang === 'es'
                              ? 'Guardando cambios en tiempo real…'
                              : 'Saving changes in real time...'
                            : lang === 'es'
                              ? 'Ajusta cantidades aquí y deja promociones y canje en el siguiente bloque.'
                              : 'Adjust quantities here, then handle promotions and redemption in the next block.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-0 xl:max-w-[360px]">
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{lang === 'es' ? 'Líneas' : 'Lines'}</div>
                        <div className="mt-1 text-white text-xl font-black">{cartItems.length}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{lang === 'es' ? 'Artículos' : 'Items'}</div>
                        <div className="mt-1 text-white text-xl font-black">{totalQty}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{lang === 'es' ? 'Base' : 'Base'}</div>
                        <div className="mt-1 text-white text-xl font-black">{formatPrice(totalPrice)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 pt-5 pb-6 sm:px-7">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant={totalSavings > 0 ? 'success' : 'default'}>
                      {totalSavings > 0
                        ? `${lang === 'es' ? 'Ahorro' : 'Savings'} ${formatPrice(totalSavings)}`
                        : lang === 'es'
                          ? 'Sin ahorro'
                          : 'No savings'}
                    </Badge>
                    <Link href="/tienda">
                      <Button variant="secondary" size="sm" className="whitespace-nowrap rounded-2xl">
                        {backToShopLabel}
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {cartItems.map((it) => {
                      const p = productById.get(String(it.productId));
                      const name = p?.name || (lang === 'es' ? 'Producto' : 'Product');
                      const unit = Number(p?.price || 0);
                      const line = unit * it.quantity;

                      return (
                        <Card key={it.productId} hover={false} className="rounded-[24px] border-white/10 bg-white/[0.04] p-0 overflow-hidden">
                          <div className="p-4 sm:p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex min-w-0 flex-1 items-start gap-4">
                                <div className="w-14 h-14 rounded-[18px] border border-white/10 bg-black/25 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                  {p?.image ? (
                                    <div className="relative w-full h-full">
                                      <Image
                                        src={p.image}
                                        alt={name}
                                        fill
                                        sizes="56px"
                                        className="object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <FaTags className="text-xl text-gray-500" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="text-white font-bold text-base sm:text-lg truncate">{name}</div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                    <span className="text-gray-400">
                                      {lang === 'es' ? 'Precio unitario' : 'Unit price'} <span className="font-semibold text-gray-100">{formatPrice(unit)}</span>
                                    </span>
                                    <span className="text-minecraft-gold font-semibold">
                                      {lang === 'es' ? 'Subtotal' : 'Line total'} {formatPrice(line)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                                <div className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-black/20 p-2 self-start sm:self-center">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={savingCart || checkingOut || checkingOutStripe || it.quantity <= 1}
                                    onClick={() => setQty(it.productId, it.quantity - 1)}
                                    className="!px-3 rounded-xl"
                                  >
                                    <FaMinus />
                                    <span className="sr-only">-</span>
                                  </Button>

                                  <Input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={it.quantity}
                                    disabled={savingCart || checkingOut || checkingOutStripe}
                                    onChange={(e) => setQty(it.productId, Number(e.target.value))}
                                    className="w-16 text-center !px-2 !py-2 rounded-xl"
                                  />

                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={savingCart || checkingOut || checkingOutStripe || it.quantity >= 99}
                                    onClick={() => setQty(it.productId, it.quantity + 1)}
                                    className="!px-3 rounded-xl"
                                  >
                                    <FaPlus />
                                    <span className="sr-only">+</span>
                                  </Button>
                                </div>

                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={savingCart || checkingOut || checkingOutStripe}
                                  onClick={() => removeFromCart(it.productId)}
                                  className="whitespace-nowrap rounded-xl"
                                >
                                  <FaTrash />
                                  <span>{lang === 'es' ? 'Quitar' : 'Remove'}</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card hover={false} className="rounded-[32px] border-white/10 bg-gray-950/25 overflow-hidden">
                <div className="border-b border-white/10 bg-gradient-to-r from-minecraft-gold/10 to-transparent p-6 sm:p-7">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-minecraft-gold/80">{lang === 'es' ? 'Descuentos y loyalty' : 'Discounts and loyalty'}</div>
                      <div className="mt-2 text-white font-black text-2xl">{lang === 'es' ? 'Promociones del pedido' : 'Order perks'}</div>
                      <div className="mt-2 text-sm text-gray-300">
                        {lang === 'es'
                          ? 'Aquí va todo lo que afecta al precio: cupón, canje y los puntos que ganarás.'
                          : 'Everything that affects pricing lives here: coupon, redemption, and points earned.'}
                      </div>
                    </div>
                    <Badge variant={totalSavings > 0 ? 'success' : 'default'}>
                      {totalSavings > 0
                        ? `${lang === 'es' ? 'Ahorro' : 'Savings'} ${formatPrice(totalSavings)}`
                        : lang === 'es'
                          ? 'Sin descuentos aún'
                          : 'No discounts yet'}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 p-6 sm:p-7 xl:grid-cols-[0.95fr,1.05fr]">
                  <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-500">{lang === 'es' ? 'Cupón de descuento' : 'Discount coupon'}</div>
                        <div className="mt-2 text-sm text-gray-300">
                          {lang === 'es'
                            ? 'Aplícalo justo antes de pagar, como en un checkout clásico.'
                            : 'Apply it right before paying, like a standard checkout flow.'}
                        </div>
                      </div>
                      <FaTags className="text-minecraft-gold" />
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder={lang === 'es' ? 'Ej: WELCOME10' : 'e.g. WELCOME10'}
                        className="flex-1"
                      />
                    </div>

                    <div className="mt-3 text-xs text-gray-400">
                      {discountPreview?.coupon?.discountAmount
                        ? lang === 'es'
                          ? `Cupón activo: ${discountPreview.coupon.code} aplicado al pedido.`
                          : `Active coupon: ${discountPreview.coupon.code} applied to this order.`
                        : lang === 'es'
                          ? 'Si el código es válido, el descuento se reflejará automáticamente en el resumen.'
                          : 'If the code is valid, the discount will appear automatically in the summary.'}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-500">{lang === 'es' ? 'Canjear puntos loyalty' : 'Redeem loyalty points'}</div>
                        <div className="mt-2 text-sm text-gray-300">
                          {lang === 'es'
                            ? 'Usa tus puntos aquí y mira al momento cuánto ahorrarás y cuánto volverás a ganar.'
                            : 'Use your points here and instantly see how much you save and earn back.'}
                        </div>
                      </div>
                      <Badge variant={availableLoyaltyPoints > 0 ? 'info' : 'default'}>
                        {availableLoyaltyPoints} pts
                      </Badge>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={availableLoyaltyPoints}
                      step={1}
                      value={loyaltyPointsToRedeem}
                      onChange={(e) => {
                        const next = Math.max(0, Math.min(availableLoyaltyPoints, Math.floor(Number(e.target.value || 0))));
                        setLoyaltyPointsToRedeem(Number.isFinite(next) ? next : 0);
                      }}
                      disabled={status !== 'authenticated' || availableLoyaltyPoints <= 0}
                      placeholder={lang === 'es' ? 'Puntos a usar' : 'Points to use'}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setLoyaltyPointsToRedeem(maxRedeemablePoints)}
                        disabled={status !== 'authenticated' || availableLoyaltyPoints <= 0}
                        className="rounded-xl"
                      >
                        {lang === 'es' ? 'Usar máximo aplicable' : 'Use max allowed'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setLoyaltyPointsToRedeem(0)}
                        disabled={loyaltyPointsToRedeem <= 0}
                        className="rounded-xl"
                      >
                        {lang === 'es' ? 'Quitar' : 'Clear'}
                      </Button>
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      {status !== 'authenticated'
                        ? lang === 'es'
                          ? 'Inicia sesión para canjear puntos.'
                          : 'Sign in to redeem points.'
                        : lang === 'es'
                          ? 'Los puntos solo se descuentan si el pedido termina correctamente.'
                          : 'Points are only deducted if the order completes successfully.'}
                    </div>
                    <div className="mt-2 text-xs text-minecraft-gold/90">
                      {lang === 'es'
                        ? `Ahora el canje usa ${loyaltyRedemptionRate} puntos por 1€. En este pedido puedes aprovechar hasta ${maxRedeemablePoints} puntos.`
                        : `Redemption now uses ${loyaltyRedemptionRate} points per €1. This order can use up to ${maxRedeemablePoints} points effectively.`}
                    </div>
                    <div className="mt-3 rounded-2xl border border-minecraft-diamond/15 bg-minecraft-diamond/10 px-4 py-3 text-sm text-gray-100">
                      {status !== 'authenticated'
                        ? lang === 'es'
                          ? 'Si inicias sesión antes de pagar, también podrás recibir puntos loyalty por esta compra.'
                          : 'If you sign in before paying, you can also receive loyalty points for this purchase.'
                        : lang === 'es'
                          ? `Con el total actual ganarás aproximadamente ${estimatedLoyaltyEarned} puntos loyalty.`
                          : `With the current total, you will earn approximately ${estimatedLoyaltyEarned} loyalty points.`}
                    </div>
                  </div>

                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 lg:sticky lg:top-24 self-start space-y-4">
              <Card hover={false} className="rounded-[32px] border-white/10 bg-gray-950/25 overflow-hidden">
                <div className="border-b border-white/10 bg-gradient-to-r from-minecraft-diamond/15 to-transparent p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-minecraft-diamond/80">{lang === 'es' ? 'Finalizar compra' : 'Finish checkout'}</div>
                      <div className="mt-2 text-white font-black text-2xl">{lang === 'es' ? 'Resumen' : 'Summary'}</div>
                      <div className="mt-2 text-sm text-gray-300">
                        {lang === 'es' ? 'Aquí solo queda lo necesario para completar el pago.' : 'Only the essentials remain here to complete checkout.'}
                      </div>
                    </div>
                    <Badge variant={totalQty ? 'info' : 'default'}>{totalQty}</Badge>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{lang === 'es' ? 'Estado' : 'Status'}</div>
                      <div className="mt-1 text-white font-bold">{checkoutStatusLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{lang === 'es' ? 'Total' : 'Total'}</div>
                      <div className="mt-1 text-white font-bold">{formatPrice(previewTotal)}</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-500">{lang === 'es' ? 'Compra regalo' : 'Gift purchase'}</div>
                        <div className="mt-2 text-sm text-gray-300">
                          {lang === 'es'
                            ? 'Entrega el pedido a otro usuario con cuenta Minecraft vinculada.'
                            : 'Deliver this order to another user with a linked Minecraft account.'}
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-200">
                        <input
                          type="checkbox"
                          checked={giftEnabled}
                          onChange={(e) => setGiftEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-black/30"
                        />
                        <span className="inline-flex items-center gap-2">
                          <FaGift className="text-minecraft-gold" />
                          {lang === 'es' ? 'Activar' : 'Enable'}
                        </span>
                      </label>
                    </div>

                    {giftEnabled ? (
                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <Input
                          value={giftRecipientUsername}
                          onChange={(e) => setGiftRecipientUsername(e.target.value)}
                          placeholder={giftRecipientLabel}
                        />
                        <Input
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value.slice(0, 240))}
                          placeholder={giftMessageLabel}
                        />
                        <div className="text-xs text-gray-400">
                          {status !== 'authenticated'
                            ? lang === 'es'
                              ? 'Necesitas iniciar sesión para enviar regalos.'
                              : 'You need to sign in to send gifts.'
                            : lang === 'es'
                              ? 'El destinatario debe existir y tener su cuenta Minecraft enlazada.'
                              : 'The recipient must exist and have a linked Minecraft account.'}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-500">{minecraftLabel}</div>
                      <Badge variant={minecraftUuid ? 'success' : 'warning'}>
                        {!requiresMinecraftVerification
                          ? lang === 'es'
                            ? 'No requerido'
                            : 'Not required'
                          : minecraftUuid
                            ? lang === 'es'
                              ? 'Verificado'
                              : 'Verified'
                            : lang === 'es'
                              ? 'Sin verificar'
                              : 'Not verified'}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <Input
                        value={minecraftUsername}
                        onChange={(e) => {
                          setMinecraftUsername(e.target.value);
                          setMinecraftUuid('');
                        }}
                        placeholder={minecraftPlaceholder}
                        disabled={!requiresMinecraftVerification}
                      />

                      <Button
                        variant="secondary"
                        disabled={checkingMinecraft || !requiresMinecraftVerification}
                        onClick={verifyMinecraft}
                        className="w-full rounded-2xl"
                      >
                        <span>{verifyLabel}</span>
                      </Button>
                    </div>

                    {requiresMinecraftVerification && !minecraftUuid ? <div className="mt-2 text-xs text-yellow-400/90">{needMinecraftLabel}</div> : null}
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-500 mb-3">{lang === 'es' ? 'Desglose final' : 'Final breakdown'}</div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="text-gray-400">{lang === 'es' ? 'Subtotal' : 'Subtotal'}</div>
                      <div className="text-gray-200">{formatPrice(previewSubtotal)}</div>
                    </div>

                    {discountPreview?.coupon?.discountAmount ? (
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="text-gray-400">{lang === 'es' ? 'Cupón' : 'Coupon'} ({discountPreview.coupon.code})</div>
                        <div className="text-minecraft-grass">- {formatPrice(discountPreview.coupon.discountAmount)}</div>
                      </div>
                    ) : null}

                    {discountPreview?.referral?.discountAmount ? (
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="text-gray-400">{lang === 'es' ? 'Referido' : 'Referral'} ({discountPreview.referral.code})</div>
                        <div className="text-minecraft-grass">- {formatPrice(discountPreview.referral.discountAmount)}</div>
                      </div>
                    ) : null}

                    {discountPreview?.loyalty?.discountAmount ? (
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="text-gray-400">Loyalty ({discountPreview.loyalty.pointsUsed} pts)</div>
                        <div className="text-minecraft-gold">- {formatPrice(discountPreview.loyalty.discountAmount)}</div>
                      </div>
                    ) : null}

                    {appliedStoreBalance > 0 ? (
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="text-gray-400">{lang === 'es' ? 'Saldo tienda' : 'Store balance'}</div>
                        <div className="text-minecraft-diamond">- {formatPrice(appliedStoreBalance)}</div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-400">{lang === 'es' ? 'Total' : 'Total'}</div>
                      <div className="text-white font-bold text-lg">{formatPrice(previewTotal)}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm mt-1">
                      <div className="text-gray-400">{lang === 'es' ? 'Puntos loyalty que ganarás' : 'Loyalty points you will earn'}</div>
                      <div className="text-minecraft-diamond font-semibold">{status === 'authenticated' ? `${estimatedLoyaltyEarned} pts` : '-'}</div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-minecraft-grass/15 bg-minecraft-grass/10 px-4 py-3 text-sm text-gray-100 flex items-start gap-3">
                      <FaShieldAlt className="mt-0.5 text-minecraft-grass shrink-0" />
                      <span>
                        {lang === 'es'
                          ? 'Los descuentos se previsualizan ahora, y tanto el canje loyalty como el saldo tienda solo se confirman cuando el pedido termina correctamente.'
                          : 'Discounts are previewed now, and both loyalty redemption and store balance usage are only finalized when the order completes successfully.'}
                      </span>
                    </div>

                    {discountLoading ? (
                      <div className="mt-2 text-[11px] text-gray-500">{lang === 'es' ? 'Calculando descuentos...' : 'Calculating discounts...'}</div>
                    ) : null}
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-500">{lang === 'es' ? 'Métodos disponibles' : 'Available methods'}</div>
                    <div className="mt-4 space-y-3">
                      {paymentOptions.map((option) => (
                        <div key={option.title} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-white">{option.title}</div>
                            <Badge variant={option.active ? 'success' : 'default'}>{option.active ? 'ON' : 'OFF'}</Badge>
                          </div>
                          <div className="mt-1 text-xs leading-5 text-gray-400">{option.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {status === 'authenticated' && currentAvailableStoreBalance > 0 ? (
                      <>
                        <Button
                          onClick={checkoutWithBalance}
                          disabled={checkingOutBalance || savingCart || checkingOut || checkingOutStripe || checkoutBlocked || !canPayFullyWithBalance}
                          className="w-full justify-center text-center flex-wrap leading-tight rounded-2xl"
                        >
                          <FaCoins />
                          <span>
                            {checkingOutBalance
                              ? lang === 'es'
                                ? 'Procesando saldo...'
                                : 'Processing balance...'
                              : lang === 'es'
                                ? 'Pagar con saldo'
                                : 'Pay with balance'}
                          </span>
                        </Button>

                        {!canPayFullyWithBalance ? (
                          <div className="text-xs text-gray-400">
                            {lang === 'es'
                              ? `Tu saldo actual es ${formatPrice(currentAvailableStoreBalance)} y necesitas ${formatPrice(balanceCheckoutRequiredAmount)} para pagarlo completo.`
                              : `Your current balance is ${formatPrice(currentAvailableStoreBalance)} and you need ${formatPrice(balanceCheckoutRequiredAmount)} to pay it in full.`}
                          </div>
                        ) : null}
                      </>
                    ) : null}

                    <Button
                      onClick={checkoutStripeSession}
                      disabled={checkingOutStripe || savingCart || checkingOut || checkoutBlocked}
                      className="w-full justify-center text-center flex-wrap leading-tight rounded-2xl"
                    >
                      <FaCreditCard />
                      <span>{stripeCheckoutLabel}</span>
                    </Button>

                    <Button
                      onClick={checkout}
                      variant="secondary"
                      disabled={checkingOut || savingCart || checkingOutStripe || checkoutBlocked}
                      className="w-full justify-center text-center flex-wrap leading-tight rounded-2xl"
                    >
                      <FaShoppingCart />
                      <span>{checkoutLabel}</span>
                    </Button>

                    <Link href="/tienda" className="block">
                      <Button variant="secondary" className="w-full justify-center rounded-2xl">
                        {backToShopLabel}
                      </Button>
                    </Link>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3 text-white font-semibold">
                      <FaLock className="text-minecraft-diamond" />
                      <span>{lang === 'es' ? 'Checklist antes de pagar' : 'Before you pay'}</span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-400">{lang === 'es' ? 'Carrito listo' : 'Cart ready'}</span>
                        <Badge variant={cartItems.length ? 'success' : 'warning'}>{cartItems.length ? 'OK' : 'WAIT'}</Badge>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-400">{giftEnabled ? (lang === 'es' ? 'Destino regalo' : 'Gift target') : minecraftLabel}</span>
                        <Badge variant={giftEnabled ? (giftRecipientUsername.trim() ? 'success' : 'warning') : minecraftUuid ? 'success' : 'warning'}>
                          {giftEnabled
                            ? giftRecipientUsername.trim()
                              ? 'OK'
                              : 'WAIT'
                            : minecraftUuid
                              ? 'OK'
                              : 'WAIT'}
                        </Badge>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-400">{lang === 'es' ? 'Proceso' : 'Process'}</span>
                        <Badge variant={isCheckoutBusy ? 'warning' : 'info'}>{isCheckoutBusy ? (lang === 'es' ? 'OCUPADO' : 'BUSY') : (lang === 'es' ? 'LISTO' : 'READY')}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
