'use client';

import { useEffect, useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { useClientLang } from '@/lib/useClientLang';

type LicenseStatusResponse = {
  ok: boolean;
  status: string;
  message: string;
  reason?: string;
  checkedAt?: number;
  expiresAt?: string | null;
};

function formatDate(value: string | number | null | undefined, lang: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
}

export default function PerfilLicenciaPage() {
  const lang = useClientLang();
  const [data, setData] = useState<LicenseStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/license/status', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      setData(payload as LicenseStatusResponse);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const badgeVariant = data?.ok ? 'success' : data?.status === 'unconfigured' ? 'warning' : 'danger';

  return (
    <div className="space-y-4">
      <Card
        hover={false}
        className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-gray-900 dark:text-white font-bold text-lg">
              {lang === 'es' ? 'Panel de licencia' : 'License panel'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {lang === 'es'
                ? 'Estado en tiempo real del sistema de validación comercial.'
                : 'Real-time status for the commercial validation system.'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={badgeVariant as any}>{loading ? (lang === 'es' ? 'CARGANDO' : 'LOADING') : String(data?.status || 'unknown').toUpperCase()}</Badge>
            <Button variant="secondary" onClick={loadStatus} disabled={refreshing}>
              {refreshing ? (lang === 'es' ? 'Actualizando...' : 'Refreshing...') : (lang === 'es' ? 'Actualizar' : 'Refresh')}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        hover={false}
        className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{lang === 'es' ? 'Resultado' : 'Result'}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{data?.ok ? (lang === 'es' ? 'Válida' : 'Valid') : (lang === 'es' ? 'No válida' : 'Invalid')}</div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{lang === 'es' ? 'Última comprobación' : 'Last check'}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatDate(data?.checkedAt, lang)}</div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{lang === 'es' ? 'Expiración' : 'Expiry'}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatDate(data?.expiresAt, lang)}</div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{lang === 'es' ? 'Motivo' : 'Reason'}</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1 break-words">{data?.reason || '-'}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs text-gray-500 uppercase tracking-wide">{lang === 'es' ? 'Mensaje del validador' : 'Validator message'}</div>
          <div className="text-sm text-gray-900 dark:text-white mt-2 whitespace-pre-wrap">
            {data?.message || (loading ? (lang === 'es' ? 'Cargando...' : 'Loading...') : '-')}
          </div>
        </div>
      </Card>
    </div>
  );
}