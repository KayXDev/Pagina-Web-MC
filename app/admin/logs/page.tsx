'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaHistory, FaSyncAlt } from 'react-icons/fa';
import { Card, Badge, Input, Button } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';
import { getClientLangFromCookie, t, type Lang } from '@/lib/i18n';

interface Log {
  _id: string;
  adminUsername: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  meta?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export default function AdminLogsPage() {
  const { data: session } = useSession();
  const [lang, setLang] = useState<Lang>('es');
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const isOwner = session?.user?.role === 'OWNER';
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);

  const fetchLogs = async (langOverride?: Lang) => {
    const useLang = langOverride || lang;
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/logs?limit=200', { cache: 'no-store' });
      if (!response.ok) throw new Error(t(useLang, 'admin.logs.loadError'));
      const data = await response.json();
      setLogs(Array.isArray(data) ? (data as Log[]) : []);
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
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as any).error || t(useLang, 'admin.logs.webhookLoadError'));
      setWebhookUrl(String((data as any).webhookUrl || ''));
    } catch (err: any) {
      toast.error(err?.message || t(useLang, 'admin.logs.webhookLoadError'));
    } finally {
      setWebhookLoading(false);
    }
  };

  useEffect(() => {
    const clientLang = getClientLangFromCookie();
    setLang(clientLang);
    fetchLogs(clientLang);
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
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || t(lang, 'admin.logs.webhookSaveError'));
      }
      toast.success(t(lang, 'admin.logs.webhookSaved'));
    } catch (err: any) {
      toast.error(err?.message || t(lang, 'admin.logs.webhookSaveError'));
    } finally {
      setWebhookSaving(false);
    }
  };

  const truncate = (value: string, max = 110) => {
    if (!value) return value;
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE')) return <Badge variant="success">CREATE</Badge>;
    if (action.includes('UPDATE')) return <Badge variant="warning">UPDATE</Badge>;
    if (action.includes('DELETE')) return <Badge variant="danger">DELETE</Badge>;
    return <Badge variant="info">{action}</Badge>;
  };

  const getMethodBadge = (method?: string) => {
    if (!method) return null;
    const normalized = String(method).toUpperCase();
    const variant =
      normalized === 'GET'
        ? ('info' as const)
        : normalized === 'POST'
          ? ('success' as const)
          : normalized === 'PATCH' || normalized === 'PUT'
            ? ('warning' as const)
            : normalized === 'DELETE'
              ? ('danger' as const)
              : ('default' as const);
    return <Badge variant={variant}>{normalized}</Badge>;
  };

  const safeParseDetails = (details?: string) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return details;
    }
  };

  const getDetailsPreview = (details?: string) => {
    if (!details) return '';
    const parsed = safeParseDetails(details);
    if (!parsed) return '';
    if (typeof parsed === 'string') return truncate(parsed, 140);
    try {
      return truncate(JSON.stringify(parsed), 140);
    } catch {
      return '';
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredLogs = useMemo(() => {
    if (!normalizedSearch) return logs;
    return logs.filter((log) => {
      const blob = [
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
      return blob.includes(normalizedSearch);
    });
  }, [logs, normalizedSearch]);

  const counts = useMemo(() => {
    return filteredLogs.reduce(
      (acc, log) => {
        if (log.action.includes('CREATE')) acc.create++;
        else if (log.action.includes('UPDATE')) acc.update++;
        else if (log.action.includes('DELETE')) acc.delete++;
        else acc.other++;
        return acc;
      },
      { create: 0, update: 0, delete: 0, other: 0 }
    );
  }, [filteredLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white">
              <FaHistory />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white truncate">{t(lang, 'admin.logs.title')}</h1>
              <p className="text-gray-400 text-sm md:text-base">{t(lang, 'admin.logs.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-start md:justify-end">
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              {t(lang, 'admin.logs.total')}: {filteredLogs.length}
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fetchLogs()}
              disabled={refreshing}
              className="h-9"
            >
              <FaSyncAlt />
              <span>{refreshing ? t(lang, 'common.loading') : t(lang, 'admin.dashboard.refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Owner webhook config */}
      {isOwner ? (
        <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-white font-semibold">{t(lang, 'admin.logs.webhookTitle')}</div>
              <div className="text-xs text-gray-400">{t(lang, 'admin.logs.webhookDesc')}</div>
            </div>
            <div className="text-xs text-gray-500">
              {webhookLoading
                ? t(lang, 'common.loading')
                : webhookUrl.trim()
                  ? t(lang, 'admin.logs.webhookConfigured')
                  : t(lang, 'admin.logs.webhookNotConfigured')}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-3">
              <Input
                type="url"
                placeholder={t(lang, 'admin.logs.webhookPlaceholder')}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                disabled={webhookLoading || webhookSaving}
              />
              <div className="text-xs text-gray-500 mt-2">{t(lang, 'admin.logs.webhookDisableHint')}</div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={saveWebhook}
              disabled={webhookLoading || webhookSaving}
              className="w-full"
            >
              <span>{webhookSaving ? t(lang, 'admin.logs.saving') : t(lang, 'common.save')}</span>
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Search + summary */}
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'admin.logs.search')}</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(lang, 'admin.logs.searchPlaceholder')}
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              CREATE: {counts.create}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              UPDATE: {counts.update}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              DELETE: {counts.delete}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-200">
              {t(lang, 'admin.logs.other')}: {counts.other}
            </span>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl p-0 overflow-hidden" hover={false}>
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/10 bg-gray-950/40 text-xs text-gray-400">
          <div className="col-span-2">{t(lang, 'admin.logs.columns.time')}</div>
          <div className="col-span-2">{t(lang, 'admin.logs.columns.admin')}</div>
          <div className="col-span-2">{t(lang, 'admin.logs.columns.action')}</div>
          <div className="col-span-3">{t(lang, 'admin.logs.columns.target')}</div>
          <div className="col-span-2">{t(lang, 'admin.logs.columns.source')}</div>
          <div className="col-span-1 text-right">{t(lang, 'admin.logs.columns.ip')}</div>
        </div>

        {loading ? (
          <div className="p-4">
            <Card className="shimmer h-24" hover={false} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 px-6">{t(lang, 'admin.logs.empty')}</div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredLogs.map((log) => {
              const isExpanded = Boolean(expanded[log._id]);
              const method = log.meta?.method ? String(log.meta.method) : undefined;
              const path = log.meta?.path ? String(log.meta.path) : undefined;
              const detailsPreview = getDetailsPreview(log.details);
              const parsedDetails = safeParseDetails(log.details);

              return (
                <div key={log._id} className="bg-transparent">
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 items-start">
                    {/* Time */}
                    <div className="col-span-12 md:col-span-2">
                      <div className="text-gray-400 text-xs md:text-sm">{formatDateTime(log.createdAt)}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {getMethodBadge(method)}
                        {path ? (
                          <span className="text-xs text-gray-300 px-2 py-1 rounded-md bg-white/5 border border-white/10 truncate max-w-[320px]">
                            {path}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Admin */}
                    <div className="col-span-7 md:col-span-2 min-w-0">
                      <div className="text-white font-medium truncate">{log.adminUsername}</div>
                      {log.meta?.userAgent ? (
                        <div className="text-xs text-gray-600 mt-1 truncate">{String(log.meta.userAgent)}</div>
                      ) : (
                        <div className="text-xs text-gray-600 mt-1">{t(lang, 'admin.logs.noValue')}</div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="col-span-5 md:col-span-2 flex flex-col items-start gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {getActionBadge(log.action)}
                      </div>
                      <div className="text-xs text-gray-500 truncate w-full">{truncate(log.action, 90)}</div>
                    </div>

                    {/* Target */}
                    <div className="col-span-12 md:col-span-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {log.targetType ? <Badge variant="default">{log.targetType}</Badge> : null}
                        {log.targetId ? (
                          <span className="text-xs text-gray-400 break-all">#{log.targetId}</span>
                        ) : (
                          <span className="text-xs text-gray-600">{t(lang, 'admin.logs.noValue')}</span>
                        )}
                      </div>
                      {detailsPreview ? <div className="mt-2 text-xs text-gray-500 truncate">{detailsPreview}</div> : null}
                    </div>

                    {/* Source */}
                    <div className="col-span-8 md:col-span-2 min-w-0">
                      <div className="text-sm text-gray-200 truncate">
                        {method || path
                          ? `${method ? String(method).toUpperCase() : ''}${method && path ? ' ' : ''}${path || ''}`
                          : t(lang, 'admin.logs.noValue')}
                      </div>
                      {log.meta?.ref ? (
                        <div className="mt-1 text-xs text-gray-600 truncate">{String(log.meta.ref)}</div>
                      ) : null}
                    </div>

                    {/* IP + expand */}
                    <div className="col-span-4 md:col-span-1 flex flex-col items-end gap-2">
                      <div className="text-xs text-gray-300 break-all text-right">
                        {log.ipAddress || t(lang, 'admin.logs.noValue')}
                      </div>
                      {log.details || log.meta ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          aria-expanded={isExpanded}
                          onClick={() => setExpanded((prev) => ({ ...prev, [log._id]: !prev[log._id] }))}
                        >
                          <span>{isExpanded ? t(lang, 'admin.logs.hideDetails') : t(lang, 'admin.logs.viewDetails')}</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-400 mb-2">{t(lang, 'admin.logs.details')}</div>
                          {log.details ? (
                            <pre className="text-xs text-gray-200 whitespace-pre-wrap bg-black/30 border border-white/10 rounded-md p-3 overflow-x-auto">
                              {typeof parsedDetails === 'string'
                                ? parsedDetails
                                : JSON.stringify(parsedDetails, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-xs text-gray-600">{t(lang, 'admin.logs.noValue')}</div>
                          )}
                        </div>

                        <div>
                          <div className="text-xs text-gray-400 mb-2">{t(lang, 'admin.logs.meta')}</div>
                          {log.meta ? (
                            <pre className="text-xs text-gray-200 whitespace-pre-wrap bg-black/30 border border-white/10 rounded-md p-3 overflow-x-auto">
                              {JSON.stringify(log.meta, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-xs text-gray-600">{t(lang, 'admin.logs.noValue')}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
