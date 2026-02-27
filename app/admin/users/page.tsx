'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaSearch, FaSyncAlt, FaUsers } from 'react-icons/fa';

import { Card, Input, Badge, Button, Select } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

interface UserRow {
  _id: string;
  username: string;
  email: string;
  role: string;
  badges?: string[];
  verified?: boolean;
  isBanned: boolean;
  createdAt: string;
}

type BadgeCatalogItem = {
  slug: string;
  labelEs?: string;
  labelEn?: string;
  icon: string;
  enabled: boolean;
};

function initials(name: string) {
  const v = String(name || '').trim();
  return v ? v.slice(0, 1).toUpperCase() : '?';
}

function normalizeBadgeId(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

function getRoleBadge(role: string) {
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

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const lang = useClientLang();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [badgeCatalog, setBadgeCatalog] = useState<BadgeCatalogItem[]>([]);

  const badgeBySlug = useMemo(() => {
    const m = new Map<string, BadgeCatalogItem>();
    for (const b of badgeCatalog) {
      const key = normalizeBadgeId(b.slug);
      if (key) m.set(key, b);
    }
    return m;
  }, [badgeCatalog]);

  const isOwner = session?.user?.role === 'OWNER';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', role: 'USER' });

  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!response.ok) throw new Error(t(lang, 'admin.users.loadError'));
      const data = await response.json();
      setUsers(Array.isArray(data) ? (data as UserRow[]) : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'admin.users.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBadgeCatalog = async () => {
    try {
      const res = await fetch('/api/admin/badges', { cache: 'no-store' });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) return;
      setBadgeCatalog(Array.isArray(data) ? (data as BadgeCatalogItem[]) : []);
    } catch {
      // ignore catalog errors
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBadgeCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const blob = [u.username, u.email, u.role, (u.badges || []).join(' ')].join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [users, searchTerm]);

  const createUser = async () => {
    if (!isOwner) return;
    const username = createForm.username.trim();
    const email = createForm.email.trim();
    const password = createForm.password;
    const role = createForm.role;

    if (!username || !email || !password) {
      toast.error(t(lang, 'admin.users.create.fillRequired'));
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as any).error || t(lang, 'admin.users.create.error'));
      toast.success(t(lang, 'admin.users.create.success'));
      setCreateForm({ username: '', email: '', password: '', role: 'USER' });
      setShowCreateModal(false);
      fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'admin.users.create.error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-900 dark:bg-white/5 dark:border-white/10 dark:text-white">
              <FaUsers />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">{t(lang, 'admin.users.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{t(lang, 'admin.users.subtitle')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
            <span className="px-3 py-1.5 text-xs rounded-full bg-gray-50 border border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-gray-200">
              {loading ? t(lang, 'common.loading') : `${filteredUsers.length} / ${users.length}`}
            </span>

            <Button type="button" variant="secondary" onClick={fetchUsers} disabled={refreshing} className="h-9">
              <FaSyncAlt />
              <span>{refreshing ? t(lang, 'common.loading') : t(lang, 'admin.dashboard.refresh')}</span>
            </Button>

            {isOwner ? (
              <Button type="button" onClick={() => setShowCreateModal(true)} className="h-9">
                <FaUsers />
                <span>{t(lang, 'admin.users.create.cta')}</span>
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Create user modal (OWNER) */}
      {isOwner && showCreateModal ? (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-gray-950/95 border border-white/10 rounded-2xl p-6 md:p-8 max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-white text-xl font-bold">{t(lang, 'admin.users.create.title')}</div>
                <div className="text-xs text-gray-400">{t(lang, 'admin.users.create.subtitle')}</div>
              </div>
              <Badge variant="info">OWNER</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">{t(lang, 'admin.users.create.usernamePlaceholder')}</label>
                <Input
                  value={createForm.username}
                  onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                  placeholder={t(lang, 'admin.users.create.usernamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">{t(lang, 'admin.users.create.emailPlaceholder')}</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder={t(lang, 'admin.users.create.emailPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">{t(lang, 'admin.users.create.passwordPlaceholder')}</label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder={t(lang, 'admin.users.create.passwordPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">{t(lang, 'admin.users.thRole')}</label>
                <Select value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}>
                  <option value="USER">USER</option>
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="OWNER">OWNER</option>
                </Select>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button onClick={createUser} disabled={creating} className="flex-1 justify-center">
                <FaUsers />
                <span>{creating ? t(lang, 'admin.users.create.creating') : t(lang, 'admin.users.create.cta')}</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={creating}
                onClick={() => setShowCreateModal(false)}
                className="flex-1 justify-center"
              >
                <span>{t(lang, 'common.cancel')}</span>
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {/* Search */}
      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="w-full md:max-w-xl">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">{t(lang, 'admin.users.searchPlaceholder')}</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                type="text"
                placeholder={t(lang, 'admin.users.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Users list */}
      {loading ? (
        <Card className="rounded-2xl p-0 overflow-hidden border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'admin.users.title')}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'common.loading')}</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-14 shimmer" />
            ))}
          </div>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">{t(lang, 'admin.users.noResults')}</div>
        </Card>
      ) : (
        <Card className="rounded-2xl p-0 overflow-hidden border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {filteredUsers.map((user) => {
              const badges = Array.isArray(user.badges) ? user.badges : [];
              const verified = Boolean(user.verified);

              const statusBadge = user.isBanned ? (
                <Badge variant="danger">{t(lang, 'admin.users.banned')}</Badge>
              ) : (
                <Badge variant="success">{t(lang, 'admin.users.active')}</Badge>
              );

              return (
                <Link
                  key={user._id}
                  href={`/admin/users/${encodeURIComponent(user._id)}`}
                  className="block"
                >
                  <div className="px-4 py-3 hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-2xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-900 font-semibold shrink-0 dark:bg-white/5 dark:border-white/10 dark:text-white">
                          {initials(user.username)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate max-w-[320px]">{user.username}</div>
                            {verified ? <Badge variant="info">{t(lang, 'admin.users.verified')}</Badge> : null}
                            {/* Badges next to verified */}
                            <div className="flex items-center gap-1">
                              {badges.slice(0, 4).map((badgeId) => {
                                const id = normalizeBadgeId(badgeId);
                                const meta = badgeBySlug.get(id);
                                if (!meta || !meta.icon) return null;
                                const label = (lang === 'es' ? meta.labelEs : meta.labelEn) || meta.slug;
                                return (
                                  <span key={badgeId} title={label} className="inline-flex items-center justify-center">
                                    <img src={meta.icon} alt={label} width={16} height={16} className="shrink-0" />
                                    <span className="sr-only">{label}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[520px]">{user.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getRoleBadge(user.role)}
                        {statusBadge}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
