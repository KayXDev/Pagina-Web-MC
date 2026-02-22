'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FaUsers, FaBan, FaUserShield, FaSearch, FaTrash, FaCheckCircle, FaSyncAlt, FaEllipsisV } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Card, Input, Badge, Button, Select } from '@/components/ui';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  tags?: string[];
  verified?: boolean;
  isBanned: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [lang, setLang] = useState<Lang>('es');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER',
  });

  useEffect(() => {
    const clientLang = getClientLangFromCookie();
    setLang(clientLang);
    fetchUsers(clientLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!openMenuUserId) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const root = target.closest('[data-user-menu-root]') as HTMLElement | null;
      const rootId = root?.dataset?.userMenuRoot || null;
      if (rootId !== openMenuUserId) setOpenMenuUserId(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuUserId(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuUserId]);

  const isOwner = session?.user?.role === 'OWNER';

  const fetchUsers = async (langOverride?: Lang) => {
    const useLang = langOverride || lang;
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error(t(useLang, 'admin.users.loadError'));
      const data = await response.json();
      setUsers(Array.isArray(data) ? (data as User[]) : []);
    } catch (error) {
      toast.error(t(useLang, 'admin.users.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createUser = async () => {
    if (!isOwner) {
      toast.error(t(lang, 'admin.users.create.unauthorized'));
      return;
    }

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
      if (!response.ok) throw new Error(data.error || t(lang, 'admin.users.create.error'));

      toast.success(t(lang, 'admin.users.create.success'));
      setCreateForm({ username: '', email: '', password: '', role: 'USER' });
      setShowCreateModal(false);
      const createdUser = data as User;
      setUsers((prev) => [createdUser, ...prev]);
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(lang, 'admin.users.create.error'));
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (userId: string, updates: any): Promise<User> => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t(lang, 'admin.users.updateError'));

      toast.success(t(lang, 'admin.users.updateSuccess'));
      // Update optimista: refleja el cambio al instante
      const updatedUser = data as User;
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, ...updatedUser } : u)));

      // Re-sync en background por si hay otros cambios
      fetchUsers();
      return updatedUser;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(lang, 'admin.users.updateError'));
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t(lang, 'admin.users.deleteError'));

      toast.success(t(lang, 'admin.users.deleteSuccess'));
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(lang, 'admin.users.deleteError'));
    }
  };

  const handleRoleChange = (userId: string, role: string) => {
    updateUser(userId, { role });
  };

  const handleBanToggle = (userId: string, isBanned: boolean) => {
    updateUser(userId, { isBanned: !isBanned });
  };

  const handleVerifiedToggle = (userId: string, verified: boolean) => {
    updateUser(userId, { verified: !verified });
  };

  const getRoleBadge = (role: string) => {
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
  };

  const getInitial = (username: string) => {
    const v = String(username || '').trim();
    return v ? v.slice(0, 1).toUpperCase() : '?';
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedSearch) return users;
    return users.filter((user) => {
      const blob = [user.username, user.email, user.role, (user.tags || []).join(' ')].join(' ').toLowerCase();
      return blob.includes(normalizedSearch);
    });
  }, [users, normalizedSearch]);

  const stats = useMemo(() => {
    const total = users.length;
    const banned = users.filter((u) => u.isBanned).length;
    const verified = users.filter((u) => u.verified).length;
    const staff = users.filter((u) => u.role === 'STAFF').length;
    const admins = users.filter((u) => u.role === 'ADMIN' || u.role === 'OWNER').length;
    return { total, banned, verified, staff, admins };
  }, [users]);

  const canEditOwnerAccounts = isOwner;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white">
              <FaUsers />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white truncate">{t(lang, 'admin.users.title')}</h1>
              <p className="text-gray-400 text-sm md:text-base">{t(lang, 'admin.users.subtitle')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              {t(lang, 'admin.users.thUser')}: {stats.total}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              {t(lang, 'admin.users.active')}: {stats.total - stats.banned}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              {t(lang, 'admin.users.banned')}: {stats.banned}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              {t(lang, 'admin.users.verified')}: {stats.verified}
            </span>

            <Button type="button" variant="secondary" onClick={() => fetchUsers()} disabled={refreshing} className="h-9">
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

      {/* Create user (OWNER) Modal */}
      {isOwner && showCreateModal ? (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  {t(lang, 'admin.users.create.usernamePlaceholder')}
                </label>
                <Input
                  type="text"
                  placeholder={t(lang, 'admin.users.create.usernamePlaceholder')}
                  value={createForm.username}
                  onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  {t(lang, 'admin.users.create.emailPlaceholder')}
                </label>
                <Input
                  type="email"
                  placeholder={t(lang, 'admin.users.create.emailPlaceholder')}
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  {t(lang, 'admin.users.create.passwordPlaceholder')}
                </label>
                <Input
                  type="password"
                  placeholder={t(lang, 'admin.users.create.passwordPlaceholder')}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
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
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="w-full md:max-w-xl">
            <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'admin.users.searchPlaceholder')}</label>
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

          <div className="flex items-center gap-2 justify-start md:justify-end">
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              {loading ? t(lang, 'common.loading') : `${filteredUsers.length} / ${users.length}`}
            </span>
          </div>
        </div>
      </Card>

      {/* Users list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-white/10 bg-gray-950/25 rounded-2xl shimmer h-44" hover={false} />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
          <div className="text-center py-12 text-gray-400">{t(lang, 'admin.users.noResults')}</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const isProtectedOwner = user.role === 'OWNER' && !canEditOwnerAccounts;
            const canEditTags = isOwner;
            const canToggleVerified = isOwner;
            const menuOpen = openMenuUserId === user._id;

            const statusBadge = user.isBanned ? (
              <Badge variant="danger">{t(lang, 'admin.users.banned')}</Badge>
            ) : (
              <Badge variant="success">{t(lang, 'admin.users.active')}</Badge>
            );

            return (
              <Card key={user._id} className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-white font-semibold shrink-0">
                      {getInitial(user.username)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-white font-semibold truncate max-w-[220px]">{user.username}</div>
                        {user.verified ? <Badge variant="info">{t(lang, 'admin.users.verified')}</Badge> : null}
                        {isProtectedOwner ? <Badge variant="default">LOCKED</Badge> : null}
                      </div>
                      <div className="text-xs text-gray-300 break-all mt-1">{user.email}</div>
                    </div>
                  </div>

                  <div className="relative" data-user-menu-root={user._id}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="!px-3"
                      disabled={false}
                      onClick={() => setOpenMenuUserId((prev) => (prev === user._id ? null : user._id))}
                    >
                      <FaEllipsisV />
                      <span className="sr-only">{t(lang, 'admin.users.thActions')}</span>
                    </Button>

                    {menuOpen ? (
                      <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-gray-950/90 backdrop-blur shadow-lg shadow-black/40 overflow-hidden z-20">
                        <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/10">
                          {t(lang, 'admin.users.thActions')}
                        </div>

                        {canToggleVerified ? (
                          <button
                            type="button"
                            disabled={isProtectedOwner}
                            className="w-full px-3 py-2 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            onClick={async () => {
                              setOpenMenuUserId(null);
                              handleVerifiedToggle(user._id, Boolean(user.verified));
                            }}
                          >
                            <FaCheckCircle />
                            <span>{user.verified ? t(lang, 'admin.users.unverify') : t(lang, 'admin.users.verify')}</span>
                          </button>
                        ) : null}

                        {canEditTags ? (
                          <button
                            type="button"
                            disabled={isProtectedOwner}
                            className="w-full px-3 py-2 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            onClick={async () => {
                              setOpenMenuUserId(null);
                              const current = (user.tags || []).join(',');
                              const input = window.prompt(t(lang, 'admin.users.tagsPrompt'), current);
                              if (input === null) return;
                              const nextTags = input
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean);
                              await updateUser(user._id, { tags: nextTags });
                            }}
                          >
                            <FaUserShield />
                            <span>{t(lang, 'admin.users.tagsBtn')}</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          disabled={isProtectedOwner}
                          className="w-full px-3 py-2 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          onClick={() => {
                            setOpenMenuUserId(null);
                            handleBanToggle(user._id, user.isBanned);
                          }}
                        >
                          <FaBan />
                          <span>{user.isBanned ? t(lang, 'admin.users.unban') : t(lang, 'admin.users.ban')}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProtectedOwner}
                          className="w-full px-3 py-2 text-sm text-red-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          onClick={async () => {
                            setOpenMenuUserId(null);
                            const ok = window.confirm(
                              `${t(lang, 'admin.users.deleteConfirmA')} ${user.username}${t(lang, 'admin.users.deleteConfirmB')}`
                            );
                            if (!ok) return;
                            await deleteUser(user._id);
                          }}
                        >
                          <FaTrash />
                          <span>{t(lang, 'admin.users.deleteBtn')}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {getRoleBadge(user.role)}
                  {statusBadge}
                  {(user.tags || []).slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="default">
                      {tag}
                    </Badge>
                  ))}
                  {(user.tags || []).length > 3 ? <Badge variant="default">+{(user.tags || []).length - 3}</Badge> : null}
                </div>

                <div className="mt-4">
                  <div className="text-xs text-gray-400 mb-2">{t(lang, 'admin.users.thRole')}</div>
                  <Select value={user.role} onChange={(e) => handleRoleChange(user._id, e.target.value)} disabled={isProtectedOwner}>
                    <option value="USER">USER</option>
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                    {isOwner ? <option value="OWNER">OWNER</option> : null}
                  </Select>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
