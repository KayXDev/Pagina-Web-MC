'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { FaCheckCircle, FaCog, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { Badge, Button } from '@/components/ui';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { ProfileProvider, useProfile } from './profile-context';

function initials(name: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  const a = parts[0]?.[0] || 'U';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (a + b).toUpperCase();
}

function getRoleBadge(role: string, lang: Lang) {
  switch (role) {
    case 'OWNER':
      return <Badge variant="danger">{t(lang, 'profile.roleLabel.owner')}</Badge>;
    case 'ADMIN':
      return <Badge variant="danger">{t(lang, 'profile.roleLabel.admin')}</Badge>;
    case 'STAFF':
      return <Badge variant="warning">{t(lang, 'profile.roleLabel.staff')}</Badge>;
    default:
      return <Badge variant="default">{t(lang, 'profile.roleLabel.user')}</Badge>;
  }
}

function getTagVariant(tag: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  const upper = tag.toUpperCase();
  if (upper.includes('OWNER') || upper.includes('DUEÑO') || upper.includes('FOUNDER') || upper.includes('FUNDADOR')) {
    return 'danger';
  }
  if (upper.includes('STAFF') || upper.includes('MOD')) {
    return 'warning';
  }
  return 'info';
}

function InnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, status, details, loadingDetails } = useProfile();
  const [lang, setLang] = useState<Lang>('es');

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const tabs = useMemo(
    () => [
      { href: '/perfil', label: t(lang, 'profile.nav.overview') },
      { href: '/perfil/actividad', label: t(lang, 'profile.nav.activity') },
      { href: '/perfil/ajustes', label: t(lang, 'profile.nav.settings') },
    ],
    [lang]
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="text-white text-xl">{t(lang, 'profile.loading')}</div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) return null;

  const name = String(session.user?.name || '');
  const role = String(session.user?.role || 'USER');
  const tags: string[] = Array.isArray(session.user?.tags) ? session.user.tags : [];

  const avatarUrl = String(details?.avatar || session.user?.avatar || '');
  const bannerUrl = String((details as any)?.banner || (session.user as any)?.banner || '');
  const verified = Boolean((details as any)?.verified || (session.user as any)?.verified);

  const followers = loadingDetails ? null : details?.followersCount ?? 0;
  const following = loadingDetails ? null : details?.followingCount ?? 0;

  return (
    <div className="min-h-screen pt-20 pb-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="rounded-xl border border-white/10 bg-gray-950/40 overflow-hidden">
        <div className="relative h-28 sm:h-36">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Banner"
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-minecraft-grass/20 via-gray-950/40 to-minecraft-diamond/20" />
        </div>

        <div className="relative px-4 sm:px-6 pb-5">
          <div className="absolute -top-10 left-4 sm:left-6">
            <div className="w-20 h-20 rounded-full border-4 border-gray-950 bg-gray-900 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-minecraft-grass/30 flex items-center justify-center">
                  <span className="text-white font-bold">{initials(name)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex items-start justify-end gap-2">
            <Link href="/perfil/ajustes">
              <Button variant="secondary" className="gap-2">
                <FaCog />
                <span>{t(lang, 'profile.nav.settings')}</span>
              </Button>
            </Link>
            <Button
              variant="secondary"
              className="gap-2 text-red-400"
              onClick={() => {
                signOut();
              }}
            >
              <FaSignOutAlt />
              <span>{t(lang, 'profile.signOut')}</span>
            </Button>
          </div>

          <div className="mt-10 sm:mt-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-bold text-white truncate inline-flex items-center gap-2">
                  <span className="truncate">{name}</span>
                  {verified ? (
                    <FaCheckCircle className="text-blue-400 shrink-0 text-lg relative top-px" title="Verificado" />
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {getRoleBadge(role, lang)}
                  {tags.map((tag) => (
                    <Badge key={tag} variant={getTagVariant(tag)}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-gray-800 bg-gray-900/30 px-4 py-2">
                  <div className="text-xs text-gray-400">{t(lang, 'profile.followers')}</div>
                  <div className="text-white font-bold text-lg">{followers === null ? t(lang, 'common.loading') : followers}</div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900/30 px-4 py-2">
                  <div className="text-xs text-gray-400">{t(lang, 'profile.following')}</div>
                  <div className="text-white font-bold text-lg">{following === null ? t(lang, 'common.loading') : following}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
              <FaUser className="text-minecraft-grass" />
              <span className="truncate">{session.user?.email}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-minecraft-grass text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function ProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <InnerShell>{children}</InnerShell>
    </ProfileProvider>
  );
}
