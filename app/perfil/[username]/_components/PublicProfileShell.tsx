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

function InnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { usernameParam, profile, loading, setProfile } = usePublicProfile();
  const lang = useClientLang();
  const [followLoading, setFollowLoading] = useState(false);

  const tabs = useMemo(
    () => [
      { href: `/perfil/${encodeURIComponent(usernameParam)}`, label: t(lang, 'profile.nav.overview') },
      { href: `/perfil/${encodeURIComponent(usernameParam)}/actividad`, label: t(lang, 'profile.nav.activity') },
    ],
    [lang, usernameParam]
  );

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
  const avatarUrl = String(profile.avatar || '');
  const bannerUrl = String((profile as any).banner || '');
  const verified = Boolean((profile as any).verified);

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
            <div className="w-20 h-20 rounded-full border-4 border-gray-950 bg-gray-900 flex items-center justify-center">
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
                  <span className="text-white font-bold">{initials(profile.username)}</span>
                </div>
              )}
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
                  <span className="truncate">{profile.username}</span>
                  {verified ? (
                    <FaCheckCircle className="text-blue-400 shrink-0 text-lg relative top-px" title="Verificado" />
                  ) : null}
                </div>
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
                  <div className="text-white font-bold text-lg">{profile.followersCount ?? 0}</div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900/30 px-4 py-2">
                  <div className="text-xs text-gray-400">{t(lang, 'profile.following')}</div>
                  <div className="text-white font-bold text-lg">{profile.followingCount ?? 0}</div>
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
