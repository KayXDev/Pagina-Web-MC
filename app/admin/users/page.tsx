'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { FaUsers, FaBan, FaUserShield, FaSearch, FaTrash, FaCheckCircle } from 'react-icons/fa';
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
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER',
  });

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error(t(lang, 'admin.users.loadError'));
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      toast.error(t(lang, 'admin.users.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (session?.user?.role !== 'OWNER') {
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
      const createdUser = data as User;
      setUsers((prev) => [createdUser, ...prev]);
      setFilteredUsers((prev) => [createdUser, ...prev]);
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
      setFilteredUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, ...updatedUser } : u)));

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
      setFilteredUsers((prev) => prev.filter((u) => u._id !== userId));
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t(lang, 'admin.users.title')}</h1>
        <p className="text-gray-400">{t(lang, 'admin.users.subtitle')}</p>
      </div>

      {/* Search */}
      {session?.user?.role === 'OWNER' && (
        <Card className="mb-6" hover={false}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{t(lang, 'admin.users.create.title')}</h2>
              <p className="text-gray-400 text-sm">{t(lang, 'admin.users.create.subtitle')}</p>
            </div>
            <Badge variant="info">OWNER</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="text"
              placeholder={t(lang, 'admin.users.create.usernamePlaceholder')}
              value={createForm.username}
              onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
            />
            <Input
              type="email"
              placeholder={t(lang, 'admin.users.create.emailPlaceholder')}
              value={createForm.email}
              onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
            />
            <Input
              type="password"
              placeholder={t(lang, 'admin.users.create.passwordPlaceholder')}
              value={createForm.password}
              onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
            />
            <Select
              value={createForm.role}
              onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="USER">USER</option>
              <option value="STAFF">STAFF</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OWNER">OWNER</option>
            </Select>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={createUser} disabled={creating}>
              <FaUsers />
              <span>{creating ? t(lang, 'admin.users.create.creating') : t(lang, 'admin.users.create.cta')}</span>
            </Button>
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <Input
            type="text"
            placeholder={t(lang, 'admin.users.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-400">{t(lang, 'admin.users.loading')}</div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => (
                <div key={user._id} className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate inline-flex items-center gap-2">
                        <span className="truncate">{user.username}</span>
                        {user.verified ? <FaCheckCircle className="text-blue-400 shrink-0 text-sm" title="Verificado" /> : null}
                      </div>
                      <div className="text-xs text-gray-300 break-all mt-1">{user.email}</div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {getRoleBadge(user.role)}
                        {user.isBanned ? (
                          <Badge variant="danger">{t(lang, 'admin.users.banned')}</Badge>
                        ) : (
                          <Badge variant="success">{t(lang, 'admin.users.active')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-1">{t(lang, 'admin.users.thRole')}</div>
                    <Select value={user.role} onChange={(e) => handleRoleChange(user._id, e.target.value)} className="w-full">
                      <option value="USER">USER</option>
                      <option value="STAFF">STAFF</option>
                      <option value="ADMIN">ADMIN</option>
                      {session?.user?.role === 'OWNER' && <option value="OWNER">OWNER</option>}
                    </Select>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-2">{t(lang, 'admin.users.thTags')}</div>
                    <div className="flex flex-wrap gap-2">
                      {(user.tags || []).slice(0, 10).map((tag) => (
                        <Badge key={tag} variant="info">
                          {tag}
                        </Badge>
                      ))}
                      {(user.tags || []).length > 10 && (
                        <Badge variant="default">+{(user.tags || []).length - 10}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {session?.user?.role === 'OWNER' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-center"
                        onClick={() => handleVerifiedToggle(user._id, Boolean(user.verified))}
                      >
                        <FaCheckCircle />
                        <span>{user.verified ? 'Quitar verificado' : 'Verificar'}</span>
                      </Button>
                    )}

                    {session?.user?.role === 'OWNER' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-center"
                        onClick={async () => {
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
                      </Button>
                    )}

                    <Button
                      variant={user.isBanned ? 'success' : 'danger'}
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => handleBanToggle(user._id, user.isBanned)}
                    >
                      <FaBan />
                      <span>{user.isBanned ? t(lang, 'admin.users.unban') : t(lang, 'admin.users.ban')}</span>
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full justify-center"
                      onClick={async () => {
                        const ok = window.confirm(
                          `${t(lang, 'admin.users.deleteConfirmA')} ${user.username}${t(lang, 'admin.users.deleteConfirmB')}`
                        );
                        if (!ok) return;
                        await deleteUser(user._id);
                      }}
                    >
                      <FaTrash />
                      <span>{t(lang, 'admin.users.deleteBtn')}</span>
                    </Button>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-400">{t(lang, 'admin.users.noResults')}</div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="py-3 px-4 text-minecraft-grass">{t(lang, 'admin.users.thUser')}</th>
                  <th className="py-3 px-4 text-minecraft-grass">{t(lang, 'admin.users.thEmail')}</th>
                  <th className="py-3 px-4 text-minecraft-grass">{t(lang, 'admin.users.thRole')}</th>
                  <th className="py-3 px-4 text-minecraft-grass">{t(lang, 'admin.users.thTags')}</th>
                  <th className="py-3 px-4 text-minecraft-grass">{t(lang, 'admin.users.thStatus')}</th>
                  <th className="py-3 px-4 text-minecraft-grass">{t(lang, 'admin.users.thActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-gray-800 last:border-0">
                    <td className="py-4 px-4 text-white">
                      <div className="flex items-center gap-2">
                        <span>{user.username}</span>
                        {user.verified ? <FaCheckCircle className="text-blue-400 text-sm" title="Verificado" /> : null}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-300">{user.email}</td>
                    <td className="py-4 px-4">
                      <Select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className="w-32"
                      >
                        <option value="USER">USER</option>
                        <option value="STAFF">STAFF</option>
                        <option value="ADMIN">ADMIN</option>
                        {session?.user?.role === 'OWNER' && <option value="OWNER">OWNER</option>}
                      </Select>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-2">
                        {(user.tags || []).slice(0, 6).map((tag) => (
                          <Badge key={tag} variant="info">
                            {tag}
                          </Badge>
                        ))}
                        {(user.tags || []).length > 6 && (
                          <Badge variant="default">+{(user.tags || []).length - 6}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {user.isBanned ? (
                        <Badge variant="danger">{t(lang, 'admin.users.banned')}</Badge>
                      ) : (
                        <Badge variant="success">{t(lang, 'admin.users.active')}</Badge>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-2">
                        {session?.user?.role === 'OWNER' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleVerifiedToggle(user._id, Boolean(user.verified))}
                          >
                            <FaCheckCircle />
                            <span>{user.verified ? 'Quitar verificado' : 'Verificar'}</span>
                          </Button>
                        )}

                        {session?.user?.role === 'OWNER' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
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
                          </Button>
                        )}

                        <Button
                          variant={user.isBanned ? 'success' : 'danger'}
                          size="sm"
                          onClick={() => handleBanToggle(user._id, user.isBanned)}
                        >
                          <FaBan />
                          <span>{user.isBanned ? t(lang, 'admin.users.unban') : t(lang, 'admin.users.ban')}</span>
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            const ok = window.confirm(
                              `${t(lang, 'admin.users.deleteConfirmA')} ${user.username}${t(lang, 'admin.users.deleteConfirmB')}`
                            );
                            if (!ok) return;
                            await deleteUser(user._id);
                          }}
                        >
                          <FaTrash />
                          <span>{t(lang, 'admin.users.deleteBtn')}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                {t(lang, 'admin.users.noResults')}
              </div>
            )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
