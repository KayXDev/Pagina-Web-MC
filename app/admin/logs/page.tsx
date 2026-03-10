'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  FaChevronDown,
  FaChevronUp,
  FaGlobe,
  FaHistory,
  FaLink,
  FaSearch,
  FaSyncAlt,
  FaWrench,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Badge, Button, Card, Input } from '@/components/ui';
import { t, type Lang } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { formatDateTime } from '@/lib/utils';

type Log = {
  _id: string;
  adminUsername: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  meta?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
};

type ActionFilter = 'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' | 'OTHER';

function getActionKey(action: string): ActionFilter {
  if (action.includes('CREATE')) return 'CREATE';
  if (action.includes('UPDATE')) return 'UPDATE';
  if (action.includes('DELETE')) return 'DELETE';
  return 'OTHER';
}

function getActionBadge(action: string) {
  const actionKey = getActionKey(action);
  if (actionKey === 'CREATE') return <Badge variant="success">CREATE</Badge>;
  if (actionKey === 'UPDATE') return <Badge variant="warning">UPDATE</Badge>;
  if (actionKey === 'DELETE') return <Badge variant="danger">DELETE</Badge>;
  return <Badge variant="info">{action}</Badge>;
}

function getMethodBadge(method?: string) {
  if (!method) return null;
  const normalized = method.toUpperCase();
  const variant =
    normalized === 'GET'
      ? 'info'
      : normalized === 'POST'
        ? 'success'
        : normalized === 'PATCH' || normalized === 'PUT'
          ? 'warning'
          : normalized === 'DELETE'
            ? 'danger'
            : 'default';
  return <Badge variant={variant}>{normalized}</Badge>;
}

function safeParseDetails(details?: string) {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
}

function truncate(value: string, max = 140) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

