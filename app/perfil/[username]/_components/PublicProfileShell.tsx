'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FaArrowLeft, FaCheckCircle, FaUser } from 'react-icons/fa';
import { Badge, Button } from '@/components/ui';
import { type Lang, t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { formatSocialCount } from '@/lib/utils';
import { PublicProfileProvider, usePublicProfile } from './public-profile-context';
import { toast } from 'react-toastify';

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

function normalizeBadgeId(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

function getPresenceDotClasses(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'busy') return 'bg-red-500';
  if (s === 'online') return 'bg-green-500';
  if (s === 'invisible') return 'bg-transparent border border-gray-400/70';
  return 'bg-gray-500';
}

type PublicBadgeItem = {
  slug: string;
  labelEs?: string;
  labelEn?: string;
  icon: string;
  enabled: boolean;
};

function InnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { usernameParam, profile, loading, setProfile } = usePublicProfile();
  const lang = useClientLang();
  const [followLoading, setFollowLoading] = useState(false);

  const [badgeCatalog, setBadgeCatalog] = useState<PublicBadgeItem[]>([]);
  const badgeBySlug = useMemo(() => {
    const m = new Map<string, PublicBadgeItem>();
    for (const b of badgeCatalog) {
      const key = normalizeBadgeId(b.slug);
      if (key) m.set(key, b);
    }
    return m;
  }, [badgeCatalog]);

  const tabs = useMemo(
    () => [
      { href: `/perfil/${encodeURIComponent(usernameParam)}`, label: t(lang, 'profile.nav.overview') },
      { href: `/perfil/${encodeURIComponent(usernameParam)}/actividad`, label: t(lang, 'profile.nav.activity') },
    ],
    [lang, usernameParam]
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/badges', { cache: 'no-store' });
        const data = await res.json().catch(() => ([]));
        if (!res.ok) return;
        setBadgeCatalog(Array.isArray(data) ? (data as PublicBadgeItem[]) : []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const getLegacyBadgeMeta = (id: string) => {
    const badgeId = normalizeBadgeId(id);
    switch (badgeId) {
      case 'partner':
        return { label: t(lang, 'profile.badges.partner'), icon: '/badges/partner.png' };
      case 'active_developer':
        return { label: t(lang, 'profile.badges.activeDeveloper'), icon: '/badges/active_developer.png' };
      case 'bug_hunter':
        return { label: t(lang, 'profile.badges.bugHunter'), icon: '/badges/bug_hunter.png' };
      case 'staff':
        return { label: t(lang, 'profile.badges.staff'), icon: '/badges/staff.png' };
      default:
        return null;
    }
  };

  const toggleFollow = async () => {
    if (!profile) return;
    if (!session) {
      toast.info(t(lang, 'forum.loginToPost'));
      return;
    }
    if (profile.isSelf) return;

    setFollowLoading(true);
    try {
      const res = await fetch(`/api/follows/${encodeURIComponent(profile.username)}`, {
        method: profile.isFollowing ? 'DELETE' : 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      const followersCount =
        typeof (data as any).followersCount === 'number' ? (data as any).followersCount : profile.followersCount;

      setProfile({
        ...profile,
        isFollowing: !profile.isFollowing,
        followersCount,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="text-white text-xl">{t(lang, 'common.loading')}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="text-gray-300 text-lg">{t(lang, 'forum.notFound')}</div>
      </div>
    );
  }

  const tags = Array.isArray(profile.tags) ? profile.tags : [];
  const badges = Array.isArray((profile as any).badges) ? (((profile as any).badges as string[]) || []) : [];
  const avatarUrl = String(profile.avatar || '');
  const bannerUrl = String((profile as any).banner || '');
  const verified = Boolean((profile as any).verified);
  const displayName = String((profile as any).displayName || '');
  const titleName = displayName || profile.username;
  const presenceStatus = String((profile as any)?.presence?.status || 'offline');

  const presenceLabel =
    presenceStatus === 'online'
      ? t(lang, 'profile.presence.online')
      : presenceStatus === 'busy'
        ? t(lang, 'profile.presence.busy')
        : t(lang, 'profile.presence.offline');

  return (
    <div className="min-h-screen pt-20 pb-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="rounded-xl border border-white/10 bg-gray-950/40 overflow-hidden">
        <div className="relative h-28 sm:h-36">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt="Banner"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover opacity-70"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-minecraft-grass/20 via-gray-950/40 to-minecraft-diamond/20" />
        </div>

        <div className="relative px-4 sm:px-6 pb-5">
          <div className="absolute -top-10 left-4 sm:left-6">
            <div className="relative w-20 h-20 rounded-full border-4 border-gray-950 bg-gray-900 flex items-center justify-center">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-minecraft-grass/30 flex items-center justify-center">
                  <span className="text-white font-bold">{initials(titleName)}</span>
                </div>
              )}

              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-gray-950 bg-gray-950 flex items-center justify-center">
                <span className={`w-3 h-3 rounded-full ${getPresenceDotClasses(presenceStatus)}`} />
              </span>
            </div>
          </div>

          <div className="pt-4 flex items-start justify-end gap-2">
            <Button variant="secondary" className="gap-2" onClick={() => router.push('/foro')}
            >
              <FaArrowLeft />
              <span>Foro</span>
            </Button>
            {profile.isSelf ? (
              <Link href="/perfil">
                <Button className="gap-2">
                  <FaUser />
                  <span>Mi perfil</span>
                </Button>
              </Link>
            ) : (
              <Button onClick={toggleFollow} disabled={followLoading}>
                {profile.isFollowing ? 'Dejar de seguir' : 'Seguir'}
              </Button>
            )}
          </div>

          <div className="mt-10 sm:mt-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-bold text-white truncate inline-flex items-center gap-2">
                  <span className="truncate">{titleName}</span>
                  {verified ? (
                    <FaCheckCircle className="text-blue-400 shrink-0 text-lg relative top-px" title="Verificado" />
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    {badges.map((badgeId) => {
                      const id = normalizeBadgeId(badgeId);
                      const fromDb = badgeBySlug.get(id);
                      const label = fromDb ? ((lang === 'es' ? fromDb.labelEs : fromDb.labelEn) || fromDb.slug) : null;
                      const icon = fromDb?.icon || null;
                      const legacy = !fromDb ? getLegacyBadgeMeta(id) : null;
                      const finalLabel = label || legacy?.label;
                      const finalIcon = icon || legacy?.icon;
                      if (!finalLabel || !finalIcon) return null;
                      return (
                        <span key={badgeId} title={finalLabel} className="inline-flex items-center justify-center">
                          <img src={finalIcon} alt={finalLabel} width={16} height={16} className="shrink-0" />
                          <span className="sr-only">{finalLabel}</span>
                        </span>
                      );
                    })}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-300 truncate">@{profile.username}</div>
                <div className="mt-1 text-xs text-gray-400">{t(lang, 'profile.presence.label')}: {presenceLabel}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {getRoleBadge(profile.role, lang)}
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
                  <div className="text-white font-bold text-lg">
                    {formatSocialCount(Number(profile.followersCount ?? 0), lang === 'es' ? 'es-ES' : 'en-US')}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900/30 px-4 py-2">
                  <div className="text-xs text-gray-400">{t(lang, 'profile.following')}</div>
                  <div className="text-white font-bold text-lg">
                    {formatSocialCount(Number(profile.followingCount ?? 0), lang === 'es' ? 'es-ES' : 'en-US')}
                  </div>
                </div>
              </div>
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

export default function PublicProfileShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  return (
    <PublicProfileProvider username={username}>
      <InnerShell>{children}</InnerShell>
    </PublicProfileProvider>
  );
}
