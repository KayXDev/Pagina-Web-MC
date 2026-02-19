'use client';

import { useEffect, useState } from 'react';
import { FaHistory } from 'react-icons/fa';
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

  const isOwner = session?.user?.role === 'OWNER';
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!isOwner) return;

    const fetchWebhook = async () => {
      setWebhookLoading(true);
      try {
        const response = await fetch('/api/admin/logs/webhook');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || t(lang, 'admin.logs.webhookLoadError'));
        }
        setWebhookUrl(String(data.webhookUrl || ''));
      } catch (err: any) {
        toast.error(err?.message || t(lang, 'admin.logs.webhookLoadError'));
      } finally {
        setWebhookLoading(false);
      }
    };

    fetchWebhook();
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

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs?limit=200');
      if (!response.ok) throw new Error(t(lang, 'admin.logs.loadError'));
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      toast.error(t(lang, 'admin.logs.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE')) return <Badge variant="success">CREATE</Badge>;
    if (action.includes('UPDATE')) return <Badge variant="warning">UPDATE</Badge>;
    if (action.includes('DELETE')) return <Badge variant="danger">DELETE</Badge>;
    return <Badge variant="info">{action}</Badge>;
  };

  const safeParseDetails = (details?: string) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return details;
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredLogs = normalizedSearch
    ? logs.filter((log) => {
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
      })
    : logs;

  const counts = filteredLogs.reduce(
    (acc, log) => {
      if (log.action.includes('CREATE')) acc.create++;
      else if (log.action.includes('UPDATE')) acc.update++;
      else if (log.action.includes('DELETE')) acc.delete++;
      else acc.other++;
      return acc;
    },
    { create: 0, update: 0, delete: 0, other: 0 }
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t(lang, 'admin.logs.title')}</h1>
        <p className="text-gray-400">{t(lang, 'admin.logs.subtitle')}</p>
      </div>

      {isOwner ? (
        <Card className="mb-6" hover={false}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-white font-semibold">{t(lang, 'admin.logs.webhookTitle')}</div>
              <div className="text-xs text-gray-400">
                {t(lang, 'admin.logs.webhookDesc')}
              </div>
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
              <div className="text-xs text-gray-500 mt-2">
                {t(lang, 'admin.logs.webhookDisableHint')}
              </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-gray-400 text-sm mb-1">{t(lang, 'admin.logs.search')}</div>
          <Input
            type="text"
            placeholder={t(lang, 'admin.logs.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Card>
        <Card>
          <div className="text-gray-400 text-sm mb-2">{t(lang, 'admin.logs.summary')}</div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">CREATE: {counts.create}</Badge>
            <Badge variant="warning">UPDATE: {counts.update}</Badge>
            <Badge variant="danger">DELETE: {counts.delete}</Badge>
            <Badge variant="info">{t(lang, 'admin.logs.other')}: {counts.other}</Badge>
          </div>
        </Card>
        <Card>
          <div className="text-gray-400 text-sm mb-2">{t(lang, 'admin.logs.total')}</div>
          <div className="text-white text-2xl font-bold">{filteredLogs.length}</div>
          <div className="text-xs text-gray-500">{t(lang, 'admin.logs.showing')}</div>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-400">{t(lang, 'admin.logs.loading')}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20">
            <FaHistory className="text-6xl text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">{t(lang, 'admin.logs.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const parsedDetails = safeParseDetails(log.details);
              const isExpanded = !!expanded[log._id];

              return (
              <div
                key={log._id}
                className="bg-gray-900/50 border border-gray-800 rounded-md p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-white font-medium truncate">{log.adminUsername}</span>
                      {getActionBadge(log.action)}
                      {log.targetType && <Badge variant="default">{log.targetType}</Badge>}
                      {log.targetId && (
                        <span className="text-xs text-gray-500 break-all">#{log.targetId}</span>
                      )}
                    </div>
                    {log.ipAddress ? (
                      <div className="text-xs text-gray-500 break-all">IP: {log.ipAddress}</div>
                    ) : null}
                  </div>
                  <span className="text-gray-500 text-sm shrink-0">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>

                {(log.details || log.meta) ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [log._id]: !prev[log._id] }))
                      }
                    >
                      {isExpanded ? t(lang, 'admin.logs.hideDetails') : t(lang, 'admin.logs.viewDetails')}
                    </Button>

                    {isExpanded ? (
                      <div className="mt-3 space-y-3">
                        {log.details ? (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">{t(lang, 'admin.logs.details')}</div>
                            <pre className="text-xs text-gray-200 whitespace-pre-wrap bg-black/30 border border-gray-800 rounded-md p-3">
                              {typeof parsedDetails === 'string'
                                ? parsedDetails
                                : JSON.stringify(parsedDetails, null, 2)}
                            </pre>
                          </div>
                        ) : null}

                        {log.meta ? (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">{t(lang, 'admin.logs.meta')}</div>
                            <pre className="text-xs text-gray-200 whitespace-pre-wrap bg-black/30 border border-gray-800 rounded-md p-3">
                              {JSON.stringify(log.meta, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
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