export default function AdminLogsPage() {
  const { data: session } = useSession();
  const lang = useClientLang();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);

  const isOwner = session?.user?.role === 'OWNER';

  const fetchLogs = async (langOverride?: Lang) => {
    const useLang = langOverride || lang;
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/logs?limit=200', { cache: 'no-store' });
      if (!response.ok) throw new Error(t(useLang, 'admin.logs.loadError'));
      const payload = await response.json();
      setLogs(Array.isArray(payload) ? (payload as Log[]) : []);
    } catch (error: any) {
      toast.error(error?.message || t(useLang, 'admin.logs.loadError'));
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWebhook = async (langOverride?: Lang) => {
    if (!isOwner) return;
    const useLang = langOverride || lang;
    setWebhookLoading(true);
    try {
      const response = await fetch('/api/admin/logs/webhook', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((payload as any).error || t(useLang, 'admin.logs.webhookLoadError'));
      setWebhookUrl(String((payload as any).webhookUrl || ''));
    } catch (error: any) {
      toast.error(error?.message || t(useLang, 'admin.logs.webhookLoadError'));
    } finally {
      setWebhookLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    fetchWebhook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  const saveWebhook = async () => {
    if (!isOwner) return;
    setWebhookSaving(true);
    try {
      const response = await fetch('/api/admin/logs/webhook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((payload as any).error || t(lang, 'admin.logs.webhookSaveError'));
      toast.success(t(lang, 'admin.logs.webhookSaved'));
    } catch (error: any) {
      toast.error(error?.message || t(lang, 'admin.logs.webhookSaveError'));
    } finally {
      setWebhookSaving(false);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'ALL' && getActionKey(log.action) !== actionFilter) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        log.adminUsername,
        log.action,
        log.targetType,
        log.targetId,
        log.details,
        log.ipAddress,
        log.meta ? JSON.stringify(log.meta) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [actionFilter, logs, normalizedSearch]);

  const counts = useMemo(() => {
    return filteredLogs.reduce(
      (acc, log) => {
        const actionKey = getActionKey(log.action);
        if (actionKey === 'CREATE') acc.create += 1;
        else if (actionKey === 'UPDATE') acc.update += 1;
        else if (actionKey === 'DELETE') acc.delete += 1;
        else acc.other += 1;
        return acc;
      },
      { create: 0, update: 0, delete: 0, other: 0 }
    );
  }, [filteredLogs]);

  const totalCounts = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        const actionKey = getActionKey(log.action);
        if (actionKey === 'CREATE') acc.create += 1;
        else if (actionKey === 'UPDATE') acc.update += 1;
        else if (actionKey === 'DELETE') acc.delete += 1;
        else acc.other += 1;
        return acc;
      },
      { create: 0, update: 0, delete: 0, other: 0 }
    );
  }, [logs]);

  const topAdmin = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) {
      const key = String(log.adminUsername || 'unknown');
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0] || null;
  }, [logs]);

  const latestLog = logs[0] || null;
  const filterOptions: Array<{ id: ActionFilter; label: string }> = [
    { id: 'ALL', label: lang === 'es' ? 'Todo' : 'All' },
    { id: 'CREATE', label: 'Create' },
    { id: 'UPDATE', label: 'Update' },
    { id: 'DELETE', label: 'Delete' },
    { id: 'OTHER', label: lang === 'es' ? 'Otros' : 'Other' },
  ];

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden rounded-[32px] dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_36%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-gray-200 bg-white text-minecraft-diamond dark:border-white/10 dark:bg-white/5 dark:text-white">
              <FaHistory className="text-xl" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                {lang === 'es' ? 'Registro operativo' : 'Operational audit'}
              </div>
              <h1 className="mt-2 truncate text-2xl font-black text-gray-900 dark:text-white md:text-3xl">{t(lang, 'admin.logs.title')}</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300 md:text-base">
                {lang === 'es'
                  ? 'Reconstruido como un feed claro: resumen arriba, filtros visibles y cada entrada separada para revisar cambios sin una tabla pesada.'
                  : 'Rebuilt as a cleaner feed with summary cards, visible filters, and separated entries instead of a dense table.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
              {t(lang, 'admin.logs.total')}: {filteredLogs.length}
            </span>
            <Button type="button" variant="secondary" onClick={() => fetchLogs()} disabled={refreshing} className="h-10 rounded-2xl">
              <FaSyncAlt />
              <span>{refreshing ? t(lang, 'common.loading') : t(lang, 'admin.dashboard.refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card hover={false} className="rounded-[26px] dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Total bruto' : 'Raw total'}</div>
          <div className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{logs.length}</div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {latestLog
              ? `${lang === 'es' ? 'Ultimo evento' : 'Latest event'}: ${formatDateTime(latestLog.createdAt)}`
              : t(lang, 'admin.logs.empty')}
          </div>
        </Card>

        <Card hover={false} className="rounded-[26px] dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Cambios estructurados' : 'Structured changes'}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="success">CREATE {totalCounts.create}</Badge>
            <Badge variant="warning">UPDATE {totalCounts.update}</Badge>
            <Badge variant="danger">DELETE {totalCounts.delete}</Badge>
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">{lang === 'es' ? `Otros: ${totalCounts.other}` : `Other: ${totalCounts.other}`}</div>
        </Card>

        <Card hover={false} className="rounded-[26px] dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Admin mas activo' : 'Most active admin'}</div>
          <div className="mt-3 truncate text-xl font-black text-gray-900 dark:text-white">{topAdmin?.[0] || '-'}</div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {topAdmin ? `${topAdmin[1]} ${lang === 'es' ? 'eventos registrados' : 'logged events'}` : lang === 'es' ? 'Sin actividad' : 'No activity'}
          </div>
        </Card>

        <Card hover={false} className="rounded-[26px] dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Vista actual' : 'Current view'}</div>
          <div className="mt-3 text-xl font-black text-gray-900 dark:text-white">{filteredLogs.length}</div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {lang === 'es'
              ? `Filtro: ${actionFilter === 'ALL' ? 'todo' : actionFilter.toLowerCase()}`
              : `Filter: ${actionFilter === 'ALL' ? 'all' : actionFilter.toLowerCase()}`}
          </div>
        </Card>
      </div>

      {isOwner ? (
        <Card className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <FaLink className="text-minecraft-diamond" />
                <span>{t(lang, 'admin.logs.webhookTitle')}</span>
              </div>
              <div className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">{t(lang, 'admin.logs.webhookDesc')}</div>
            </div>
            <Badge variant={webhookUrl.trim() ? 'success' : 'warning'}>
              {webhookLoading
                ? t(lang, 'common.loading')
                : webhookUrl.trim()
                  ? t(lang, 'admin.logs.webhookConfigured')
                  : t(lang, 'admin.logs.webhookNotConfigured')}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 items-end gap-3 md:grid-cols-4">
            <div className="md:col-span-3">
              <Input
                type="url"
                placeholder={t(lang, 'admin.logs.webhookPlaceholder')}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                disabled={webhookLoading || webhookSaving}
              />
              <div className="mt-2 text-xs text-gray-500">{t(lang, 'admin.logs.webhookDisableHint')}</div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={saveWebhook}
              disabled={webhookLoading || webhookSaving}
              className="w-full rounded-2xl"
            >
              <span>{webhookSaving ? t(lang, 'admin.logs.saving') : t(lang, 'common.save')}</span>
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr] xl:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t(lang, 'admin.logs.search')}</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(lang, 'admin.logs.searchPlaceholder')}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'es' ? 'Filtrar por accion' : 'Filter by action'}</div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActionFilter(option.id)}
                    className={`shrink-0 rounded-2xl border px-3 py-2 text-sm transition-colors ${
                    actionFilter === option.id
                      ? 'border-minecraft-grass/40 bg-minecraft-grass/10 text-gray-900 dark:text-white'
                      : 'border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
            CREATE: {counts.create}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
            UPDATE: {counts.update}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
            DELETE: {counts.delete}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
            {t(lang, 'admin.logs.other')}: {counts.other}
          </span>
        </div>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <Card className="h-40 rounded-[28px] shimmer" hover={false} />
        ) : filteredLogs.length === 0 ? (
          <Card className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25" hover={false}>
            <div className="px-6 py-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-gray-200 bg-gray-100 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                <FaHistory />
              </div>
              <div className="mt-4 text-lg font-bold text-gray-900 dark:text-white">{t(lang, 'admin.logs.empty')}</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Prueba a limpiar la busqueda o cambiar el filtro actual.' : 'Try clearing the search or changing the current filter.'}
              </div>
            </div>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = Boolean(expanded[log._id]);
            const method = log.meta?.method ? String(log.meta.method) : undefined;
            const path = log.meta?.path ? String(log.meta.path) : undefined;
            const detailsPreview = typeof safeParseDetails(log.details) === 'string'
              ? truncate(String(safeParseDetails(log.details) || ''))
              : truncate(JSON.stringify(safeParseDetails(log.details) || {}));
            const parsedDetails = safeParseDetails(log.details);

            return (
              <Card key={log._id} className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25" hover={false}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getActionBadge(log.action)}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{log.action}</span>
                      <span className="text-xs text-gray-500">{formatDateTime(log.createdAt)}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                        <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Admin' : 'Admin'}</div>
                        <div className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-white">{log.adminUsername || '-'}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                        <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Objetivo' : 'Target'}</div>
                        <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{log.targetType || '-'}</div>
                        <div className="mt-1 truncate text-xs text-gray-500">{log.targetId || '-'}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                        <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Origen' : 'Source'}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {getMethodBadge(method)}
                          {path ? <span className="truncate text-xs text-gray-700 dark:text-gray-300">{path}</span> : <span className="text-xs text-gray-500">-</span>}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                        <div className="text-xs uppercase tracking-[0.2em] text-gray-500">IP</div>
                        <div className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-white">{log.ipAddress || '-'}</div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
                        <FaWrench />
                        <span>{lang === 'es' ? 'Resumen' : 'Summary'}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{detailsPreview || (lang === 'es' ? 'Sin detalles' : 'No details')}</div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 xl:flex-col xl:items-end">
                    {path ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                        <FaGlobe />
                        <span className="max-w-[220px] truncate">{path}</span>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-2xl"
                      onClick={() => setExpanded((current) => ({ ...current, [log._id]: !current[log._id] }))}
                    >
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                      <span>{isExpanded ? (lang === 'es' ? 'Ocultar detalle' : 'Hide detail') : (lang === 'es' ? 'Ver detalle' : 'View detail')}</span>
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-[24px] border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                      <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Detalles' : 'Details'}</div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                        {typeof parsedDetails === 'string'
                          ? parsedDetails
                          : parsedDetails
                            ? JSON.stringify(parsedDetails, null, 2)
                            : '-'}
                      </pre>
                    </div>
                    <div className="rounded-[24px] border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                      <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Meta</div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                        {log.meta ? JSON.stringify(log.meta, null, 2) : '-'}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
