'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaKey,
  FaLifeRing,
  FaShieldAlt,
  FaSyncAlt,
} from 'react-icons/fa';
import { Badge, Button, Card } from '@/components/ui';
import { useClientLang } from '@/lib/useClientLang';

type LicenseStatusResponse = {
  ok: boolean;
  status: string;
  message: string;
  reason?: string;
  checkedAt?: number;
  expiresAt?: string | null;
  meta?: Record<string, any>;
};

function findMetaValue(meta: Record<string, any> | undefined, keys: string[]) {
  if (!meta) return null;

  const queue: Array<Record<string, any>> = [meta];
  const visited = new Set<Record<string, any>>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    for (const key of keys) {
      const value = current[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        queue.push(value as Record<string, any>);
      }
    }
  }

  return null;
}

function formatDate(value: string | number | null | undefined, lang: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
}

function formatRemaining(expiresAt: string | null | undefined, lang: string) {
  if (!expiresAt) return lang === 'es' ? 'Sin expiracion informada' : 'No expiry reported';
  const expires = new Date(expiresAt).getTime();
  if (!Number.isFinite(expires)) return '-';

  const diff = expires - Date.now();
  if (diff <= 0) return lang === 'es' ? 'Expirada' : 'Expired';

  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return lang === 'es' ? `${days}d ${hours}h restantes` : `${days}d ${hours}h remaining`;
  }

  return lang === 'es' ? `${hours}h restantes` : `${hours}h remaining`;
}

