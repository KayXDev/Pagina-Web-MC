'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaClipboardList, FaTimes } from 'react-icons/fa';
import { Card, Badge, Button } from '@/components/ui';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, getDateLocale, t, type Lang } from '@/lib/i18n';

interface StaffApplication {
  _id: string;
  username: string;
  discord: string;
  about: string;
  status: 'NEW' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  userId?: string;
  ticketId?: string;
}

export default function AdminPostulacionesPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StaffApplication[]>([]);
  const [openLoading, setOpenLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<StaffApplication | null>(null);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat(getDateLocale(lang), {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));

  const statusVariant = (status: StaffApplication['status']) => {
    if (status === 'NEW') return 'warning';
    if (status === 'ACCEPTED') return 'success';
    if (status === 'REJECTED') return 'danger';
    return 'default';
  };

  const statusLabel = (status: StaffApplication['status']) => {
    if (status === 'NEW') return t(lang, 'admin.applications.status.new');
    if (status === 'REVIEWED') return t(lang, 'admin.applications.status.reviewed');
    if (status === 'ACCEPTED') return t(lang, 'admin.applications.status.accepted');
    return t(lang, 'admin.applications.status.rejected');
  };

  const fetchOpen = async () => {
    setOpenLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setOpen((data as any).staff_applications_open === 'true');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'admin.applications.loadErrorState'));
      setOpen(false);
    } finally {
      setOpenLoading(false);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff-applications');
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setItems(Array.isArray(data) ? (data as StaffApplication[]) : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'admin.applications.loadErrorItems'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchOpen();
  }, []);

  const getInitial = (username: string) => {
    const v = String(username || '').trim();
    return v ? v.slice(0, 1).toUpperCase() : '?';
  };

  const updateStatus = async (id: string, status: StaffApplication['status']) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/admin/staff-applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      const updated = data as Partial<StaffApplication>;
      setItems((prev) =>
        prev.map((it) =>
          it._id === id
            ? {
                ...it,
                status: (updated.status as any) || status,
                ticketId: updated.ticketId ?? it.ticketId,
              }
            : it
        )
      );
      setSelected((prev) =>
        prev && prev._id === id
          ? {
              ...prev,
              status: (updated.status as any) || status,
              ticketId: updated.ticketId ?? prev.ticketId,
            }
          : prev
      );
      toast.success(t(lang, 'admin.applications.updateSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'admin.applications.updateError'));
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleOpen = async () => {
    setToggling(true);
    try {
      const next = !open;
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_applications_open: next ? 'true' : 'false' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      setOpen(next);
      toast.success(next ? t(lang, 'admin.applications.opened') : t(lang, 'admin.applications.closed'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'admin.applications.updateError'));
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gray-50 border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-gray-900 dark:text-white">
            <FaClipboardList />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:bg-gradient-to-r dark:from-white dark:via-gray-200 dark:to-white dark:bg-clip-text dark:text-transparent truncate">
              {t(lang, 'admin.applications.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{t(lang, 'admin.applications.subtitle')}</p>
          </div>
        </div>
      </Card>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 max-w-3xl w-full my-8 dark:bg-gray-950/95 dark:border-white/10"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selected.username}</h2>
                  <Badge variant={statusVariant(selected.status)}>{statusLabel(selected.status)}</Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-700 dark:text-gray-300">{t(lang, 'admin.applications.sentAt')}:</span> {formatDateTime(selected.createdAt)}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
                <FaTimes />
                <span>{t(lang, 'common.close')}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card hover={false} className="rounded-2xl dark:border-white/10 dark:bg-gray-950/35">
                <div className="text-xs text-gray-500 mb-1">{t(lang, 'admin.applications.user')}</div>
                <div className="text-gray-900 dark:text-gray-200 font-semibold">{selected.username}</div>
              </Card>
              <Card hover={false} className="rounded-2xl dark:border-white/10 dark:bg-gray-950/35">
                <div className="text-xs text-gray-500 mb-1">{t(lang, 'admin.applications.discord')}</div>
                <div className="text-gray-900 dark:text-gray-200 font-semibold">{selected.discord}</div>
              </Card>
              <Card hover={false} className="rounded-2xl md:col-span-2 dark:border-white/10 dark:bg-gray-950/35">
                <div className="text-xs text-gray-500 mb-1">{t(lang, 'admin.applications.idIfAny')}</div>
                <div className="text-gray-900 dark:text-gray-200 font-semibold break-all">{selected.userId || '—'}</div>
              </Card>
            </div>

            <Card hover={false} className="rounded-2xl dark:border-white/10 dark:bg-gray-950/35">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t(lang, 'admin.applications.motivation')}</div>
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-200 leading-relaxed">{selected.about}</div>
            </Card>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                variant="success"
                className="flex-1"
                disabled={updatingId === selected._id || selected.status === 'ACCEPTED'}
                onClick={() => updateStatus(selected._id, 'ACCEPTED')}
              >
                {t(lang, 'admin.applications.accept')}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={updatingId === selected._id || selected.status === 'REJECTED'}
                onClick={() => updateStatus(selected._id, 'REJECTED')}
              >
                {t(lang, 'admin.applications.reject')}
              </Button>
            </div>

            {selected.status === 'ACCEPTED' && (
              <div className="mt-6">
                <Card hover={false} className="rounded-2xl dark:border-white/10 dark:bg-gray-950/35">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'admin.applications.chatTitle')}</div>
                    {selected.ticketId ? <Badge variant="info">{selected.ticketId}</Badge> : <Badge variant="default">—</Badge>}
                  </div>

                  {!selected.ticketId ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t(lang, 'admin.applications.chatUnavailableHint')}</div>
                  ) : (
                    <Link href={`/admin/postulaciones/chat/${selected.ticketId}`} className="block">
                      <Button className="w-full" variant="secondary">
                        {t(lang, 'admin.applications.openChat')}
                      </Button>
                    </Link>
                  )}
                </Card>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-minecraft-diamond/10 text-minecraft-diamond border border-minecraft-diamond/20 grid place-items-center dark:border-white/10 dark:bg-white/5">
              <FaClipboardList />
            </div>
            <div className="text-gray-900 dark:text-white font-semibold">
              {t(lang, 'admin.tickets.total')}: {items.length}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
            <Badge variant={open ? 'warning' : 'default'}>
              {openLoading
                ? t(lang, 'common.loading')
                : open
                  ? t(lang, 'admin.applications.openBadge')
                  : t(lang, 'admin.applications.closedBadge')}
            </Badge>
            <Button variant={open ? 'danger' : 'secondary'} onClick={toggleOpen} disabled={openLoading || toggling}>
              <span>{open ? t(lang, 'admin.applications.toggleClose') : t(lang, 'admin.applications.toggleOpen')}</span>
            </Button>
            <Badge variant="info">ADMIN</Badge>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card
          hover={false}
          className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25 overflow-hidden p-0"
        >
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'admin.applications.title')}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'common.loading')}</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 shimmer" />
            ))}
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-center text-gray-600 dark:text-gray-400 py-10">{t(lang, 'admin.applications.empty')}</div>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-4 xl:hidden">
            {items.map((a, idx) => (
              <motion.div
                key={a._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.25) }}
              >
                <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-2xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-900 font-semibold shrink-0 dark:bg-white/5 dark:border-white/10 dark:text-white">
                        {getInitial(a.username)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{a.username}</h3>
                          <Badge variant={statusVariant(a.status)}>{statusLabel(a.status)}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="text-gray-700 dark:text-gray-300">{t(lang, 'admin.applications.discord')}:</span> {a.discord}
                          <span className="mx-2">•</span>
                          <span>{formatDateTime(a.createdAt)}</span>
                        </div>

                        <div className="mt-3">
                          <Button variant="secondary" size="sm" onClick={() => setSelected(a)}>
                            <span>{t(lang, 'admin.applications.viewDetails')}</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant="success"
                        size="sm"
                        disabled={updatingId === a._id || a.status === 'ACCEPTED'}
                        onClick={() => updateStatus(a._id, 'ACCEPTED')}
                      >
                        {t(lang, 'admin.applications.accept')}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={updatingId === a._id || a.status === 'REJECTED'}
                        onClick={() => updateStatus(a._id, 'REJECTED')}
                      >
                        {t(lang, 'admin.applications.reject')}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Desktop: table */}
          <Card
            hover={false}
            className="hidden xl:block rounded-2xl p-0 overflow-hidden border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
          >
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'admin.applications.title')}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{items.length}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 font-semibold">{t(lang, 'admin.applications.user')}</th>
                    <th className="px-4 py-3 font-semibold">{t(lang, 'admin.applications.discord')}</th>
                    <th className="px-4 py-3 font-semibold">{t(lang, 'admin.users.thStatus')}</th>
                    <th className="px-4 py-3 font-semibold">{t(lang, 'admin.applications.sentAt')}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t(lang, 'admin.users.thActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {items.map((a) => (
                    <tr key={a._id} className="hover:bg-gray-50/70 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-900 font-semibold shrink-0 dark:bg-white/5 dark:border-white/10 dark:text-white">
                            {getInitial(a.username)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate max-w-[280px]">{a.username}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[360px]">{a.userId || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.discord}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(a.status)}>{statusLabel(a.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatDateTime(a.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setSelected(a)} className="!px-3">
                            <span>{t(lang, 'admin.applications.viewDetails')}</span>
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            disabled={updatingId === a._id || a.status === 'ACCEPTED'}
                            onClick={() => updateStatus(a._id, 'ACCEPTED')}
                            className="!px-3"
                          >
                            <span>{t(lang, 'admin.applications.accept')}</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={updatingId === a._id || a.status === 'REJECTED'}
                            onClick={() => updateStatus(a._id, 'REJECTED')}
                            className="!px-3"
                          >
                            <span>{t(lang, 'admin.applications.reject')}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
