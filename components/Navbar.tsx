
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { formatPrice } from '@/lib/utils';
import { 
  FaHome, 
  FaAward,
  FaArrowRight,
  FaShoppingCart, 
  FaBook, 
  FaNewspaper, 
  FaEnvelope, 
  FaVoteYea,
  FaComments,
  FaBell,
  FaShieldAlt,
  FaUser, 
  FaSignOutAlt, 
  FaSignInAlt, 
  FaBars, 
  FaTimes,
  FaCog,
  FaTrash,
} from 'react-icons/fa';

const Navbar = () => {
  type LoyaltyPreviewEvent = {
    _id?: string;
    type?: string;
    points?: number;
    amountSpent?: number;
    description?: string;
    createdAt?: string;
  };

  type LoyaltyPreview = {
    loyaltyPoints: number;
    loyaltyLifetimePoints: number;
    loyaltyTier: string;
    loyaltyLastEarnedAt?: string | null;
    recentLoyaltyEvents: LoyaltyPreviewEvent[];
  };

  const [isOpen, setIsOpen] = useState(false);
  const [brandIconStatus, setBrandIconStatus] = useState<'ok' | 'error'>('ok');
  const pathname = usePathname();
  const { data: session } = useSession();
  const lang = useClientLang();
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpenDesktop, setNotifOpenDesktop] = useState(false);
  const [notifOpenMobile, setNotifOpenMobile] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifItems, setNotifItems] = useState<any[]>([]);
  const [loyaltySummary, setLoyaltySummary] = useState<LoyaltyPreview | null>(null);
  const [loyaltyOpenDesktop, setLoyaltyOpenDesktop] = useState(false);
  const [loyaltyOpenMobile, setLoyaltyOpenMobile] = useState(false);
  const [desktopNavIndicatorVisible, setDesktopNavIndicatorVisible] = useState(false);
  const [desktopNavMorph, setDesktopNavMorph] = useState({
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    glareShift: 0,
    transformOrigin: 'center center',
  });
  const notifRef = useRef<HTMLDivElement | null>(null);
  const loyaltyRef = useRef<HTMLDivElement | null>(null);
  const desktopNavRef = useRef<HTMLDivElement | null>(null);
  const desktopNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const desktopNavMorphTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopNavLastRectRef = useRef<{ x: number; width: number } | null>(null);
  const notifOpenDesktopRef = useRef(false);
  const notifOpenMobileRef = useRef(false);
  const notifStreamRef = useRef<EventSource | null>(null);
  const desktopNavIndicatorX = useMotionValue(0);
  const desktopNavIndicatorWidth = useMotionValue(0);
  const desktopNavIndicatorXSpring = useSpring(desktopNavIndicatorX, {
    stiffness: 420,
    damping: 32,
    mass: 0.58,
  });
  const desktopNavIndicatorWidthSpring = useSpring(desktopNavIndicatorWidth, {
    stiffness: 360,
    damping: 30,
    mass: 0.62,
  });

  type CartItem = { productId: string; quantity: number };
  type Product = { _id: string; name: string; price: number; image?: string };

  const [cartOpenDesktop, setCartOpenDesktop] = useState(false);
  const [cartOpenMobile, setCartOpenMobile] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartProducts, setCartProducts] = useState<Product[]>([]);
  const cartRef = useRef<HTMLDivElement | null>(null);
  const cartMobileRef = useRef<HTMLDivElement | null>(null);
  const mobileDrawerPanelRef = useRef<HTMLDivElement | null>(null);

  const resetDesktopNavMorph = () => {
    if (desktopNavMorphTimeoutRef.current) {
      clearTimeout(desktopNavMorphTimeoutRef.current);
      desktopNavMorphTimeoutRef.current = null;
    }

    setDesktopNavMorph({
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      glareShift: 0,
      transformOrigin: 'center center',
    });
  };

  const syncDesktopNavIndicatorToTarget = (target: HTMLAnchorElement | null, withMorph: boolean) => {
    const container = desktopNavRef.current;

    if (!container || !target) {
      setDesktopNavIndicatorVisible(false);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextRect = {
      x: targetRect.left - containerRect.left,
      width: targetRect.width,
    };
    const previousRect = desktopNavLastRectRef.current;

    desktopNavIndicatorX.set(nextRect.x);
    desktopNavIndicatorWidth.set(nextRect.width);
    setDesktopNavIndicatorVisible(true);

    if (withMorph && previousRect) {
      const travel = Math.abs(nextRect.x - previousRect.x);
      const widthShift = Math.abs(nextRect.width - previousRect.width);
      const direction = nextRect.x >= previousRect.x ? 1 : -1;
      const intensity = Math.min(0.22, 0.08 + travel / 480 + widthShift / 240);

      resetDesktopNavMorph();
      setDesktopNavMorph({
        scaleX: 1 + intensity,
        scaleY: 1 - intensity * 0.7,
        skewX: direction * Math.min(10, 4 + travel / 38),
        glareShift: direction * Math.min(18, 6 + travel / 22),
        transformOrigin: direction > 0 ? 'left center' : 'right center',
      });

      desktopNavMorphTimeoutRef.current = setTimeout(() => {
        setDesktopNavMorph({
          scaleX: 1,
          scaleY: 1,
          skewX: 0,
          glareShift: 0,
          transformOrigin: 'center center',
        });
        desktopNavMorphTimeoutRef.current = null;
      }, 210);
    }

    desktopNavLastRectRef.current = nextRect;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNotifOpenDesktop(false);
    setNotifOpenMobile(false);
    setLoyaltyOpenDesktop(false);
    setLoyaltyOpenMobile(false);
    setCartOpenDesktop(false);
    setCartOpenMobile(false);
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    notifOpenDesktopRef.current = notifOpenDesktop;
  }, [notifOpenDesktop]);

  useEffect(() => {
    notifOpenMobileRef.current = notifOpenMobile;
  }, [notifOpenMobile]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (notifOpenDesktop) {
        const el = notifRef.current;
        if (el && e.target instanceof Node && !el.contains(e.target)) setNotifOpenDesktop(false);
      }
      if (loyaltyOpenDesktop) {
        const el = loyaltyRef.current;
        if (el && e.target instanceof Node && !el.contains(e.target)) setLoyaltyOpenDesktop(false);
      }
      if (cartOpenDesktop) {
        const el = cartRef.current;
        if (el && e.target instanceof Node && !el.contains(e.target)) setCartOpenDesktop(false);
      }
      if (cartOpenMobile) {
        const el = cartMobileRef.current;
        if (el && e.target instanceof Node && !el.contains(e.target)) setCartOpenMobile(false);
      }
      if (isOpen) {
        const el = mobileDrawerPanelRef.current;
        if (el && e.target instanceof Node && !el.contains(e.target)) {
          setIsOpen(false);
          setNotifOpenMobile(false);
          setLoyaltyOpenMobile(false);
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setCartOpenDesktop(false);
      setCartOpenMobile(false);
      setNotifOpenDesktop(false);
      setNotifOpenMobile(false);
      setLoyaltyOpenDesktop(false);
      setLoyaltyOpenMobile(false);
      setIsOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notifOpenDesktop, loyaltyOpenDesktop, cartOpenDesktop, cartOpenMobile, isOpen]);

  const localCartKey = 'shop.cart.items';

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

  const readLocalCart = (): CartItem[] => {
    try {
      const raw = localStorage.getItem(localCartKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return normalizeCart(
        parsed
          .map((it: any) => ({ productId: String(it?.productId || ''), quantity: Number(it?.quantity || 0) }))
          .filter((it: CartItem) => Boolean(it.productId) && Number.isFinite(it.quantity) && it.quantity > 0)
      );
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

  const loadCart = async () => {
    setCartLoading(true);
    try {
      if (session?.user) {
        const res = await fetch('/api/shop/cart', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const serverItems = res.ok && Array.isArray((data as any).items) ? ((data as any).items as CartItem[]) : [];
        setCartItems(normalizeCart(serverItems || []));
      } else {
        setCartItems(readLocalCart());
      }
    } catch {
      setCartItems([]);
    } finally {
      setCartLoading(false);
    }
  };

  const persistCart = async (items: CartItem[]) => {
    const normalized = normalizeCart(items);
    setCartItems(normalized);

    if (session?.user) {
      // Keep local cart empty when using server-side cart
      try {
        localStorage.setItem(localCartKey, JSON.stringify([]));
      } catch {
        // ignore
      }

      try {
        await fetch('/api/shop/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: normalized }),
        });
        window.dispatchEvent(new Event('shop-cart-updated'));
      } catch {
        // ignore
      }
    } else {
      writeLocalCart(normalized);
    }
  };

  const removeFromCart = async (productId: string) => {
    const next = cartItems.filter((it) => String(it.productId) !== String(productId));
    await persistCart(next);
  };

  const loadProductsIfNeeded = async () => {
    if (cartProducts.length) return;
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const data = await res.json().catch(() => ([]));
      setCartProducts(Array.isArray(data) ? data : []);
    } catch {
      setCartProducts([]);
    }
  };

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, pathname]);

  useEffect(() => {
    const onCartUpdated = () => loadCart();
    window.addEventListener('shop-cart-updated', onCartUpdated);
    return () => window.removeEventListener('shop-cart-updated', onCartUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  const cartTotalQty = useMemo(() => cartItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0), [cartItems]);

  const cartProductById = useMemo(() => {
    return new Map<string, Product>(cartProducts.map((p) => [String(p._id), p]));
  }, [cartProducts]);

  const cartTotalPrice = useMemo(() => {
    return cartItems.reduce((sum, it) => {
      const p = cartProductById.get(String(it.productId));
      return sum + Number(p?.price || 0) * Number(it.quantity || 0);
    }, 0);
  }, [cartItems, cartProductById]);

  useEffect(() => {
    const loadLoyaltySummary = async () => {
      if (!session?.user) {
        setLoyaltySummary(null);
        return;
      }

      try {
        const res = await fetch('/api/profile', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('Error');
        setLoyaltySummary({
          loyaltyPoints: Math.max(0, Math.floor(Number((data as any).loyaltyPoints || 0))),
          loyaltyLifetimePoints: Math.max(0, Math.floor(Number((data as any).loyaltyLifetimePoints || 0))),
          loyaltyTier: String((data as any).loyaltyTier || 'Bronze'),
          loyaltyLastEarnedAt: ((data as any).loyaltyLastEarnedAt as string | null) || null,
          recentLoyaltyEvents: Array.isArray((data as any).recentLoyaltyEvents)
            ? ((data as any).recentLoyaltyEvents as LoyaltyPreviewEvent[])
            : [],
        });
      } catch {
        setLoyaltySummary(null);
      }
    };

    loadLoyaltySummary();
  }, [session?.user, pathname]);

  const loyaltyPointsLabel = loyaltySummary === null
    ? null
    : `${new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US').format(loyaltySummary.loyaltyPoints)} pts`;

  const loyaltyTierProgress = useMemo(() => {
    const lifetimePoints = Math.max(0, Math.floor(Number(loyaltySummary?.loyaltyLifetimePoints || 0)));
    const tiers = [
      { name: 'Bronze', min: 0, next: 250 },
      { name: 'Silver', min: 250, next: 1000 },
      { name: 'Gold', min: 1000, next: 2500 },
      { name: 'Diamond', min: 2500, next: null as number | null },
    ];

    const currentTier = tiers.find((tier, index) => {
      const nextTier = tiers[index + 1];
      return !nextTier || lifetimePoints < nextTier.min;
    }) || tiers[0];

    if (currentTier.next === null) {
      return {
        currentTier: currentTier.name,
        nextTier: null,
        progressPercent: 100,
        pointsRemaining: 0,
      };
    }

    const segmentTotal = Math.max(1, currentTier.next - currentTier.min);
    const segmentProgress = Math.min(segmentTotal, Math.max(0, lifetimePoints - currentTier.min));

    return {
      currentTier: currentTier.name,
      nextTier: tiers[tiers.findIndex((tier) => tier.name === currentTier.name) + 1]?.name || null,
      progressPercent: Math.max(6, Math.min(100, Math.round((segmentProgress / segmentTotal) * 100))),
      pointsRemaining: Math.max(0, currentTier.next - lifetimePoints),
    };
  }, [loyaltySummary?.loyaltyLifetimePoints]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return lang === 'es' ? 'Sin actividad reciente' : 'No recent activity';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'short',
    });
  };

  const loyaltyEventsPreview = Array.isArray(loyaltySummary?.recentLoyaltyEvents)
    ? loyaltySummary!.recentLoyaltyEvents.slice(0, 3)
    : [];

  const loyaltyPanel = (
    <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-2xl overflow-hidden">
      <div className="border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-minecraft-gold/15 to-transparent px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-minecraft-gold/80">{lang === 'es' ? 'Loyalty' : 'Loyalty'}</div>
            <div className="mt-1 text-lg font-black text-gray-900 dark:text-white">{lang === 'es' ? 'Tus puntos' : 'Your points'}</div>
          </div>
          <div className="rounded-full border border-minecraft-gold/20 bg-minecraft-gold/10 px-3 py-1 text-xs font-semibold text-minecraft-gold">
            {loyaltySummary?.loyaltyTier || 'Bronze'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{lang === 'es' ? 'Actuales' : 'Current'}</div>
            <div className="mt-1 text-xl font-black text-gray-900 dark:text-white">{loyaltySummary?.loyaltyPoints ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{lang === 'es' ? 'Histórico' : 'Lifetime'}</div>
            <div className="mt-1 text-xl font-black text-gray-900 dark:text-white">{loyaltySummary?.loyaltyLifetimePoints ?? 0}</div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Último abono' : 'Last reward'}: <span className="font-medium text-gray-800 dark:text-gray-200">{formatDateTime(loyaltySummary?.loyaltyLastEarnedAt)}</span>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-3">
          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-gray-500">
            <span>{lang === 'es' ? 'Progreso de nivel' : 'Tier progress'}</span>
            <span>{loyaltyTierProgress.currentTier}</span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-minecraft-gold via-minecraft-grass to-minecraft-diamond transition-[width] duration-500"
              style={{ width: `${loyaltyTierProgress.progressPercent}%` }}
            />
          </div>

          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {loyaltyTierProgress.nextTier
              ? lang === 'es'
                ? `Te faltan ${loyaltyTierProgress.pointsRemaining} puntos históricos para llegar a ${loyaltyTierProgress.nextTier}.`
                : `${loyaltyTierProgress.pointsRemaining} lifetime points left to reach ${loyaltyTierProgress.nextTier}.`
              : lang === 'es'
                ? 'Ya estás en el nivel más alto de loyalty.'
                : 'You are already at the highest loyalty tier.'}
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{lang === 'es' ? 'Últimas ganancias' : 'Latest activity'}</div>
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1 text-xs font-semibold text-minecraft-grass hover:text-minecraft-grass/80"
            onClick={() => {
              setLoyaltyOpenDesktop(false);
              setLoyaltyOpenMobile(false);
              setIsOpen(false);
            }}
          >
            <span>{lang === 'es' ? 'Ver perfil' : 'View profile'}</span>
            <FaArrowRight className="text-[10px]" />
          </Link>
        </div>

        <div className="mt-3 space-y-2">
          {loyaltyEventsPreview.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 px-3 py-4 text-sm text-gray-600 dark:text-gray-400">
              {lang === 'es' ? 'Todavía no hay movimientos recientes de loyalty.' : 'There is no recent loyalty activity yet.'}
            </div>
          ) : (
            loyaltyEventsPreview.map((event, index) => (
              <div key={event._id || `${event.type || 'event'}-${index}`} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.04] px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{event.description || (lang === 'es' ? 'Movimiento de loyalty' : 'Loyalty activity')}</div>
                    <div className="mt-1 text-xs text-gray-500">{formatDateTime(event.createdAt)}</div>
                  </div>
                  <div className={`shrink-0 text-sm font-bold ${Number(event.points || 0) >= 0 ? 'text-minecraft-grass' : 'text-red-400'}`}>
                    {Number(event.points || 0) > 0 ? '+' : ''}{Number(event.points || 0)} pts
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const fetchNotifications = async () => {
    if (!session?.user) {
      setUnreadCount(0);
      setNotifItems([]);
      return;
    }

    setNotifLoading(true);
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      setUnreadCount(typeof (data as any).unreadCount === 'number' ? (data as any).unreadCount : 0);
      setNotifItems(Array.isArray((data as any).items) ? (data as any).items : []);
    } catch {
      setUnreadCount(0);
      setNotifItems([]);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    // Keep counter reasonably fresh when logged in.
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, pathname]);

  useEffect(() => {
    if (!session?.user || typeof window === 'undefined') {
      if (notifStreamRef.current) {
        notifStreamRef.current.close();
        notifStreamRef.current = null;
      }
      return;
    }

    const es = new EventSource('/api/notifications/stream');
    notifStreamRef.current = es;

    const onNotifications = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const count = typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0;
        setUnreadCount(Math.max(0, count));

        // Keep list fresh while notifications panel is open.
        if (notifOpenDesktopRef.current || notifOpenMobileRef.current) {
          void fetchNotifications();
        }
      } catch {
        // ignore malformed events
      }
    };

    es.addEventListener('notifications', onNotifications as EventListener);

    return () => {
      es.removeEventListener('notifications', onNotifications as EventListener);
      es.close();
      if (notifStreamRef.current === es) {
        notifStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  const markAllRead = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) return;
      setUnreadCount(0);
      setNotifItems([]);
    } catch {
      // ignore
    }
  };

  const markOneRead = async (id: string) => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) return;
      setNotifItems((prev) => prev.filter((n: any) => n._id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const navItems = [
    { name: t(lang, 'nav.home'), href: '/', icon: FaHome },
    { name: t(lang, 'nav.shop'), href: '/tienda', icon: FaShoppingCart },
    { name: t(lang, 'nav.vote'), href: '/vote', icon: FaVoteYea },
    { name: t(lang, 'nav.rules'), href: '/normas', icon: FaBook },
    { name: t(lang, 'nav.news'), href: '/noticias', icon: FaNewspaper },
    { name: t(lang, 'nav.forum'), href: '/foro', icon: FaComments },
    { name: t(lang, 'nav.partner'), href: '/partner', icon: FaShieldAlt },
    { name: t(lang, 'nav.support'), href: '/soporte', icon: FaEnvelope },
  ];

  const isActive = (href: string) => pathname === href;
  const routeActiveDesktopNavHref = navItems.find((item) => isActive(item.href))?.href || null;
  const activeDesktopNavHref = routeActiveDesktopNavHref;

  useEffect(() => {
    const syncDesktopNavIndicator = () => {
      const activeHref = activeDesktopNavHref;

      if (!activeHref) {
        setDesktopNavIndicatorVisible(false);
        return;
      }

      const target = desktopNavItemRefs.current[activeHref];
      if (!target) {
        setDesktopNavIndicatorVisible(false);
        return;
      }

      syncDesktopNavIndicatorToTarget(target, true);
    };

    const frame = window.requestAnimationFrame(syncDesktopNavIndicator);
    const onResize = () => syncDesktopNavIndicator();

    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [activeDesktopNavHref, desktopNavIndicatorWidth, desktopNavIndicatorX, navItems, pathname]);

  useEffect(() => {
    return () => {
      resetDesktopNavMorph();
    };
  }, []);

  const mobileDrawer = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="md:hidden fixed inset-0 z-[1000]"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setIsOpen(false);
              setNotifOpenMobile(false);
            }}
          />

          <motion.div
            initial={{ x: -360 }}
            animate={{ x: 0 }}
            exit={{ x: -360 }}
            transition={{ type: 'tween', duration: 0.2 }}
            ref={mobileDrawerPanelRef}
            className="absolute inset-y-0 left-0 w-[88vw] max-w-[380px] border-r border-white/10 bg-[linear-gradient(180deg,rgba(3,7,18,0.98),rgba(9,16,30,0.95))] shadow-[24px_0_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <div className="h-full flex flex-col">
              <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between gap-3">
                <Link
                  href="/"
                  onClick={() => {
                    setIsOpen(false);
                    setNotifOpenMobile(false);
                    setLoyaltyOpenMobile(false);
                  }}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div
                    className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/10 ${
                      brandIconStatus === 'ok' ? 'bg-transparent' : 'bg-minecraft-grass'
                    }`}
                  >
                    {brandIconStatus !== 'error' && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/icon.png"
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={() => setBrandIconStatus('error')}
                      />
                    )}
                    {brandIconStatus === 'ok' ? null : <span className="text-white font-bold text-lg">MC</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-white">999Wrld Network</div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Minecraft community</div>
                  </div>
                </Link>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    setNotifOpenMobile(false);
                  }}
                  className="rounded-2xl border border-white/10 p-2 text-gray-300 hover:text-white hover:bg-white/10"
                  aria-label="Close"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Navigation</div>
                <div className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => {
                          setIsOpen(false);
                          setNotifOpenMobile(false);
                        }}
                        className={`block rounded-[20px] px-4 py-3 text-base font-medium flex items-center space-x-3 border transition-colors ${
                          isActive(item.href)
                            ? 'border-transparent bg-gradient-to-r from-minecraft-grass to-minecraft-diamond text-white shadow-[0_24px_60px_-38px_rgba(71,209,232,0.55)]'
                            : 'border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-5 border-t border-white/10 pt-4 space-y-2">
                  {session ? (
                    <>
                      {(session.user.role === 'ADMIN' || session.user.role === 'STAFF' || session.user.role === 'OWNER') && (
                        <Link
                          href="/admin"
                          onClick={() => {
                            setIsOpen(false);
                            setNotifOpenMobile(false);
                          }}
                          className="block rounded-[20px] px-4 py-3 text-base font-medium bg-minecraft-diamond/15 text-minecraft-diamond border border-minecraft-diamond/20 flex items-center space-x-3"
                        >
                          <FaCog />
                          <span>{t(lang, 'user.adminPanel')}</span>
                        </Link>
                      )}

                      <Link
                        href="/perfil"
                        onClick={() => {
                          setIsOpen(false);
                          setNotifOpenMobile(false);
                          setLoyaltyOpenMobile(false);
                        }}
                        className="block rounded-[20px] px-4 py-3 text-base font-medium text-gray-300 border border-white/10 bg-white/[0.03] hover:bg-white/10 flex items-center space-x-3"
                      >
                        <FaUser />
                        <div className="min-w-0">
                          <div className="truncate text-white">
                            {String((session.user as any).displayName || '').trim() || String((session.user as any).username || session.user.name || '').trim()}
                          </div>
                        </div>
                      </Link>

                          {loyaltyPointsLabel ? (
                            <>
                              <button
                                onClick={() => {
                                  const next = !loyaltyOpenMobile;
                                  setLoyaltyOpenMobile(next);
                                  setNotifOpenMobile(false);
                                  if (next) setLoyaltyOpenDesktop(false);
                                }}
                                className="w-full rounded-[20px] px-4 py-3 text-base font-medium text-gray-300 border border-white/10 bg-white/[0.03] hover:bg-white/10 flex items-center gap-3"
                              >
                                <FaAward className="text-minecraft-gold" />
                                <span className="flex-1 text-left">{lang === 'es' ? 'Tus puntos loyalty' : 'Your loyalty points'}</span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-minecraft-gold/20 bg-minecraft-gold/10 px-2 py-0.5 text-[11px] font-semibold text-minecraft-gold">
                                  {loyaltyPointsLabel}
                                </span>
                              </button>

                              <AnimatePresence>
                                {loyaltyOpenMobile && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-2">{loyaltyPanel}</div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : null}

                      <button
                        onClick={() => {
                          const next = !notifOpenMobile;
                          setNotifOpenMobile(next);
                          setNotifOpenDesktop(false);
                              setLoyaltyOpenMobile(false);
                          if (next) fetchNotifications();
                        }}
                        className="w-full rounded-[20px] px-4 py-3 text-base font-medium text-gray-300 border border-white/10 bg-white/[0.03] hover:bg-white/10 flex items-center gap-3 transition-transform duration-200 hover:scale-[1.01]"
                      >
                        <FaBell />
                        <span className="flex-1 text-left">{t(lang, 'nav.notifications')}</span>
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>

                      <AnimatePresence>
                        {notifOpenMobile && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 rounded-lg border border-white/10 bg-black/40">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                <div className="text-white font-semibold">{t(lang, 'nav.notifications')}</div>
                                <button onClick={markAllRead} className="text-sm text-gray-300 hover:text-white">
                                  {t(lang, 'notifications.markAllRead')}
                                </button>
                              </div>

                              {notifLoading ? (
                                <div className="px-4 py-4 text-sm text-gray-400">{t(lang, 'common.loading')}</div>
                              ) : notifItems.length === 0 ? (
                                <div className="px-4 py-4 text-sm text-gray-400">{t(lang, 'notifications.empty')}</div>
                              ) : (
                                <div className="max-h-[50vh] overflow-auto divide-y divide-white/10">
                                  {notifItems.slice(0, 10).map((n: any) => {
                                    const unread = true;
                                    return (
                                      <div key={n._id} className={`px-4 py-3 ${unread ? 'bg-white/5' : ''}`}>
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="text-sm font-semibold text-white truncate">{n.title}</div>
                                            <div className="text-xs text-gray-300 mt-1 line-clamp-2">{n.message}</div>
                                            {n.href && (
                                              <Link
                                                href={n.href}
                                                className="inline-block mt-2 text-xs text-minecraft-grass hover:text-minecraft-grass/80"
                                                onClick={() => {
                                                  markOneRead(n._id);
                                                  setIsOpen(false);
                                                  setNotifOpenMobile(false);
                                                }}
                                              >
                                                {t(lang, 'notifications.goToLink')}
                                              </Link>
                                            )}
                                          </div>

                                          {unread && (
                                            <button
                                              onClick={() => markOneRead(n._id)}
                                              className="shrink-0 text-xs text-gray-300 hover:text-white"
                                            >
                                              {t(lang, 'notifications.markRead')}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="px-4 py-3 border-t border-white/10 flex justify-end">
                                <Link
                                  href="/notificaciones"
                                  className="text-sm text-gray-300 hover:text-white"
                                  onClick={() => {
                                    setIsOpen(false);
                                    setNotifOpenMobile(false);
                                  }}
                                >
                                  {t(lang, 'notifications.viewAll')}
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={() => {
                          setIsOpen(false);
                          setNotifOpenMobile(false);
                          setLoyaltyOpenMobile(false);
                          signOut();
                        }}
                        className="w-full text-left rounded-[20px] px-4 py-3 text-base font-medium text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/20 flex items-center space-x-3"
                      >
                        <FaSignOutAlt />
                        <span>{t(lang, 'user.logout')}</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/auth/login"
                      onClick={() => {
                        setIsOpen(false);
                        setNotifOpenMobile(false);
                      }}
                      className="block rounded-[20px] px-4 py-3 text-base font-medium text-white bg-gradient-to-r from-minecraft-grass to-minecraft-diamond hover:from-minecraft-grass/90 hover:to-minecraft-diamond/90 ring-1 ring-white/10 text-center"
                    >
                      {t(lang, 'user.login')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-minecraft-diamond/10 bg-gray-950/78 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-minecraft-diamond/35 to-transparent" />
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-2 sm:gap-4 lg:gap-6">
          {/* Logo */}
          <Link href="/" className="flex min-w-0 shrink-0 items-center space-x-2 sm:space-x-3">
            <div
              className={`relative flex h-10 w-10 items-center justify-center overflow-hidden ${
                brandIconStatus === 'ok' ? 'bg-transparent' : 'bg-minecraft-grass'
              }`}
            >
              {brandIconStatus !== 'error' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/icon.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setBrandIconStatus('error')}
                />
              )}
              {brandIconStatus === 'ok' ? null : <span className="text-white font-bold text-xl">MC</span>}
            </div>
            <span className="hidden truncate text-lg font-black tracking-tight text-white sm:block lg:text-xl">
              999Wrld Network
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex min-w-0 flex-1 justify-center px-2">
            <div
              ref={desktopNavRef}
              className="relative flex min-w-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-1 left-0 rounded-full border border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(71,209,232,0.18),rgba(123,192,67,0.12))] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_26px_rgba(71,209,232,0.18)] backdrop-blur-xl will-change-transform"
                style={{
                  x: desktopNavIndicatorXSpring,
                  width: desktopNavIndicatorWidthSpring,
                  opacity: desktopNavIndicatorVisible ? 1 : 0,
                  transformOrigin: desktopNavMorph.transformOrigin,
                }}
                animate={{
                  scaleX: desktopNavMorph.scaleX,
                  scaleY: desktopNavMorph.scaleY,
                  skewX: desktopNavMorph.skewX,
                }}
                transition={{
                  scaleX: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                  scaleY: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                  skewX: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.12, ease: 'easeOut' },
                }}
              >
                <span className="absolute inset-[1px] rounded-full bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.4),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.04)_42%,rgba(71,209,232,0.08)_100%)]" />
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-x-[14%] top-[16%] h-[32%] rounded-full bg-white/12 blur-md"
                  animate={{ x: desktopNavMorph.glareShift }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                />
                <span className="absolute inset-y-[22%] right-[10%] w-[24%] rounded-full bg-cyan-200/10 blur-md" />
              </motion.span>

              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeDesktopNavHref === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    ref={(node) => {
                      desktopNavItemRefs.current[item.href] = node;
                    }}
                    className={`group relative inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                      active
                        ? 'text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {active ? null : (
                      <span className="absolute inset-0 rounded-full bg-white/[0.06] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    )}
                    <Icon className="relative z-10 text-[13px]" />
                    <span className="relative z-10">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Controls (desktop) */}
          <div className="hidden md:flex items-center ml-auto gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              {session ? (
                <>
                  {(session.user.role === 'ADMIN' || session.user.role === 'STAFF' || session.user.role === 'OWNER') && (
                    <Link
                      href="/admin"
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-minecraft-diamond/25 bg-minecraft-diamond/10 px-4 text-sm font-semibold text-minecraft-diamond hover:bg-minecraft-diamond/15 transition-colors"
                    >
                      <FaCog />
                      <span>{t(lang, 'user.admin')}</span>
                    </Link>
                  )}
                  <div className="relative" ref={loyaltyRef}>
                    <div className="flex items-center gap-2 rounded-full px-2 py-1.5 text-gray-200">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-gray-200">
                        <FaUser className="text-[12px]" />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Link href="/perfil" className="truncate text-[13px] font-semibold text-white hover:text-minecraft-diamond transition-colors">
                          {String((session.user as any).displayName || '').trim() || String((session.user as any).username || session.user.name || '').trim()}
                        </Link>

                        {loyaltyPointsLabel ? (
                          <button
                            onClick={() => {
                              const next = !loyaltyOpenDesktop;
                              setLoyaltyOpenDesktop(next);
                              setCartOpenDesktop(false);
                              setNotifOpenDesktop(false);
                              setNotifOpenMobile(false);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-minecraft-gold/20 bg-minecraft-gold/10 px-2.5 py-[4px] text-[10px] font-semibold text-minecraft-gold hover:border-minecraft-gold/35 hover:bg-minecraft-gold/15 transition-colors"
                            aria-label={lang === 'es' ? 'Abrir resumen de loyalty' : 'Open loyalty summary'}
                          >
                            <FaAward className="text-[9px]" />
                            <span>{loyaltyPointsLabel}</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <AnimatePresence>
                      {loyaltyOpenDesktop && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="absolute right-0 mt-2 w-[360px] max-w-[92vw]"
                        >
                          {loyaltyPanel}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-red-400 hover:bg-red-500/15 transition-colors"
                    aria-label={t(lang, 'user.logout')}
                    title={t(lang, 'user.logout')}
                  >
                    <FaSignOutAlt />
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-minecraft-grass to-minecraft-diamond px-4 text-sm font-semibold text-white shadow-lg shadow-minecraft-diamond/20 ring-1 ring-white/10 transition-all duration-200 hover:from-minecraft-grass/90 hover:to-minecraft-diamond/90"
                >
                  <FaSignInAlt />
                  <span>{t(lang, 'user.login')}</span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="relative" ref={cartRef}>
                <motion.button
                  onClick={() => {
                    const next = !cartOpenDesktop;
                    setCartOpenDesktop(next);
                    setCartOpenMobile(false);
                    setLoyaltyOpenDesktop(false);
                    setNotifOpenDesktop(false);
                    setNotifOpenMobile(false);
                    if (next) {
                      loadCart();
                      loadProductsIfNeeded();
                    }
                  }}
                  className="group relative rounded-full p-2 text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                  aria-label={lang === 'es' ? 'Carrito' : 'Cart'}
                  whileHover={{ scale: 1.12, y: -1, rotate: [0, -12, 10, -8, 0] }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28, rotate: { duration: 0.45, ease: 'easeInOut' } }}
                >
                  <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-minecraft-grass/10 to-minecraft-diamond/10" />
                  <span className="relative">
                    <FaShoppingCart />
                  </span>
                  {cartTotalQty > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-minecraft-grass text-white text-[10px] font-bold">
                      {cartTotalQty > 99 ? '99+' : cartTotalQty}
                    </span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {cartOpenDesktop && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-[420px] max-w-[92vw] overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-gray-950/90"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/60 dark:to-gray-950/40">
                        <div className="text-gray-900 dark:text-white font-semibold text-lg">{lang === 'es' ? 'Carrito' : 'Cart'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">{cartTotalQty} {lang === 'es' ? 'artículos' : 'items'}</div>
                      </div>

                      {cartLoading ? (
                        <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-400">{t(lang, 'common.loading')}</div>
                      ) : cartItems.length === 0 ? (
                        <div className="px-4 py-7">
                          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-6 text-center">
                            <div className="mx-auto h-14 w-14 rounded-xl grid place-items-center bg-minecraft-gold/15 text-minecraft-gold mb-3">
                              <FaShoppingCart size={24} />
                            </div>
                            <div className="text-gray-900 dark:text-white font-semibold mb-1">
                              {lang === 'es' ? 'Tu carrito esta vacio' : 'Your cart is empty'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {lang === 'es' ? 'Añade productos para verlos aqui.' : 'Add products to see them here.'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="max-h-[60vh] overflow-auto px-3 py-3 space-y-2">
                          {cartItems.slice(0, 6).map((it) => {
                            const p = cartProductById.get(String(it.productId));
                            const name = String(p?.name || (lang === 'es' ? 'Producto' : 'Product'));
                            const line = Number(p?.price || 0) * Number(it.quantity || 0);
                            return (
                              <div key={it.productId} className="px-3 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">x{it.quantity}</div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-sm text-gray-700 dark:text-gray-200">{line > 0 ? formatPrice(line, lang === 'es' ? 'es-ES' : 'en-US') : ''}</div>
                                    <button
                                      type="button"
                                      className="p-2 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                      aria-label={lang === 'es' ? 'Quitar' : 'Remove'}
                                      onClick={() => removeFromCart(it.productId)}
                                    >
                                      <FaTrash size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {lang === 'es' ? 'Total' : 'Total'}:{' '}
                          <span className="text-gray-900 dark:text-white font-semibold">{formatPrice(cartTotalPrice, lang === 'es' ? 'es-ES' : 'en-US')}</span>
                        </div>
                        <Link
                          href="/carrito"
                          className="px-3 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-minecraft-grass to-minecraft-diamond bg-[length:200%_200%] bg-[position:0%_50%] hover:bg-[position:100%_50%] transition-[background-position] duration-700 hover:from-minecraft-grass/90 hover:to-minecraft-diamond/90 ring-1 ring-white/10 transition-all duration-200"
                          onClick={() => setCartOpenDesktop(false)}
                        >
                          {lang === 'es' ? 'Ver carrito' : 'View cart'}
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {session?.user && (
                <div className="relative" ref={notifRef}>
                  <motion.button
                    onClick={() => {
                      const next = !notifOpenDesktop;
                      setNotifOpenDesktop(next);
                      setNotifOpenMobile(false);
                      setLoyaltyOpenDesktop(false);
                      setCartOpenDesktop(false);
                      setCartOpenMobile(false);
                      if (next) fetchNotifications();
                    }}
                    className="group relative rounded-full p-2 text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label={t(lang, 'nav.notifications')}
                    whileHover={{ scale: 1.12, y: -1, x: [0, -2, 2, -2, 2, 0] }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 28, x: { duration: 0.35, ease: 'easeInOut' } }}
                  >
                    <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-minecraft-diamond/10 to-minecraft-grass/10" />
                    <span className="relative">
                      <FaBell />
                    </span>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {notifOpenDesktop && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-gray-950/90 backdrop-blur-sm shadow-xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
                          <div className="text-gray-900 dark:text-white font-semibold">{t(lang, 'nav.notifications')}</div>
                          <button onClick={markAllRead} className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                            {t(lang, 'notifications.markAllRead')}
                          </button>
                        </div>

                        {notifLoading ? (
                          <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-400">{t(lang, 'common.loading')}</div>
                        ) : notifItems.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-400">{t(lang, 'notifications.empty')}</div>
                        ) : (
                          <div className="max-h-[60vh] overflow-auto">
                            {notifItems.slice(0, 10).map((n: any) => {
                              const unread = true;
                              return (
                                <div
                                  key={n._id}
                                  className={`px-4 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 ${unread ? 'bg-gray-50 dark:bg-white/5' : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{n.title}</div>
                                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{n.message}</div>
                                      {n.href && (
                                        <Link
                                          href={n.href}
                                          className="inline-block mt-2 text-xs text-minecraft-grass hover:text-minecraft-grass/80"
                                          onClick={() => {
                                            markOneRead(n._id);
                                            setNotifOpenDesktop(false);
                                          }}
                                        >
                                          {t(lang, 'notifications.goToLink')}
                                        </Link>
                                      )}
                                    </div>

                                    {unread && (
                                      <button
                                        onClick={() => markOneRead(n._id)}
                                        className="shrink-0 text-xs text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                      >
                                        {t(lang, 'notifications.markRead')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 flex justify-end">
                          <Link
                            href="/notificaciones"
                            className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                            onClick={() => setNotifOpenDesktop(false)}
                          >
                            {t(lang, 'notifications.viewAll')}
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div className="rounded-full hover:bg-white/[0.08] transition-colors">
                <LanguageSwitcher />
              </div>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="md:hidden ml-auto flex items-center gap-0.5">
            <div className="relative">
              <motion.button
                onClick={() => {
                  const next = !cartOpenMobile;
                  setCartOpenMobile(next);
                  setCartOpenDesktop(false);
                  setNotifOpenDesktop(false);
                  setNotifOpenMobile(false);
                  if (next) {
                    loadCart();
                    loadProductsIfNeeded();
                  }
                }}
                className="group relative rounded-xl p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
                aria-label={lang === 'es' ? 'Carrito' : 'Cart'}
                whileHover={{ scale: 1.12, y: -1, rotate: [0, -12, 10, -8, 0] }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 520, damping: 28, rotate: { duration: 0.45, ease: 'easeInOut' } }}
              >
                <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-minecraft-grass/10 to-minecraft-diamond/10" />
                <span className="relative">
                  <FaShoppingCart size={20} />
                </span>
                {cartTotalQty > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-minecraft-grass text-white text-[10px] font-bold">
                    {cartTotalQty > 99 ? '99+' : cartTotalQty}
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {cartOpenMobile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    ref={cartMobileRef}
                    className="fixed top-16 left-1/2 -translate-x-1/2 mt-2 w-[calc(100vw-1rem)] max-w-[420px] rounded-2xl border border-gray-200/80 dark:border-minecraft-diamond/20 bg-white/95 dark:bg-gray-950/90 backdrop-blur-md shadow-2xl overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/60 dark:to-gray-950/40">
                      <div className="text-gray-900 dark:text-white font-semibold text-lg">{lang === 'es' ? 'Carrito' : 'Cart'}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{cartTotalQty} {lang === 'es' ? 'artículos' : 'items'}</div>
                    </div>

                    {cartLoading ? (
                      <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-400">{t(lang, 'common.loading')}</div>
                    ) : cartItems.length === 0 ? (
                      <div className="px-4 py-7">
                        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-6 text-center">
                          <div className="mx-auto h-14 w-14 rounded-xl grid place-items-center bg-minecraft-gold/15 text-minecraft-gold mb-3">
                            <FaShoppingCart size={24} />
                          </div>
                          <div className="text-gray-900 dark:text-white font-semibold mb-1">
                            {lang === 'es' ? 'Tu carrito esta vacio' : 'Your cart is empty'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {lang === 'es' ? 'Añade productos para verlos aqui.' : 'Add products to see them here.'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-[50vh] overflow-auto px-3 py-3 space-y-2">
                        {cartItems.slice(0, 5).map((it) => {
                          const p = cartProductById.get(String(it.productId));
                          const name = String(p?.name || (lang === 'es' ? 'Producto' : 'Product'));
                          const line = Number(p?.price || 0) * Number(it.quantity || 0);
                          return (
                            <div key={it.productId} className="px-3 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">x{it.quantity}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-sm text-gray-700 dark:text-gray-200">{line > 0 ? formatPrice(line, lang === 'es' ? 'es-ES' : 'en-US') : ''}</div>
                                  <button
                                    type="button"
                                    className="p-2 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                    aria-label={lang === 'es' ? 'Quitar' : 'Remove'}
                                    onClick={() => removeFromCart(it.productId)}
                                  >
                                    <FaTrash size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {lang === 'es' ? 'Total' : 'Total'}:{' '}
                        <span className="text-gray-900 dark:text-white font-semibold">{formatPrice(cartTotalPrice, lang === 'es' ? 'es-ES' : 'en-US')}</span>
                      </div>
                      <Link
                        href="/carrito"
                        className="px-3 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-minecraft-grass to-minecraft-diamond bg-[length:200%_200%] bg-[position:0%_50%] hover:bg-[position:100%_50%] transition-[background-position] duration-700 hover:from-minecraft-grass/90 hover:to-minecraft-diamond/90 ring-1 ring-white/10 transition-all duration-200"
                        onClick={() => setCartOpenMobile(false)}
                      >
                        {lang === 'es' ? 'Ver carrito' : 'View cart'}
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {session?.user ? (
              <Link
                href="/notificaciones"
                className="group relative rounded-xl p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
                aria-label={t(lang, 'nav.notifications')}
                title={t(lang, 'nav.notifications')}
              >
                <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-minecraft-diamond/10 to-minecraft-grass/10" />
                <span className="relative">
                  <FaBell size={20} />
                </span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            ) : null}
            <LanguageSwitcher />
            <button
              onClick={() => {
                const next = !isOpen;
                setIsOpen(next);
                if (!next) {
                  setNotifOpenMobile(false);
                  setLoyaltyOpenMobile(false);
                }
              }}
              className="rounded-xl p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10"
            >
              {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>
      </nav>

      {mounted && typeof document !== 'undefined' ? createPortal(mobileDrawer, document.body) : null}
    </>
  );
};

export default Navbar;
