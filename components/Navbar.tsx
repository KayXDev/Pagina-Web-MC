
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';
import { 
  FaHome, 
  FaShoppingCart, 
  FaBook, 
  FaNewspaper, 
  FaEnvelope, 
  FaVoteYea,
  FaComments,
  FaBell,
  FaUser, 
  FaSignOutAlt, 
  FaSignInAlt, 
  FaBars, 
  FaTimes,
  FaCog
} from 'react-icons/fa';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [brandIconStatus, setBrandIconStatus] = useState<'ok' | 'error'>('ok');
  const pathname = usePathname();
  const { data: session } = useSession();
  const [lang, setLang] = useState<Lang>('es');
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpenDesktop, setNotifOpenDesktop] = useState(false);
  const [notifOpenMobile, setNotifOpenMobile] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifItems, setNotifItems] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement | null>(null);

  type CartItem = { productId: string; quantity: number };
  type Product = { _id: string; name: string; price: number; image?: string };

  const [cartOpenDesktop, setCartOpenDesktop] = useState(false);
  const [cartOpenMobile, setCartOpenMobile] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartProducts, setCartProducts] = useState<Product[]>([]);
  const cartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNotifOpenDesktop(false);
    setNotifOpenMobile(false);
    setCartOpenDesktop(false);
    setCartOpenMobile(false);
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (notifOpenDesktop) {
        const el = notifRef.current;
        if (el && e.target instanceof Node && !el.contains(e.target)) setNotifOpenDesktop(false);
      }
      if (cartOpenDesktop) {
        const el = cartRef.current;
        if (el && e.target instanceof Node && !el.contains(e.target)) setCartOpenDesktop(false);
      }
    };

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [notifOpenDesktop, cartOpenDesktop]);

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
    { name: t(lang, 'nav.support'), href: '/soporte', icon: FaEnvelope },
  ];

  const isActive = (href: string) => pathname === href;

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
            className="absolute inset-y-0 left-0 w-[80vw] max-w-[340px] bg-gray-950/95 backdrop-blur-md border-r border-white/10 shadow-xl"
          >
            <div className="h-full flex flex-col">
              <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                <Link
                  href="/"
                  onClick={() => {
                    setIsOpen(false);
                    setNotifOpenMobile(false);
                  }}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div
                    className={`w-9 h-9 rounded-md flex items-center justify-center overflow-hidden relative ${
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
                  <div className="text-white font-bold truncate">999Wrld Network</div>
                </Link>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    setNotifOpenMobile(false);
                  }}
                  className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10"
                  aria-label="Close"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3">
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
                        className={`block px-4 py-3 rounded-md text-base font-medium flex items-center space-x-3 ${
                          isActive(item.href)
                            ? 'bg-minecraft-grass text-white'
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  {session ? (
                    <>
                      {(session.user.role === 'ADMIN' || session.user.role === 'STAFF' || session.user.role === 'OWNER') && (
                        <Link
                          href="/admin"
                          onClick={() => {
                            setIsOpen(false);
                            setNotifOpenMobile(false);
                          }}
                          className="block px-4 py-3 rounded-md text-base font-medium bg-minecraft-diamond/20 text-minecraft-diamond flex items-center space-x-3"
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
                        }}
                        className="block px-4 py-3 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 flex items-center space-x-3"
                      >
                        <FaUser />
                        <span className="truncate">{session.user.name}</span>
                      </Link>

                      <button
                        onClick={() => {
                          const next = !notifOpenMobile;
                          setNotifOpenMobile(next);
                          setNotifOpenDesktop(false);
                          if (next) fetchNotifications();
                        }}
                        className="w-full px-4 py-3 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 flex items-center gap-3"
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
                          signOut();
                        }}
                        className="w-full text-left px-4 py-3 rounded-md text-base font-medium text-red-400 hover:bg-red-500/20 flex items-center space-x-3"
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
                      className="block px-4 py-3 rounded-md text-base font-medium bg-minecraft-grass text-white text-center"
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/70 backdrop-blur-md border-b border-white/10 shadow-sm shadow-black/30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-md flex items-center justify-center overflow-hidden relative ${
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
            <span className="text-white font-bold text-xl hidden sm:block">
              999Wrld Network
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1 flex-1 justify-center translate-x-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isActive(item.href)
                      ? 'bg-minecraft-grass text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Controls (desktop) */}
          <div className="hidden md:flex items-center ml-auto">
            <div className="flex items-center space-x-2">
              {session ? (
                <>
                  {(session.user.role === 'ADMIN' || session.user.role === 'STAFF' || session.user.role === 'OWNER') && (
                    <Link
                      href="/admin"
                      className="px-3 py-2 rounded-md text-sm font-medium bg-minecraft-diamond/20 text-minecraft-diamond hover:bg-minecraft-diamond/30 transition-all duration-200 flex items-center space-x-2"
                    >
                      <FaCog />
                      <span>{t(lang, 'user.admin')}</span>
                    </Link>
                  )}
                  <Link
                    href="/perfil"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center space-x-2"
                  >
                    <FaUser />
                    <span>{session.user.name}</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all duration-200 flex items-center space-x-2"
                  >
                    <FaSignOutAlt />
                    <span>{t(lang, 'user.logout')}</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-minecraft-grass text-white hover:bg-minecraft-grass/80 transition-all duration-200 flex items-center space-x-2"
                >
                  <FaSignInAlt />
                  <span>{t(lang, 'user.login')}</span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-1 ml-3 pl-3 border-l border-white/10">
              <div className="relative" ref={cartRef}>
                <button
                  onClick={() => {
                    const next = !cartOpenDesktop;
                    setCartOpenDesktop(next);
                    setCartOpenMobile(false);
                    setNotifOpenDesktop(false);
                    setNotifOpenMobile(false);
                    if (next) {
                      loadCart();
                      loadProductsIfNeeded();
                    }
                  }}
                  className="relative p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                  aria-label={lang === 'es' ? 'Carrito' : 'Cart'}
                >
                  <FaShoppingCart />
                  {cartTotalQty > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-minecraft-grass text-white text-[10px] font-bold">
                      {cartTotalQty > 99 ? '99+' : cartTotalQty}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {cartOpenDesktop && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-lg border border-white/10 bg-gray-950/90 backdrop-blur-md shadow-xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <div className="text-white font-semibold">{lang === 'es' ? 'Carrito' : 'Cart'}</div>
                        <div className="text-xs text-gray-300">{cartTotalQty} {lang === 'es' ? 'artículos' : 'items'}</div>
                      </div>

                      {cartLoading ? (
                        <div className="px-4 py-6 text-sm text-gray-400">{t(lang, 'common.loading')}</div>
                      ) : cartItems.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-400">{lang === 'es' ? 'Tu carrito está vacío.' : 'Your cart is empty.'}</div>
                      ) : (
                        <div className="max-h-[60vh] overflow-auto divide-y divide-white/10">
                          {cartItems.slice(0, 6).map((it) => {
                            const p = cartProductById.get(String(it.productId));
                            const name = String(p?.name || (lang === 'es' ? 'Producto' : 'Product'));
                            const line = Number(p?.price || 0) * Number(it.quantity || 0);
                            return (
                              <div key={it.productId} className="px-4 py-3 hover:bg-white/5">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-white truncate">{name}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">x{it.quantity}</div>
                                  </div>
                                  <div className="text-sm text-gray-200 shrink-0">{line > 0 ? formatPrice(line, lang === 'es' ? 'es-ES' : 'en-US') : ''}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-300">
                          {lang === 'es' ? 'Total' : 'Total'}:{' '}
                          <span className="text-white font-semibold">{formatPrice(cartTotalPrice, lang === 'es' ? 'es-ES' : 'en-US')}</span>
                        </div>
                        <Link
                          href="/carrito"
                          className="px-3 py-2 rounded-md text-sm font-medium bg-minecraft-grass text-white hover:bg-minecraft-grass/80 transition-all duration-200"
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
                  <button
                    onClick={() => {
                      const next = !notifOpenDesktop;
                      setNotifOpenDesktop(next);
                      setNotifOpenMobile(false);
                      if (next) fetchNotifications();
                    }}
                    className="relative p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                    aria-label={t(lang, 'nav.notifications')}
                  >
                    <FaBell />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpenDesktop && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-lg border border-white/10 bg-gray-950/90 backdrop-blur-md shadow-xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                          <div className="text-white font-semibold">{t(lang, 'nav.notifications')}</div>
                          <button onClick={markAllRead} className="text-sm text-gray-300 hover:text-white">
                            {t(lang, 'notifications.markAllRead')}
                          </button>
                        </div>

                        {notifLoading ? (
                          <div className="px-4 py-6 text-sm text-gray-400">{t(lang, 'common.loading')}</div>
                        ) : notifItems.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-gray-400">{t(lang, 'notifications.empty')}</div>
                        ) : (
                          <div className="max-h-[60vh] overflow-auto">
                            {notifItems.slice(0, 10).map((n: any) => {
                              const unread = true;
                              return (
                                <div
                                  key={n._id}
                                  className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 ${unread ? 'bg-white/5' : ''}`}
                                >
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
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center gap-1 ml-auto">
            <div className="relative">
              <button
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
                className="relative p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10"
                aria-label={lang === 'es' ? 'Carrito' : 'Cart'}
              >
                <FaShoppingCart size={20} />
                {cartTotalQty > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-minecraft-grass text-white text-[10px] font-bold">
                    {cartTotalQty > 99 ? '99+' : cartTotalQty}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {cartOpenMobile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-[92vw] max-w-[420px] rounded-lg border border-white/10 bg-gray-950/90 backdrop-blur-md shadow-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <div className="text-white font-semibold">{lang === 'es' ? 'Carrito' : 'Cart'}</div>
                      <div className="text-xs text-gray-300">{cartTotalQty} {lang === 'es' ? 'artículos' : 'items'}</div>
                    </div>

                    {cartLoading ? (
                      <div className="px-4 py-6 text-sm text-gray-400">{t(lang, 'common.loading')}</div>
                    ) : cartItems.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-400">{lang === 'es' ? 'Tu carrito está vacío.' : 'Your cart is empty.'}</div>
                    ) : (
                      <div className="max-h-[50vh] overflow-auto divide-y divide-white/10">
                        {cartItems.slice(0, 5).map((it) => {
                          const p = cartProductById.get(String(it.productId));
                          const name = String(p?.name || (lang === 'es' ? 'Producto' : 'Product'));
                          const line = Number(p?.price || 0) * Number(it.quantity || 0);
                          return (
                            <div key={it.productId} className="px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-white truncate">{name}</div>
                                  <div className="text-xs text-gray-400 mt-0.5">x{it.quantity}</div>
                                </div>
                                <div className="text-sm text-gray-200 shrink-0">{line > 0 ? formatPrice(line, lang === 'es' ? 'es-ES' : 'en-US') : ''}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-3">
                      <div className="text-sm text-gray-300">
                        {lang === 'es' ? 'Total' : 'Total'}:{' '}
                        <span className="text-white font-semibold">{formatPrice(cartTotalPrice, lang === 'es' ? 'es-ES' : 'en-US')}</span>
                      </div>
                      <Link
                        href="/carrito"
                        className="px-3 py-2 rounded-md text-sm font-medium bg-minecraft-grass text-white hover:bg-minecraft-grass/80 transition-all duration-200"
                        onClick={() => setCartOpenMobile(false)}
                      >
                        {lang === 'es' ? 'Ver carrito' : 'View cart'}
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ThemeToggle />
            <LanguageSwitcher />
            <button
              onClick={() => {
                const next = !isOpen;
                setIsOpen(next);
                if (!next) setNotifOpenMobile(false);
              }}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10"
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
