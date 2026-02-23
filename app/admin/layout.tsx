'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  FaBars,
  FaClipboardList,
  FaCog,
  FaComments,
  FaHistory,
  FaHome,
  FaKey,
  FaNewspaper,
  FaShieldAlt,
  FaShoppingCart,
  FaTicketAlt,
  FaTimes,
  FaUsers,
} from 'react-icons/fa';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { Badge } from '@/components/ui';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const { data: session } = useSession();

  const [lang, setLang] = useState<Lang>('es');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

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
    { key: 'products', name: t(lang, 'admin.menu.products'), href: '/admin/products', icon: FaShoppingCart, group: 'main' },
    { key: 'tickets', name: t(lang, 'admin.menu.tickets'), href: '/admin/tickets', icon: FaTicketAlt, group: 'main' },
    { key: 'applications', name: t(lang, 'admin.menu.applications'), href: '/admin/postulaciones', icon: FaClipboardList, group: 'main' },
    { key: 'forum', name: t(lang, 'admin.menu.forum'), href: '/admin/foro', icon: FaComments, group: 'content' },
    { key: 'blog', name: t(lang, 'admin.menu.blog'), href: '/admin/blog', icon: FaNewspaper, group: 'content' },
    { key: 'partner', name: t(lang, 'admin.menu.partner'), href: '/admin/partner', icon: FaShieldAlt, group: 'content' },
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
    <div className="min-h-screen md:flex relative overflow-hidden text-gray-900 dark:text-gray-100">
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-950" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-white/80 dark:from-gray-950/20 dark:via-gray-950/60 dark:to-gray-950" />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col border-r border-gray-200 dark:border-white/10 bg-white/75 dark:bg-gray-950/40 backdrop-blur-sm relative z-10">
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

        <nav className="px-2 pb-4 overflow-y-auto">
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
      <div className="flex-1 min-w-0 relative z-10">
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
        </header>

        <main className="p-4 md:p-8">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
