'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FaPlus, FaSave, FaSearch, FaSyncAlt, FaTrash } from 'react-icons/fa';

import { Badge, Button, Card, Input, Select } from '@/components/ui';
import { useClientLang } from '@/lib/useClientLang';

type BadgeItem = {
  _id: string;
  slug: string;
  labelEs?: string;
  labelEn?: string;
  icon: string;
  enabled: boolean;
  createdAt: string;
};

function normalizeSlug(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40);
}

export default function AdminBadgesPage() {
  const { data: session } = useSession();
  const lang = useClientLang();
  const isOwner = session?.user?.role === 'OWNER';

  const [items, setItems] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ slug: '', labelEs: '', labelEn: '', icon: '', enabled: true });
  const [uploadingCreate, setUploadingCreate] = useState(false);

  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);

  const uploadBadgeIcon = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch('/api/admin/uploads/badge-icon', {
      method: 'POST',
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error || 'Error');
    const url = String((data as any)?.url || '');
    if (!url) throw new Error(lang === 'es' ? 'Upload sin URL' : 'Upload returned no URL');
    return url;
  };

  const fetchBadges = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/badges', { cache: 'no-store' });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error((data as any)?.error || 'Error');
      setItems(Array.isArray(data) ? (data as BadgeItem[]) : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b) => {
      const blob = [b.slug, b.labelEs || '', b.labelEn || '', b.icon || ''].join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [items, search]);

  const createBadge = async () => {
    if (!isOwner) return;
    const slug = normalizeSlug(createForm.slug);
    const labelEs = createForm.labelEs.trim();
    const labelEn = createForm.labelEn.trim();
    const icon = createForm.icon.trim();
    const enabled = Boolean(createForm.enabled);

    if (!slug || !icon) {
      toast.error(lang === 'es' ? 'Slug e icon son obligatorios' : 'Slug and icon are required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, labelEs, labelEn, icon, enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || 'Error');
      toast.success(lang === 'es' ? 'Badge creado' : 'Badge created');
      setShowCreate(false);
      setCreateForm({ slug: '', labelEs: '', labelEn: '', icon: '', enabled: true });
      fetchBadges();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const updateBadge = async (slug: string, updates: Partial<Pick<BadgeItem, 'labelEs' | 'labelEn' | 'icon' | 'enabled'>>) => {
    if (!isOwner) return;
    setSavingSlug(slug);
    try {
      const res = await fetch(`/api/admin/badges/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || 'Error');
      toast.success(lang === 'es' ? 'Badge actualizado' : 'Badge updated');
      fetchBadges();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingSlug(null);
    }
  };

  const deleteBadge = async (slug: string) => {
    if (!isOwner) return;
    const ok = window.confirm(lang === 'es' ? '¿Eliminar badge?' : 'Delete badge?');
    if (!ok) return;
    setDeletingSlug(slug);
    try {
      const res = await fetch(`/api/admin/badges/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || 'Error');
      toast.success(lang === 'es' ? 'Badge eliminado' : 'Badge deleted');
      fetchBadges();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">Badges</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              {lang === 'es' ? 'Crea y administra badges del perfil' : 'Create and manage profile badges'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
            <Button type="button" variant="secondary" onClick={fetchBadges} disabled={refreshing} className="h-9">
              <FaSyncAlt />
              <span>{refreshing ? (lang === 'es' ? 'Cargando…' : 'Loading…') : lang === 'es' ? 'Recargar' : 'Refresh'}</span>
            </Button>
            {isOwner ? (
              <Button type="button" onClick={() => setShowCreate(true)} className="h-9">
                <FaPlus />
                <span>{lang === 'es' ? 'Nuevo badge' : 'New badge'}</span>
              </Button>
            ) : (
              <Badge variant="info">{lang === 'es' ? 'Solo OWNER puede editar' : 'OWNER only to edit'}</Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaSearch />
            </span>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === 'es' ? 'Buscar…' : 'Search…'} className="pl-9" />
          </div>
          <span className="px-3 py-1.5 text-xs rounded-full bg-gray-50 border border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-gray-200">
            {loading ? (lang === 'es' ? 'Cargando…' : 'Loading…') : `${filtered.length}`}
          </span>
        </div>
      </Card>

      {showCreate && isOwner ? (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-gray-950/95 border border-white/10 rounded-2xl p-6 md:p-8 max-w-2xl w-full my-8"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-white text-xl font-bold">{lang === 'es' ? 'Nuevo badge' : 'New badge'}</div>
                <div className="text-xs text-gray-400">{lang === 'es' ? 'Slug + icon son obligatorios' : 'Slug + icon are required'}</div>
              </div>
              <Badge variant="info">OWNER</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Slug</label>
                <Input value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} placeholder="ej: youtuber" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Icon</label>
                <Input value={createForm.icon} onChange={(e) => setCreateForm((p) => ({ ...p, icon: e.target.value }))} placeholder="/badges/youtuber.png" />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={uploadingCreate || creating}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingCreate(true);
                      try {
                        const url = await uploadBadgeIcon(file);
                        setCreateForm((p) => ({ ...p, icon: url }));
                        toast.success(lang === 'es' ? 'Icono subido' : 'Icon uploaded');
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Error');
                      } finally {
                        setUploadingCreate(false);
                        e.target.value = '';
                      }
                    }}
                    className="block w-full text-xs text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
                  />
                  {uploadingCreate ? (
                    <span className="text-xs text-gray-400">{lang === 'es' ? 'Subiendo…' : 'Uploading…'}</span>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Label (ES)</label>
                <Input value={createForm.labelEs} onChange={(e) => setCreateForm((p) => ({ ...p, labelEs: e.target.value }))} placeholder="YouTuber" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Label (EN)</label>
                <Input value={createForm.labelEn} onChange={(e) => setCreateForm((p) => ({ ...p, labelEn: e.target.value }))} placeholder="YouTuber" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Enabled</label>
                <Select value={String(createForm.enabled)} onChange={(e) => setCreateForm((p) => ({ ...p, enabled: e.target.value === 'true' }))}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </Select>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button onClick={createBadge} disabled={creating} className="flex-1 justify-center">
                <FaSave />
                <span>{creating ? (lang === 'es' ? 'Creando…' : 'Creating…') : lang === 'es' ? 'Crear' : 'Create'}</span>
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="flex-1 justify-center">
                <span>{lang === 'es' ? 'Cerrar' : 'Close'}</span>
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((b) => (
          <Card key={b._id} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 border border-gray-200 grid place-items-center overflow-hidden dark:bg-white/5 dark:border-white/10">
                  {b.icon ? <img src={b.icon} alt={b.slug} width={32} height={32} className="h-8 w-8 object-contain" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{b.slug}</div>
                    {b.enabled ? <Badge variant="success">enabled</Badge> : <Badge variant="warning">disabled</Badge>}
                    {String(b.icon || '').startsWith('/uploads/') ? (
                      <Badge variant="warning">uploads(dev)</Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{b.icon}</div>
                  <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                    <span className="opacity-80">ES:</span> {b.labelEs || '—'} <span className="opacity-80 ml-2">EN:</span> {b.labelEn || '—'}
                  </div>
                </div>
              </div>

              {isOwner ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => deleteBadge(b.slug)}
                  disabled={Boolean(deletingSlug) || Boolean(savingSlug)}
                  className="text-red-500"
                >
                  <FaTrash />
                </Button>
              ) : null}
            </div>

            {isOwner ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Icon</label>
                  <Input
                    defaultValue={b.icon}
                    onBlur={(e) => updateBadge(b.slug, { icon: e.target.value.trim() })}
                    disabled={savingSlug === b.slug || uploadingSlug === b.slug}
                  />
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      disabled={savingSlug === b.slug || uploadingSlug === b.slug}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingSlug(b.slug);
                        try {
                          const url = await uploadBadgeIcon(file);
                          setItems((prev) => prev.map((it) => (it.slug === b.slug ? { ...it, icon: url } : it)));
                          await updateBadge(b.slug, { icon: url });
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Error');
                        } finally {
                          setUploadingSlug(null);
                          e.target.value = '';
                        }
                      }}
                      className="block w-full text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-900 hover:file:bg-gray-200 dark:file:bg-white/10 dark:file:text-white dark:hover:file:bg-white/15"
                    />
                    {uploadingSlug === b.slug ? (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Subiendo…' : 'Uploading…'}</div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Enabled</label>
                  <Select
                    value={String(b.enabled)}
                    onChange={(e) => {
                      const nextEnabled = e.target.value === 'true';
                      setItems((prev) => prev.map((it) => (it.slug === b.slug ? { ...it, enabled: nextEnabled } : it)));
                      updateBadge(b.slug, { enabled: nextEnabled });
                    }}
                    disabled={savingSlug === b.slug || uploadingSlug === b.slug}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Label (ES)</label>
                  <Input
                    defaultValue={b.labelEs || ''}
                    onBlur={(e) => updateBadge(b.slug, { labelEs: e.target.value })}
                    disabled={savingSlug === b.slug || uploadingSlug === b.slug}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Label (EN)</label>
                  <Input
                    defaultValue={b.labelEn || ''}
                    onBlur={(e) => updateBadge(b.slug, { labelEn: e.target.value })}
                    disabled={savingSlug === b.slug || uploadingSlug === b.slug}
                  />
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