export default function AdminLicensePage() {
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
  const remainingLabel = useMemo(() => formatRemaining(data?.expiresAt, lang), [data?.expiresAt, lang]);
  const extractedInfo = (data?.meta?.extractedLicenseInfo as Record<string, any> | undefined) || undefined;
  const licenseId = findMetaValue(extractedInfo || data?.meta, ['licenseId', 'license_id', 'id', 'keyId', 'key_id']);
  const productId = findMetaValue(extractedInfo || data?.meta, ['productId', 'product_id', 'product', 'productName', 'product_name']);
  const domain = findMetaValue(extractedInfo || data?.meta, ['domain', 'host', 'site', 'url']);
  const issuedAt = findMetaValue(extractedInfo || data?.meta, ['issuedAt', 'issued_at', 'createdAt', 'created_at', 'startDate', 'start_date']);

  return (
    <div className="space-y-6">
      <Card hover={false} className="relative overflow-hidden rounded-[26px] border border-gray-200 bg-white px-5 py-5 dark:border-white/10 dark:bg-gray-950/25 md:px-6 md:py-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.14),transparent_36%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
              <FaKey className="text-sm text-minecraft-diamond" />
              <span>{lang === 'es' ? 'Licencia del proyecto' : 'Project license'}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-minecraft-diamond/10 text-lg text-minecraft-diamond md:h-12 md:w-12 md:text-xl">
                {data?.ok ? <FaShieldAlt /> : <FaExclamationTriangle />}
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 dark:text-white md:text-2xl">
                  {loading
                    ? lang === 'es'
                      ? 'Cargando estado de licencia'
                      : 'Loading license status'
                    : data?.ok
                      ? lang === 'es'
                        ? 'Licencia activa y validando'
                        : 'License active and validating'
                      : lang === 'es'
                        ? 'La licencia requiere atencion'
                        : 'License needs attention'}
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {lang === 'es'
                    ? 'Este panel es solo para admin y muestra la ultima comprobacion, el estado actual y el tiempo restante cuando la licencia informa expiracion.'
                    : 'This admin-only panel shows the latest check, the current validation state, and the remaining time when the license reports an expiry.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={badgeVariant as any}>{loading ? (lang === 'es' ? 'CARGANDO' : 'LOADING') : String(data?.status || 'unknown').toUpperCase()}</Badge>
            <Button variant="secondary" onClick={loadStatus} disabled={refreshing} className="rounded-xl px-4 py-2">
              <FaSyncAlt />
              <span>{refreshing ? (lang === 'es' ? 'Actualizando...' : 'Refreshing...') : (lang === 'es' ? 'Actualizar' : 'Refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card hover={false} className="rounded-[28px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Resultado' : 'Result'}</div>
          <div className="mt-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            {data?.ok ? <FaCheckCircle className="text-minecraft-grass" /> : <FaExclamationTriangle className="text-minecraft-redstone" />}
            <span>{data?.ok ? (lang === 'es' ? 'Valida' : 'Valid') : (lang === 'es' ? 'No valida' : 'Invalid')}</span>
          </div>
        </Card>

        <Card hover={false} className="rounded-[28px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Ultima comprobacion' : 'Last check'}</div>
          <div className="mt-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <FaClock className="text-minecraft-diamond" />
            <span>{formatDate(data?.checkedAt, lang)}</span>
          </div>
        </Card>

        <Card hover={false} className="rounded-[28px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Expira el' : 'Expires on'}</div>
          <div className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{formatDate(data?.expiresAt, lang)}</div>
        </Card>

        <Card hover={false} className="rounded-[28px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Tiempo restante' : 'Time remaining'}</div>
          <div className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{remainingLabel}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card hover={false} className="rounded-[28px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'ID de licencia' : 'License ID'}</div>
          <div className="mt-3 break-words text-sm font-bold text-gray-900 dark:text-white">{licenseId || '-'}</div>
        </Card>

        <Card hover={false} className="rounded-[28px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Producto' : 'Product'}</div>
          <div className="mt-3 break-words text-sm font-bold text-gray-900 dark:text-white">{productId || '-'}</div>
        </Card>

        <Card hover={false} className="rounded-[28px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Dominio / host' : 'Domain / host'}</div>
          <div className="mt-3 break-words text-sm font-bold text-gray-900 dark:text-white">{domain || '-'}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_0.8fr]">
        <Card hover={false} className="rounded-[28px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-sm font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Respuesta del validador' : 'Validator response'}</div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Motivo' : 'Reason'}</div>
              <div className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">{data?.reason || '-'}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Estado bruto' : 'Raw status'}</div>
              <div className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">{String(data?.status || '-')}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Emitida el' : 'Issued on'}</div>
              <div className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">{formatDate(issuedAt, lang)}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Expiracion detectada' : 'Detected expiry'}</div>
              <div className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">{formatDate(data?.expiresAt, lang)}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Mensaje del sistema' : 'System message'}</div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
              {data?.message || (loading ? (lang === 'es' ? 'Cargando...' : 'Loading...') : '-')}
            </div>
          </div>
        </Card>

        <Card hover={false} className="rounded-[28px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-sm font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Uso recomendado' : 'Recommended use'}</div>
          <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              {lang === 'es'
                ? 'Comprueba aqui la expiracion antes de renovaciones o despliegues.'
                : 'Check expiry here before renewals or deployments.'}
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              {lang === 'es'
                ? 'Si algo falla, copia motivo y mensaje para abrir soporte con contexto.'
                : 'If something fails, copy the reason and message before opening support.'}
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              {lang === 'es'
                ? 'Este panel no esta pensado para clientes finales; es una vista operativa del proyecto.'
                : 'This panel is not meant for end customers; it is an operational project view.'}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-minecraft-gold/20 bg-minecraft-gold/10 p-4 text-sm text-gray-800 dark:text-gray-100">
            <div className="flex items-center gap-2 font-semibold">
              <FaLifeRing className="text-minecraft-gold" />
              <span>{lang === 'es' ? 'Ruta de soporte' : 'Support path'}</span>
            </div>
            <p className="mt-2">
              {lang === 'es'
                ? 'Si el validador marca incidencia, revisa tambien la pagina publica de bloqueo antes de tocar el codigo de licencia.'
                : 'If the validator reports an issue, review the public block page before changing license code.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/licencia">
                <Button variant="secondary" className="rounded-2xl">
                  <FaShieldAlt />
                  <span>{lang === 'es' ? 'Ver pantalla publica' : 'View public block page'}</span>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
