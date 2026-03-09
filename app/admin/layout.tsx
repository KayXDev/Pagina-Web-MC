'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  FaAward,
  FaBars,
  FaClipboardList,
  FaCog,
  FaComments,
  FaEnvelope,
  FaHistory,
  FaHeartbeat,
  FaHome,
  FaKey,
  FaNewspaper,
  FaPercent,
  FaShieldAlt,
  FaShoppingCart,
  FaTicketAlt,
  FaTimes,
  FaUserFriends,
  FaUsers,
} from 'react-icons/fa';
import { t } from '@/lib/i18n';
import { Badge } from '@/components/ui';
import AdminSectionBanner from '@/components/admin/AdminSectionBanner';
import { useClientLang } from '@/lib/useClientLang';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const { data: session } = useSession();

  const lang = useClientLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const role = session?.user?.role;
  const adminSectionsConfigured = Boolean((session?.user as any)?.adminSectionsConfigured);
  const adminSections = Array.isArray((session?.user as any)?.adminSections)
    ? (((session?.user as any)?.adminSections as string[]) || [])
    : [];

  const canSee = (key: string) => {
    if (role === 'OWNER') return true;
    if (key === 'license' && role === 'STAFF') return false;
    if (role !== 'ADMIN') return true; // STAFF keeps full panel behavior for now
    if (!adminSectionsConfigured) return true;
    if (key === 'dashboard') return true;
    return adminSections.includes(key);
  };

  const menuItems: Array<{
    key: string;
    name: string;
    href: string;
    icon: any;
    group: 'main' | 'content' | 'system';
  }> = [
    { key: 'dashboard', name: t(lang, 'admin.menu.dashboard'), href: '/admin', icon: FaHome, group: 'main' },
    { key: 'users', name: t(lang, 'admin.menu.users'), href: '/admin/users', icon: FaUsers, group: 'main' },
    { key: 'badges', name: t(lang, 'admin.menu.badges'), href: '/admin/badges', icon: FaAward, group: 'main' },
    { key: 'products', name: t(lang, 'admin.menu.products'), href: '/admin/products', icon: FaShoppingCart, group: 'main' },
    { key: 'coupons', name: lang === 'es' ? 'Cupones' : 'Coupons', href: '/admin/coupons', icon: FaPercent, group: 'main' },
    { key: 'referrals', name: lang === 'es' ? 'Referidos' : 'Referrals', href: '/admin/referrals', icon: FaUserFriends, group: 'main' },
    { key: 'loyalty', name: t(lang, 'admin.menu.loyalty'), href: '/admin/loyalty', icon: FaAward, group: 'main' },
    { key: 'tickets', name: t(lang, 'admin.menu.tickets'), href: '/admin/tickets', icon: FaTicketAlt, group: 'main' },
    { key: 'applications', name: t(lang, 'admin.menu.applications'), href: '/admin/postulaciones', icon: FaClipboardList, group: 'main' },
    { key: 'forum', name: t(lang, 'admin.menu.forum'), href: '/admin/foro', icon: FaComments, group: 'content' },
    { key: 'blog', name: t(lang, 'admin.menu.blog'), href: '/admin/blog', icon: FaNewspaper, group: 'content' },
    { key: 'partner', name: t(lang, 'admin.menu.partner'), href: '/admin/partner', icon: FaShieldAlt, group: 'content' },
    { key: 'newsletter', name: t(lang, 'admin.menu.newsletter'), href: '/admin/newsletter', icon: FaEnvelope, group: 'system' },
    { key: 'servicesStatus', name: t(lang, 'admin.menu.servicesStatus'), href: '/admin/services-status', icon: FaHeartbeat, group: 'system' },
    { key: 'license', name: lang === 'es' ? 'Licencia' : 'License', href: '/admin/licencia', icon: FaKey, group: 'system' },
    { key: 'logs', name: t(lang, 'admin.menu.logs'), href: '/admin/logs', icon: FaHistory, group: 'system' },
    { key: 'settings', name: t(lang, 'admin.menu.settings'), href: '/admin/settings', icon: FaCog, group: 'system' },
  ];

  const normalizePath = (p: string) => (p || '').replace(/\/+$/, '') || '/';
  const isActive = (href: string) => {
    const current = normalizePath(pathname);
    const target = normalizePath(href);
    if (target === '/admin') return current === '/admin';
    return current === target || current.startsWith(`${target}/`);
  };

  const activeLabel = (() => {
    if (pathname.startsWith('/admin/permisos')) return t(lang, 'admin.menu.permissions');
    const item = menuItems.find((m) => isActive(m.href));
    return item?.name || t(lang, 'admin.panel.title');
  })();

  const currentSectionKey = (() => {
    if (pathname === '/admin') return 'dashboard';
    if (pathname.startsWith('/admin/users/')) return 'userDetail';
    if (pathname.startsWith('/admin/users')) return 'users';
    if (pathname.startsWith('/admin/badges')) return 'badges';
    if (pathname.startsWith('/admin/products')) return 'products';
    if (pathname.startsWith('/admin/coupons')) return 'coupons';
    if (pathname.startsWith('/admin/referrals')) return 'referrals';
    if (pathname.startsWith('/admin/loyalty')) return 'loyalty';
    if (pathname.startsWith('/admin/tickets')) return 'tickets';
    if (pathname.startsWith('/admin/postulaciones/chat/')) return 'applicationChat';
    if (pathname.startsWith('/admin/postulaciones')) return 'applications';
    if (pathname.startsWith('/admin/foro')) return 'forum';
    if (pathname.startsWith('/admin/blog')) return 'blog';
    if (pathname.startsWith('/admin/partner')) return 'partner';
    if (pathname.startsWith('/admin/newsletter')) return 'newsletter';
    if (pathname.startsWith('/admin/services-status')) return 'servicesStatus';
    if (pathname.startsWith('/admin/licencia')) return 'license';
    if (pathname.startsWith('/admin/logs')) return 'logs';
    if (pathname.startsWith('/admin/settings')) return 'settings';
    if (pathname.startsWith('/admin/permisos')) return 'permissions';
    return 'dashboard';
  })();

  const isSpanish = lang === 'es';
  const sectionBannerMeta = (() => {
    switch (currentSectionKey) {
      case 'dashboard':
        return {
          eyebrow: isSpanish ? 'Panel administrativo' : 'Admin dashboard',
          title: t(lang, 'admin.dashboard.title'),
          description: t(lang, 'admin.dashboard.subtitle'),
          icon: <FaHome />,
          badgeLabel: isSpanish ? 'Resumen' : 'Overview',
        };
      case 'users':
        return {
          eyebrow: isSpanish ? 'Gestion de usuarios' : 'User management',
          title: t(lang, 'admin.users.title'),
          description: t(lang, 'admin.users.subtitle'),
          icon: <FaUsers />,
          badgeLabel: isSpanish ? 'Usuarios' : 'Users',
        };
      case 'userDetail':
        return {
          eyebrow: isSpanish ? 'Perfil administrativo' : 'Admin profile view',
          title: isSpanish ? 'Detalle de usuario' : 'User detail',
          description: isSpanish
            ? 'Revisa y actualiza rol, estado, etiquetas y extras visibles del perfil.'
            : 'Review and update role, state, tags, and visible profile extras.',
          icon: <FaUsers />,
          badgeLabel: isSpanish ? 'Perfil' : 'Profile',
        };
      case 'badges':
        return {
          eyebrow: isSpanish ? 'Identidad del perfil' : 'Profile identity',
          title: isSpanish ? 'Badges' : 'Badges',
          description: isSpanish ? 'Crea y administra badges del perfil.' : 'Create and manage profile badges.',
          icon: <FaAward />,
          badgeLabel: isSpanish ? 'Badges' : 'Badges',
        };
      case 'products':
        return {
          eyebrow: isSpanish ? 'Catalogo de tienda' : 'Store catalog',
          title: t(lang, 'admin.products.title'),
          description: t(lang, 'admin.products.subtitle'),
          icon: <FaShoppingCart />,
          badgeLabel: isSpanish ? 'Tienda' : 'Store',
        };
      case 'coupons':
        return {
          eyebrow: isSpanish ? 'Descuentos del checkout' : 'Checkout discounts',
          title: isSpanish ? 'Cupones' : 'Coupons',
          description: isSpanish
            ? 'Crea, ajusta y controla cupones de descuento para la tienda.'
            : 'Create, tune, and control discount coupons for the store.',
          icon: <FaPercent />,
          badgeLabel: isSpanish ? 'Promociones' : 'Promotions',
        };
      case 'referrals':
        return {
          eyebrow: isSpanish ? 'Invitaciones y recompensas' : 'Invites and rewards',
          title: isSpanish ? 'Referidos' : 'Referrals',
          description: isSpanish
            ? 'Gestiona codigos personales, descuentos y automatizaciones de referidos.'
            : 'Manage personal codes, discounts, and referral automations.',
          icon: <FaUserFriends />,
          badgeLabel: isSpanish ? 'Referidos' : 'Referrals',
        };
      case 'loyalty':
        return {
          eyebrow: isSpanish ? 'Puntos y recompensas' : 'Points and rewards',
          title: t(lang, 'admin.menu.loyalty'),
          description: isSpanish
            ? 'Supervisa saldo, historico y envios manuales del sistema de loyalty.'
            : 'Monitor balances, history, and manual sends for the loyalty system.',
          icon: <FaAward />,
          badgeLabel: isSpanish ? 'Loyalty' : 'Loyalty',
        };
      case 'tickets':
        return {
          eyebrow: isSpanish ? 'Soporte y conversaciones' : 'Support and conversations',
          title: t(lang, 'admin.tickets.ticketsLabel'),
          description: t(lang, 'admin.tickets.headerDesc'),
          icon: <FaTicketAlt />,
          badgeLabel: isSpanish ? 'Soporte' : 'Support',
        };
      case 'applications':
        return {
          eyebrow: isSpanish ? 'Equipo y reclutamiento' : 'Team and recruiting',
          title: t(lang, 'admin.menu.applications'),
          description: isSpanish
            ? 'Revisa postulaciones, decide estados y conecta cada caso con su seguimiento.'
            : 'Review applications, decide statuses, and connect each case to follow-up.',
          icon: <FaClipboardList />,
          badgeLabel: isSpanish ? 'Staff' : 'Staff',
        };
      case 'applicationChat':
        return {
          eyebrow: isSpanish ? 'Seguimiento interno' : 'Internal follow-up',
          title: isSpanish ? 'Chat de postulacion' : 'Application chat',
          description: isSpanish
            ? 'Continua la conversacion con el candidato sin salir del panel admin.'
            : 'Continue the conversation with the candidate without leaving the admin panel.',
          icon: <FaComments />,
          badgeLabel: isSpanish ? 'Chat' : 'Chat',
        };
      case 'forum':
        return {
          eyebrow: isSpanish ? 'Moderacion de comunidad' : 'Community moderation',
          title: t(lang, 'admin.forum.title'),
          description: t(lang, 'admin.forum.subtitle'),
          icon: <FaComments />,
          badgeLabel: isSpanish ? 'Foro' : 'Forum',
        };
      case 'blog':
        return {
          eyebrow: isSpanish ? 'Contenido editorial' : 'Editorial content',
          title: t(lang, 'admin.menu.blog'),
          description: isSpanish
            ? 'Publica novedades, edita entradas y controla la visibilidad del blog.'
            : 'Publish updates, edit posts, and control blog visibility.',
          icon: <FaNewspaper />,
          badgeLabel: isSpanish ? 'Noticias' : 'News',
        };
      case 'partner':
        return {
          eyebrow: isSpanish ? 'Publicidad y alianzas' : 'Ads and partnerships',
          title: t(lang, 'admin.menu.partner'),
          description: isSpanish
            ? 'Aprueba anuncios, revisa reservas y administra la visibilidad partner.'
            : 'Approve ads, review bookings, and manage partner visibility.',
          icon: <FaShieldAlt />,
          badgeLabel: isSpanish ? 'Partner' : 'Partner',
        };
      case 'newsletter':
        return {
          eyebrow: isSpanish ? 'Envios y suscriptores' : 'Mailing and subscribers',
          title: 'Newsletter',
          description: isSpanish
            ? 'Gestiona suscriptores, automatizaciones y envios manuales de la newsletter.'
            : 'Manage subscribers, automations, and manual newsletter sends.',
          icon: <FaEnvelope />,
          badgeLabel: isSpanish ? 'Email' : 'Email',
        };
      case 'servicesStatus':
        return {
          eyebrow: isSpanish ? 'Monitorizacion tecnica' : 'Technical monitoring',
          title: isSpanish ? 'Estado de servicios' : 'Services status',
          description: isSpanish
            ? 'Configura el reporte automatico del estado de servicios y su webhook.'
            : 'Configure automatic service status reporting and its webhook.',
          icon: <FaHeartbeat />,
          badgeLabel: isSpanish ? 'Estado' : 'Status',
        };
      case 'logs':
        return {
          eyebrow: isSpanish ? 'Auditoria del panel' : 'Panel auditing',
          title: t(lang, 'admin.menu.logs'),
          description: isSpanish
            ? 'Consulta actividad administrativa, filtros de accion y trazabilidad del panel.'
            : 'Review admin activity, action filters, and panel traceability.',
          icon: <FaHistory />,
          badgeLabel: isSpanish ? 'Auditoria' : 'Audit',
        };
      case 'settings':
        return {
          eyebrow: isSpanish ? 'Configuracion del sitio' : 'Site configuration',
          title: t(lang, 'admin.settings.title'),
          description: t(lang, 'admin.settings.subtitle'),
          icon: <FaCog />,
          badgeLabel: isSpanish ? 'Sistema' : 'System',
        };
      case 'permissions':
        return {
          eyebrow: isSpanish ? 'Acceso administrativo' : 'Admin access',
          title: t(lang, 'admin.permissions.title'),
          description: t(lang, 'admin.permissions.subtitle'),
          icon: <FaKey />,
          badgeLabel: isSpanish ? 'Permisos' : 'Permissions',
        };
      default:
        return null;
    }
  })();

  const userName = session?.user?.name || session?.user?.email || '';

  const grouped = {
    main: menuItems.filter((m) => m.group === 'main' && canSee(m.key)),
    content: menuItems.filter((m) => m.group === 'content' && canSee(m.key)),
    system: menuItems.filter((m) => m.group === 'system' && canSee(m.key)),
  };

  const NavSection = ({
    title,
    items,
    onNavigate,
  }: {
    title: string;
    items: typeof menuItems;
    onNavigate?: () => void;
  }) => {
    if (!items.length) return null;
    return (
      <div className="mb-4">
        <div className="px-3 mb-2 text-[11px] tracking-wider text-gray-500 dark:text-gray-400 uppercase">{title}</div>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-colors border ${
                active
                  ? 'bg-minecraft-grass/10 border-minecraft-grass/20 text-gray-900 dark:bg-white/10 dark:border-white/10 dark:text-white'
                  : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              <span
                className={`h-9 w-9 grid place-items-center rounded-lg transition-colors ${
                  active
                    ? 'bg-minecraft-grass/15 text-minecraft-grass'
                    : 'bg-white border border-gray-200 text-gray-700 group-hover:bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:group-hover:bg-white/10'
                }`}
              >
                <Icon />
              </span>
              <span className="font-medium truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-[100dvh] md:flex relative overflow-hidden text-gray-900 dark:text-gray-100">
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-950" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-white/80 dark:from-gray-950/20 dark:via-gray-950/60 dark:to-gray-950" />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col border-r border-gray-200 dark:border-white/10 bg-white/75 dark:bg-gray-950/40 backdrop-blur-sm relative z-10 sticky top-0 h-screen">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-minecraft-grass">
              <FaShieldAlt />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-600 dark:text-gray-400 leading-none">{t(lang, 'admin.panel.title')}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white truncate">{t(lang, 'admin.panel.subtitle')}</div>
            </div>
          </div>
        </div>

        <nav className="px-2 pb-4 overflow-y-auto flex-1">
          <NavSection title={t(lang, 'admin.menuGroups.main')} items={grouped.main} />
          <NavSection title={t(lang, 'admin.menuGroups.content')} items={grouped.content} />
          <NavSection title={t(lang, 'admin.menuGroups.system')} items={grouped.system} />

          {role === 'OWNER' && (
            <div className="mt-3">
              <div className="px-3 mb-2 text-[11px] tracking-wider text-gray-500 uppercase">
                {t(lang, 'admin.menu.permissions')}
              </div>
              <Link
                href="/admin/permisos"
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-colors border ${
                  isActive('/admin/permisos')
                    ? 'bg-minecraft-grass/10 border-minecraft-grass/20 text-gray-900 dark:bg-white/10 dark:border-white/10 dark:text-white'
                    : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                <span
                  className={`h-9 w-9 grid place-items-center rounded-lg transition-colors ${
                    isActive('/admin/permisos')
                      ? 'bg-minecraft-grass/15 text-minecraft-grass'
                      : 'bg-white border border-gray-200 text-gray-700 group-hover:bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:group-hover:bg-white/10'
                  }`}
                >
                  <FaKey />
                </span>
                <span className="font-medium truncate">{t(lang, 'admin.menu.permissions')}</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="mt-auto px-5 py-4 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'user.adminPanel')}</div>
              <div className="text-sm text-gray-900 dark:text-gray-200 truncate">{userName}</div>
            </div>
            {role && (
              <div className="shrink-0">
                <Badge variant={role === 'OWNER' ? 'success' : role === 'ADMIN' ? 'info' : 'default'}>{role}</Badge>
              </div>
            )}
          </div>

          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white mt-4">
            <FaHome />
            <span>{t(lang, 'nav.home')}</span>
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label={t(lang, 'common.close')}
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[88vw] max-w-[360px] bg-white/95 dark:bg-gray-950/95 backdrop-blur border-r border-gray-200 dark:border-white/10 overflow-y-auto">
            <div className="p-4 flex items-start justify-between gap-3 border-b border-gray-200 dark:border-white/10">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'admin.panel.title')}</div>
                <div className="text-lg font-bold leading-tight">
                  <span className="block text-gray-900 dark:text-transparent dark:bg-gradient-to-r dark:from-minecraft-grass dark:via-minecraft-diamond dark:to-minecraft-grass dark:bg-clip-text">
                    {t(lang, 'admin.panel.subtitle')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10"
                aria-label={t(lang, 'common.close')}
              >
                <FaTimes />
              </button>
            </div>

            <nav className="px-2 py-3">
              <NavSection title={t(lang, 'admin.menuGroups.main')} items={grouped.main} onNavigate={() => setSidebarOpen(false)} />
              <NavSection title={t(lang, 'admin.menuGroups.content')} items={grouped.content} onNavigate={() => setSidebarOpen(false)} />
              <NavSection title={t(lang, 'admin.menuGroups.system')} items={grouped.system} onNavigate={() => setSidebarOpen(false)} />

              {role === 'OWNER' && (
                <div className="mt-3">
                  <div className="px-3 mb-2 text-[11px] tracking-wider text-gray-500 uppercase">
                    {t(lang, 'admin.menu.permissions')}
                  </div>
                  <Link
                    href="/admin/permisos"
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-colors border border-transparent border-l-2 ${
                      isActive('/admin/permisos')
                        ? 'bg-gray-100 border-gray-200 border-l-minecraft-grass text-gray-900 dark:bg-white/10 dark:border-white/10 dark:text-white'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-transparent hover:border-l-gray-200 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white dark:hover:border-l-white/10'
                    }`}
                  >
                    <span
                      className={`h-9 w-9 grid place-items-center rounded-lg transition-colors ${
                        isActive('/admin/permisos')
                          ? 'bg-minecraft-grass/15 text-minecraft-grass'
                          : 'bg-white border border-gray-200 text-gray-700 group-hover:bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:group-hover:bg-white/10'
                      }`}
                    >
                      <FaKey />
                    </span>
                    <span className="font-medium truncate">{t(lang, 'admin.menu.permissions')}</span>
                  </Link>
                </div>
              )}
            </nav>

            <div className="px-4 py-5 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'user.adminPanel')}</div>
                  <div className="text-sm text-gray-900 dark:text-gray-200 truncate">{userName}</div>
                </div>
                {role && (
                  <div className="shrink-0">
                    <Badge variant={role === 'OWNER' ? 'success' : role === 'ADMIN' ? 'info' : 'default'}>{role}</Badge>
                  </div>
                )}
              </div>
              <Link href="/" onClick={() => setSidebarOpen(false)} className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white mt-3">
                <FaHome />
                <span>{t(lang, 'nav.home')}</span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10 h-[100dvh] overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white/75 dark:bg-gray-950/55 backdrop-blur border-b border-gray-200 dark:border-white/10">
          <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10"
                aria-label={t(lang, 'admin.panel.title')}
              >
                <FaBars />
              </button>
              <div className="min-w-0">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'admin.panel.title')}</div>
                <div className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">{activeLabel}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-1 py-1 dark:bg-white/5 dark:border-white/10">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              <Link
                href="/"
                aria-label={t(lang, 'nav.home')}
                className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10"
              >
                <FaHome />
              </Link>

              <div className="hidden sm:flex items-center gap-2">
                <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10">
                  <div className="text-xs text-gray-600 dark:text-gray-400 leading-none">{t(lang, 'user.adminPanel')}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-sm text-gray-900 dark:text-gray-200 max-w-[240px] truncate">{userName}</div>
                    {role && (
                      <Badge variant={role === 'OWNER' ? 'success' : role === 'ADMIN' ? 'info' : 'default'}>{role}</Badge>
                    )}
                  </div>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10"
                >
                  <FaHome />
                  <span>{t(lang, 'nav.home')}</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {currentSectionKey !== 'license' && sectionBannerMeta ? (
              <AdminSectionBanner
                eyebrow={sectionBannerMeta.eyebrow}
                title={sectionBannerMeta.title}
                description={sectionBannerMeta.description}
                icon={sectionBannerMeta.icon}
                badgeLabel={sectionBannerMeta.badgeLabel}
              />
            ) : null}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
