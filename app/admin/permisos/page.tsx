'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FaKey } from 'react-icons/fa';
import { Card, Button, Badge } from '@/components/ui';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';

type AdminUser = {
  _id: string;
  username: string;
  email: string;
  role: 'ADMIN';
  adminSections: string[];
  adminSectionsConfigured: boolean;
};

const SECTION_KEYS = ['users', 'products', 'tickets', 'forum', 'blog', 'applications', 'logs', 'settings'] as const;

export default function AdminPermisosPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => users.find((u) => u._id === selectedId) ?? null, [users, selectedId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/permissions', { cache: 'no-store' });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as any).error || 'Error');

      const list = Array.isArray(data) ? (data as AdminUser[]) : [];
      setUsers(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0]._id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'admin.permissions.loadError'));
      setUsers([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLang(getClientLangFromCookie());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSection = (key: string) => {
    if (!selected) return;
    setUsers((prev) =>
      prev.map((u) => {
        if (u._id !== selected._id) return u;
        const set = new Set(u.adminSections || []);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return { ...u, adminSectionsConfigured: true, adminSections: Array.from(set) };
      })
    );
  };

  const setConfigured = (configured: boolean) => {
    if (!selected) return;
    setUsers((prev) =>
      prev.map((u) =>
        u._id === selected._id
          ? { ...u, adminSectionsConfigured: configured, adminSections: configured ? u.adminSections : [] }
          : u
      )
    );
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selected._id,
          adminSections: selected.adminSections,
          adminSectionsConfigured: selected.adminSectionsConfigured,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      toast.success(t(lang, 'admin.permissions.saveSuccess'));
      await fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'admin.permissions.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white">
            <FaKey />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent truncate">
              {t(lang, 'admin.permissions.title')}
            </h1>
            <p className="text-gray-400 text-sm md:text-base">{t(lang, 'admin.permissions.subtitle')}</p>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card hover={false} className="text-center text-gray-400 py-10 border-white/10 bg-gray-950/25 rounded-2xl">
          {t(lang, 'admin.permissions.loading')}
        </Card>
      ) : users.length === 0 ? (
        <Card hover={false} className="text-center text-gray-400 py-10 border-white/10 bg-gray-950/25 rounded-2xl">
          {t(lang, 'admin.permissions.empty')}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card hover={false} className="border-white/10 bg-gray-950/25 rounded-2xl lg:col-span-1">
            <div className="text-white font-semibold mb-4">{t(lang, 'admin.permissions.admins')}</div>
            <div className="space-y-2">
              {users.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => setSelectedId(u._id)}
                  className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                    selectedId === u._id
                      ? 'border-minecraft-grass bg-white/5 text-white'
                      : 'border-white/10 hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{u.username}</div>
                      <div className="text-xs text-gray-400 truncate">{u.email}</div>
                    </div>
                    <Badge variant={u.adminSectionsConfigured ? 'warning' : 'info'}>
                      {u.adminSectionsConfigured
                        ? t(lang, 'admin.permissions.badgeCustom')
                        : t(lang, 'admin.permissions.badgeTotal')}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
            <Card hover={false} className="border-white/10 bg-gray-950/25 rounded-2xl">
              {!selected ? (
                <div className="text-gray-400">{t(lang, 'admin.permissions.selectAdmin')}</div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div>
                      <div className="text-white text-xl font-bold">{selected.username}</div>
                      <div className="text-gray-400 text-sm">{selected.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={selected.adminSectionsConfigured ? 'secondary' : 'primary'}
                        onClick={() => setConfigured(!selected.adminSectionsConfigured)}
                      >
                        <span>
                          {selected.adminSectionsConfigured
                            ? t(lang, 'admin.permissions.fullAccess')
                            : t(lang, 'admin.permissions.customize')}
                        </span>
                      </Button>
                      <Button variant="primary" onClick={save} disabled={saving}>
                        <span>{saving ? t(lang, 'common.saving') : t(lang, 'common.save')}</span>
                      </Button>
                    </div>
                  </div>

                  {!selected.adminSectionsConfigured ? (
                    <div className="text-gray-300">
                      {t(lang, 'admin.permissions.fullAccessTextA')}{' '}
                      <span className="text-white font-semibold">{t(lang, 'admin.permissions.fullAccessTextB')}</span>{' '}
                      {t(lang, 'admin.permissions.fullAccessTextC')}
                    </div>
                  ) : (
                    <div>
                      <div className="text-gray-300 mb-3">{t(lang, 'admin.permissions.allowedSections')}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SECTION_KEYS.map((key) => {
                          const checked = selected.adminSections.includes(key);
                          return (
                            <label
                              key={key}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSection(key)}
                                className="h-4 w-4 accent-minecraft-grass"
                              />
                              <span className="text-white">{t(lang, `admin.menu.${key}` as any)}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="mt-4 text-xs text-gray-400">{t(lang, 'admin.permissions.note')}</div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
