'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaBan,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaSave,
  FaSyncAlt,
  FaTrash,
  FaUser,
} from 'react-icons/fa';

import { Badge, Button, Card, Input, Select } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { formatDateTime } from '@/lib/utils';

type AdminUser = {
  _id: string;
  username: string;
  email: string;
  role: 'USER' | 'STAFF' | 'ADMIN' | 'OWNER';
  badges?: string[];
  tags?: string[];
  verified?: boolean;
  isBanned: boolean;
  bannedReason?: string;
  followersCountOverride?: number | null;
  followingCountOverride?: number | null;
  createdAt: string;
};

type BadgeCatalogItem = {
  slug: string;
  labelEs?: string;
  labelEn?: string;
  icon: string;
  enabled: boolean;
};

function normalizeBadgeId(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

function getRoleBadge(role: AdminUser['role']) {
  switch (role) {
    case 'OWNER':
      return <Badge variant="danger">OWNER</Badge>;
    case 'ADMIN':
      return <Badge variant="danger">ADMIN</Badge>;
    case 'STAFF':
      return <Badge variant="warning">STAFF</Badge>;
    default:
      return <Badge variant="default">USER</Badge>;
  }
}

export default function AdminUserDetailPage() {
  const { data: session } = useSession();
  const lang = useClientLang();
  const router = useRouter();
  const params = useParams<{ userId: string }>();

  const userId = useMemo(() => {
    const raw = (params as any)?.userId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const isOwner = session?.user?.role === 'OWNER';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  const [badgeCatalog, setBadgeCatalog] = useState<BadgeCatalogItem[]>([]);

  const badgeBySlug = useMemo(() => {
    const m = new Map<string, BadgeCatalogItem>();
    for (const b of badgeCatalog) {
      const key = normalizeBadgeId(b.slug);
      if (key) m.set(key, b);
    }
    return m;
  }, [badgeCatalog]);

  const selectableBadges = useMemo(() => {
    return badgeCatalog
      .filter((b) => b && b.enabled)
      .slice()
      .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
  }, [badgeCatalog]);

  // Draft fields
  const [usernameDraft, setUsernameDraft] = useState('');
  const [roleDraft, setRoleDraft] = useState<AdminUser['role']>('USER');
  const [bannedReasonDraft, setBannedReasonDraft] = useState('');
  const [followersExtraDraft, setFollowersExtraDraft] = useState('');
  const [followingExtraDraft, setFollowingExtraDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [badgesDraft, setBadgesDraft] = useState<string[]>([]);

  const syncDraftFromUser = (u: AdminUser) => {
    setUsernameDraft(u.username || '');
    setRoleDraft(u.role || 'USER');
    setBannedReasonDraft(String(u.bannedReason || ''));
    setFollowersExtraDraft(typeof u.followersCountOverride === 'number' ? String(u.followersCountOverride) : '');
    setFollowingExtraDraft(typeof u.followingCountOverride === 'number' ? String(u.followingCountOverride) : '');
    setTagsDraft(Array.isArray(u.tags) ? u.tags : []);
    setBadgesDraft(Array.isArray(u.badges) ? u.badges.map((b) => normalizeBadgeId(b)) : []);
  };

  const fetchBadgeCatalog = async () => {
    try {
      const res = await fetch('/api/admin/badges', { cache: 'no-store' });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) return;
      setBadgeCatalog(Array.isArray(data) ? (data as BadgeCatalogItem[]) : []);
    } catch {
      // ignore catalog errors; page still usable
    }
  };

  const fetchUser = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      const u = data as AdminUser;
      setUser(u);
      syncDraftFromUser(u);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
      router.push('/admin/users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    fetchBadgeCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchUser = async (updates: Record<string, any>) => {
    if (!userId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error al actualizar usuario' : 'Error updating user'));
      const next = data as AdminUser;
      setUser((prev) => (prev ? { ...prev, ...next } : next));
      if (next) syncDraftFromUser({ ...(user as any), ...(next as any) } as AdminUser);
      toast.success(lang === 'es' ? 'Usuario actualizado' : 'User updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : lang === 'es' ? 'Error al actualizar usuario' : 'Error updating user');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!userId) return;
    const ok = window.confirm(lang === 'es' ? '¿Eliminar este usuario?' : 'Delete this user?');
    if (!ok) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error al eliminar usuario' : 'Error deleting user'));
      toast.success(lang === 'es' ? 'Usuario eliminado' : 'User deleted');
      router.push('/admin/users');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : lang === 'es' ? 'Error al eliminar usuario' : 'Error deleting user');
    }
  };

  const toggleBadge = (badgeId: string) => {
    const id = normalizeBadgeId(badgeId);
    setBadgesDraft((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const addTag = () => {
    const next = String(tagInput || '').trim();
    if (!next) return;
    setTagsDraft((prev) => Array.from(new Set([...prev, next])).slice(0, 20));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTagsDraft((prev) => prev.filter((t) => t !== tag));
  };

  if (loading || !user) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="px-4 py-6 text-gray-700 dark:text-gray-300">{t(lang, 'common.loading')}</div>
        </Card>
      </div>
    );
  }

  const canEditOwnerAccount = isOwner;
  const isProtectedOwner = user.role === 'OWNER' && !canEditOwnerAccount;

  const statusBadge = user.isBanned ? (
    <Badge variant="danger">{lang === 'es' ? 'Baneado' : 'Banned'}</Badge>
  ) : (
    <Badge variant="success">{lang === 'es' ? 'Activo' : 'Active'}</Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => router.push('/admin/users')} className="gap-2">
            <FaArrowLeft />
            <span>{lang === 'es' ? 'Usuarios' : 'Users'}</span>
          </Button>
          <Link href={`/perfil/${encodeURIComponent(user.username)}`} target="_blank" className="inline-flex">
            <Button type="button" variant="secondary" className="gap-2">
              <FaExternalLinkAlt />
              <span>{lang === 'es' ? 'Ver perfil' : 'View profile'}</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={fetchUser} disabled={refreshing} className="gap-2">
            <FaSyncAlt />
            <span>{refreshing ? t(lang, 'common.loading') : t(lang, 'admin.dashboard.refresh')}</span>
          </Button>
          {isOwner ? (
            <Button type="button" variant="secondary" onClick={deleteUser} className="gap-2 text-red-500" disabled={saving || isProtectedOwner}>
              <FaTrash />
              <span>{t(lang, 'common.delete')}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-900 font-semibold shrink-0 dark:bg-white/5 dark:border-white/10 dark:text-white">
              <FaUser />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[520px]">@{user.username}</div>
                {user.verified ? (
                  <span className="inline-flex items-center gap-2">
                    <Badge variant="info">{lang === 'es' ? 'Verificado' : 'Verified'}</Badge>
                    {Array.isArray(user.badges)
                      ? user.badges.slice(0, 6).map((b) => {
                          const id = normalizeBadgeId(b);
                          const meta = badgeBySlug.get(id);
                          if (!meta || !meta.icon) return null;
                          const label = (lang === 'es' ? meta.labelEs : meta.labelEn) || meta.slug;
                          return (
                            <span key={id} className="inline-flex items-center justify-center" title={label}>
                              <img
                                src={meta.icon}
                                alt={label}
                                width={16}
                                height={16}
                                className={"shrink-0 " + (meta.enabled ? '' : 'opacity-50')}
                              />
                            </span>
                          );
                        })
                      : null}
                  </span>
                ) : null}
                {getRoleBadge(user.role)}
                {statusBadge}
                {isProtectedOwner ? <Badge variant="default">LOCKED</Badge> : null}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 break-all">{user.email}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {lang === 'es' ? 'Creado:' : 'Created:'} {formatDateTime(user.createdAt, lang === 'es' ? 'es-ES' : 'en-US')}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="px-4 py-4 border-b border-gray-200 dark:border-white/10">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{lang === 'es' ? 'Identidad' : 'Identity'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{lang === 'es' ? 'Username y rol' : 'Username and role'}</div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="text-xs text-gray-700 dark:text-gray-400 mb-2">Username</div>
              <div className="flex items-center gap-2">
                <Input value={usernameDraft} onChange={(e) => setUsernameDraft(e.target.value)} disabled={saving || isProtectedOwner} />
                <Button
                  type="button"
                  onClick={() => patchUser({ username: usernameDraft })}
                  disabled={saving || isProtectedOwner}
                  className="gap-2"
                >
                  <FaSave />
                  <span>{t(lang, 'common.save')}</span>
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-700 dark:text-gray-400 mb-2">{t(lang, 'admin.users.thRole')}</div>
              <div className="flex items-center gap-2">
                <Select
                  value={roleDraft}
                  onChange={(e) => setRoleDraft(e.target.value as AdminUser['role'])}
                  disabled={saving || isProtectedOwner}
                >
                  <option value="USER">USER</option>
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                  {isOwner ? <option value="OWNER">OWNER</option> : null}
                </Select>
                <Button type="button" onClick={() => patchUser({ role: roleDraft })} disabled={saving || isProtectedOwner} className="gap-2">
                  <FaSave />
                  <span>{t(lang, 'common.save')}</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="px-4 py-4 border-b border-gray-200 dark:border-white/10">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{lang === 'es' ? 'Estado' : 'Status'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{lang === 'es' ? 'Verificado y ban' : 'Verified and ban'}</div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {isOwner ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => patchUser({ verified: !Boolean(user.verified) })}
                  disabled={saving || isProtectedOwner}
                  className="gap-2"
                >
                  <FaCheckCircle />
                  <span>{Boolean(user.verified) ? (lang === 'es' ? 'Quitar verificado' : 'Unverify') : (lang === 'es' ? 'Verificar' : 'Verify')}</span>
                </Button>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                onClick={() => patchUser({ isBanned: !user.isBanned })}
                disabled={saving || isProtectedOwner}
                className={"gap-2 " + (user.isBanned ? 'text-minecraft-grass' : 'text-red-500')}
              >
                <FaBan />
                <span>{user.isBanned ? (lang === 'es' ? 'Desbanear' : 'Unban') : lang === 'es' ? 'Banear' : 'Ban'}</span>
              </Button>
            </div>

            <div>
              <div className="text-xs text-gray-700 dark:text-gray-400 mb-2">{lang === 'es' ? 'Motivo de ban (opcional)' : 'Ban reason (optional)'}</div>
              <div className="flex items-center gap-2">
                <Input
                  value={bannedReasonDraft}
                  onChange={(e) => setBannedReasonDraft(e.target.value)}
                  disabled={saving || isProtectedOwner}
                  placeholder={lang === 'es' ? 'Ej: spam' : 'e.g. spam'}
                />
                <Button type="button" onClick={() => patchUser({ bannedReason: bannedReasonDraft })} disabled={saving || isProtectedOwner} className="gap-2">
                  <FaSave />
                  <span>{t(lang, 'common.save')}</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="px-4 py-4 border-b border-gray-200 dark:border-white/10">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{lang === 'es' ? 'Social' : 'Social'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{lang === 'es' ? 'Overrides extra (+) de followers/following' : 'Extra overrides (+) for followers/following'}</div>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-700 dark:text-gray-400 mb-2">+ Followers</div>
                <Input
                  type="number"
                  min={0}
                  value={followersExtraDraft}
                  onChange={(e) => setFollowersExtraDraft(e.target.value)}
                  disabled={!isOwner || saving || isProtectedOwner}
                  placeholder="0"
                />
              </div>
              <div>
                <div className="text-xs text-gray-700 dark:text-gray-400 mb-2">+ Following</div>
                <Input
                  type="number"
                  min={0}
                  value={followingExtraDraft}
                  onChange={(e) => setFollowingExtraDraft(e.target.value)}
                  disabled={!isOwner || saving || isProtectedOwner}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() =>
                  patchUser({
                    followersCountOverride: followersExtraDraft.trim() ? Number(followersExtraDraft) : null,
                    followingCountOverride: followingExtraDraft.trim() ? Number(followingExtraDraft) : null,
                  })
                }
                disabled={!isOwner || saving || isProtectedOwner}
                className="gap-2"
              >
                <FaSave />
                <span>{t(lang, 'common.save')}</span>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="px-4 py-4 border-b border-gray-200 dark:border-white/10">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'admin.users.thTags')}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{lang === 'es' ? 'Etiquetas visibles en el perfil' : 'Profile tags'}</div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {tagsDraft.length ? (
                tagsDraft.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700 text-xs dark:bg-white/5 dark:border-white/10 dark:text-gray-200"
                  >
                    {tag}
                    {isOwner ? (
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                        onClick={() => removeTag(tag)}
                        disabled={saving || isProtectedOwner}
                        aria-label="Remove tag"
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                ))
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400">{lang === 'es' ? 'Sin tags' : 'No tags'}</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                disabled={!isOwner || saving || isProtectedOwner}
                placeholder={lang === 'es' ? 'Añadir tag…' : 'Add tag…'}
              />
              <Button type="button" variant="secondary" onClick={addTag} disabled={!isOwner || saving || isProtectedOwner}>
                {lang === 'es' ? 'Añadir' : 'Add'}
              </Button>
              <Button
                type="button"
                onClick={() => patchUser({ tags: tagsDraft })}
                disabled={!isOwner || saving || isProtectedOwner}
                className="gap-2"
              >
                <FaSave />
                <span>{t(lang, 'common.save')}</span>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="px-4 py-4 border-b border-gray-200 dark:border-white/10">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Badges</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{lang === 'es' ? 'Selecciona los badges del usuario' : 'Select user badges'}</div>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectableBadges.map((b) => {
                const id = normalizeBadgeId(b.slug);
                const selected = badgesDraft.includes(id);
                const label = (lang === 'es' ? b.labelEs : b.labelEn) || b.slug;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleBadge(id)}
                    disabled={!isOwner || saving || isProtectedOwner}
                    className={
                      "flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors " +
                      (selected
                        ? 'border-minecraft-grass bg-minecraft-grass/10'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5')
                    }
                  >
                    {b.icon ? <img src={b.icon} alt={label} width={18} height={18} className="shrink-0" /> : null}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{id}</div>
                    </div>
                    <div
                      className={
                        "h-5 w-5 rounded-lg border grid place-items-center text-xs font-bold " +
                        (selected ? 'border-minecraft-grass bg-minecraft-grass text-white' : 'border-gray-300 text-transparent dark:border-white/20')
                      }
                      aria-hidden
                    >
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => patchUser({ badges: badgesDraft })}
                disabled={!isOwner || saving || isProtectedOwner}
                className="gap-2"
              >
                <FaSave />
                <span>{t(lang, 'common.save')}</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
