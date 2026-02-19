'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FaBars, FaClipboardList, FaCog, FaComments, FaHistory, FaHome, FaKey, FaNewspaper, FaShoppingCart, FaTicketAlt, FaTimes, FaUsers } from 'react-icons/fa';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  const menuItems = [
    { key: 'dashboard', name: t(lang, 'admin.menu.dashboard'), href: '/admin', icon: FaHome },
    { key: 'users', name: t(lang, 'admin.menu.users'), href: '/admin/users', icon: FaUsers },
    { key: 'products', name: t(lang, 'admin.menu.products'), href: '/admin/products', icon: FaShoppingCart },
    { key: 'tickets', name: t(lang, 'admin.menu.tickets'), href: '/admin/tickets', icon: FaTicketAlt },
    { key: 'forum', name: t(lang, 'admin.menu.forum'), href: '/admin/foro', icon: FaComments },
    { key: 'blog', name: t(lang, 'admin.menu.blog'), href: '/admin/blog', icon: FaNewspaper },
    { key: 'applications', name: t(lang, 'admin.menu.applications'), href: '/admin/postulaciones', icon: FaClipboardList },
    { key: 'logs', name: t(lang, 'admin.menu.logs'), href: '/admin/logs', icon: FaHistory },
    { key: 'settings', name: t(lang, 'admin.menu.settings'), href: '/admin/settings', icon: FaCog },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 bg-gray-950/60 backdrop-blur-sm border-r border-white/10 fixed h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-2">{t(lang, 'admin.panel.title')}</h2>
          <p className="text-gray-400 text-sm">{t(lang, 'admin.panel.subtitle')}</p>
        </div>

        <nav className="px-4 pb-4">
          {menuItems.filter((item) => canSee(item.key)).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-md mb-1 transition-colors ${
                  isActive(item.href)
                    ? 'bg-minecraft-grass text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {role === 'OWNER' && (
            <Link
              href="/admin/permisos"
              className={`flex items-center space-x-3 px-4 py-3 rounded-md mb-1 transition-colors ${
                isActive('/admin/permisos')
                  ? 'bg-minecraft-grass text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <FaKey />
              <span>{t(lang, 'admin.menu.permissions')}</span>
            </Link>
          )}
        </nav>
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
          <aside className="absolute left-0 top-0 h-full w-64 bg-gray-950/95 border-r border-white/10 overflow-y-auto">
            <div className="p-4 flex items-start justify-between gap-3 border-b border-white/10">
              <div>
                <div className="text-xl font-bold text-white">{t(lang, 'admin.panel.title')}</div>
                <div className="text-xs text-gray-400">{t(lang, 'admin.panel.subtitle')}</div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10"
                aria-label={t(lang, 'common.close')}
              >
                <FaTimes />
              </button>
            </div>

            <nav className="px-3 py-3">
              {menuItems.filter((item) => canSee(item.key)).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-md mb-1 transition-colors ${
                      isActive(item.href)
                        ? 'bg-minecraft-grass text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {role === 'OWNER' && (
                <Link
                  href="/admin/permisos"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-md mb-1 transition-colors ${
                    isActive('/admin/permisos')
                      ? 'bg-minecraft-grass text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <FaKey />
                  <span>{t(lang, 'admin.menu.permissions')}</span>
                </Link>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="md:hidden p-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10"
            aria-label={t(lang, 'admin.menu.dashboard')}
          >
            <FaBars />
            <span>{t(lang, 'admin.panel.title')}</span>
          </button>
        </div>

        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
