'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '@/components/ui';
import { getClientLangFromCookie, type Lang, getDateLocale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import { PARTNER_SLOTS } from '@/lib/partnerPricing';

type ServerStatus = {
  online: boolean;
  players: {
    online: number;
    max: number;
  };
};

function parseHostPort(address: string): { host: string; port?: number } {
  const trimmed = String(address || '').trim();

  // domain:25565
  const m = trimmed.match(/^(.*):(\d{2,5})$/);
  if (m) {
    const host = String(m[1] || '').trim();
    const port = Number(m[2]);
    if (host && Number.isFinite(port)) return { host, port };
  }

  return { host: trimmed };
}

type ActiveItem = {
  slot: number;
  startsAt?: string;
  endsAt?: string;
  ad: {
    id: string;
    serverName: string;
    ownerUsername?: string;
    address?: string;
    version?: string;
    description?: string;
    banner?: string;
    website?: string;
    discord?: string;
  };
};

export default function PartnerPublicPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ActiveItem[]>([]);

  const [statusByAdId, setStatusByAdId] = useState<Record<string, ServerStatus | null>>({});

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/partner/active', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
        setItems(Array.isArray((data as any).items) ? (data as any).items : []);
      } catch (e: any) {
        setError(String(e?.message || 'Error'));
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (!items.length) return;

    const controllers: AbortController[] = [];
    let alive = true;
    const run = async () => {
      // Reset statuses on fresh list load
      setStatusByAdId({});

      await Promise.all(
        items.map(async (it) => {
          const address = String(it.ad.address || '').trim();
          const adId = String(it.ad.id || '').trim();
          if (!address || !adId) return;

          const { host, port } = parseHostPort(address);
          if (!host) return;

          const controller = new AbortController();
          controllers.push(controller);

          try {
            const qs = new URLSearchParams({ host });
            if (typeof port === 'number' && Number.isFinite(port)) qs.set('port', String(port));
            const res = await fetch(`/api/server/status?${qs.toString()}`, {
              cache: 'no-store',
              signal: controller.signal,
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data) throw new Error('status');

            const parsed: ServerStatus = {
              online: Boolean((data as any).online),
              players: {
                online: Number((data as any)?.players?.online || 0),
                max: Number((data as any)?.players?.max || 0),
              },
            };

            if (!alive) return;
            setStatusByAdId((prev) => ({ ...prev, [adId]: parsed }));
          } catch {
            if (!alive) return;
            setStatusByAdId((prev) => ({ ...prev, [adId]: null }));
          }
        })
      );
    };

    void run();

    return () => {
      alive = false;
      controllers.forEach((c) => c.abort());
    };
  }, [items]);

  const dateLocale = getDateLocale(lang);

  return (
    <main className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Partners destacados</h1>
          <p className="text-base text-gray-600 dark:text-gray-400 mt-1">Ranking en vivo • hasta {PARTNER_SLOTS} puestos</p>
        </div>
        <Link href="/partner/publicar" className="inline-flex">
          <Button variant="primary" size="md">Publicar mi servidor</Button>
        </Link>
      </div>

      {error ? (
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-gray-900 dark:text-white font-semibold">No se pudo cargar</div>
          <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">{error}</div>
        </Card>
      ) : null}

      {!error && !loading && !items.length ? (
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-gray-900 dark:text-white font-semibold">Aún no hay partners activos</div>
          <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">Sé el primero en aparecer en el ranking.</div>
          <div className="mt-4">
            <Link href="/partner/publicar" className="inline-flex">
              <Button variant="primary" size="sm">Publicar mi servidor</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {items
          .slice()
          .sort((a, b) => Number(a.slot) - Number(b.slot))
          .map((it) => {
            const banner = String(it.ad.banner || '').trim();
            const website = String(it.ad.website || '').trim();
            const discord = String(it.ad.discord || '').trim();
            const status = statusByAdId[String(it.ad.id || '')];

            return (
              <Card key={`${it.slot}-${it.ad.id}`} hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25 overflow-hidden p-0">
                <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr]">
                  <div className="relative w-full h-32 sm:h-full min-h-32 bg-gray-100 dark:bg-white/5">
                    {banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={banner} alt={it.ad.serverName} className="absolute inset-0 w-full h-full object-cover" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-br from-minecraft-grass/20 via-transparent to-transparent" />
                    {!banner ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">#{it.slot}</div>
                        <div className="mt-1 text-[12px] text-gray-600 dark:text-gray-400">Sin banner</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-gray-900 dark:text-white font-bold text-lg sm:text-xl truncate">#{it.slot} • {it.ad.serverName}</div>
                          <Badge variant="success">Activo</Badge>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{it.ad.address}{it.ad.version ? ` • ${it.ad.version}` : ''}</div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">Jugadores</div>
                        {status === undefined ? (
                          <div className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">—</div>
                        ) : status && status.online ? (
                          <div className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                            {status.players.online}/{status.players.max}
                          </div>
                        ) : (
                          <div className="text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">Offline</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-gray-700 dark:text-gray-300 text-base leading-relaxed line-clamp-3">{it.ad.description}</div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {website ? (
                        <a href={website} target="_blank" rel="noreferrer" className="text-base text-minecraft-grass hover:underline">Web</a>
                      ) : null}
                      {discord ? (
                        <a href={discord} target="_blank" rel="noreferrer" className="text-base text-minecraft-grass hover:underline">Discord</a>
                      ) : null}
                      {it.endsAt ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Activo hasta: {formatDateTime(it.endsAt, dateLocale)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">Cargando…</div>
      ) : null}
    </main>
  );
}
