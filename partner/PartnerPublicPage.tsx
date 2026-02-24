'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '@/components/ui';
import { getClientLangFromCookie, type Lang, getDateLocale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import { PARTNER_SLOTS } from '@/lib/partnerPricing';
import { FaBolt, FaCrown, FaGem, FaShieldAlt } from 'react-icons/fa';

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

  const showRanking = !error && !loading && items.length > 0;

  return (
    <main className="max-w-6xl mx-auto py-10 px-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="absolute inset-0 bg-gradient-to-br from-minecraft-grass/15 via-transparent to-minecraft-diamond/10" />
        <div className="relative p-6 sm:p-10">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">Ranking en vivo</Badge>
                <Badge variant="warning">Slots limitados: {PARTNER_SLOTS}</Badge>
                <Badge variant="success">Estado online y jugadores</Badge>
              </div>

              <h1 className="mt-4 text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                Haz que tu servidor destaque
              </h1>
              <p className="mt-3 text-base sm:text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
                Publica tu servidor en nuestros <span className="font-semibold text-gray-900 dark:text-white">Partners destacados</span> para aparecer en el top,
                con banner, enlaces y ranking actualizado.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/partner/publicar" className="inline-flex">
                  <Button variant="primary" size="lg">
                    <FaBolt />
                    <span>Publicar mi servidor</span>
                  </Button>
                </Link>
                <Link href="#ranking" className="inline-flex">
                  <Button variant="secondary" size="lg">
                    <span>Ver ranking</span>
                  </Button>
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-white/70 dark:border-white/10 dark:bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                    <span className="h-9 w-9 rounded-xl grid place-items-center bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 text-minecraft-grass">
                      <FaCrown />
                    </span>
                    <span>Top visible</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">Aparece en un ranking con plazas limitadas.</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/70 dark:border-white/10 dark:bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                    <span className="h-9 w-9 rounded-xl grid place-items-center bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 text-minecraft-grass">
                      <FaGem />
                    </span>
                    <span>Perfil completo</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">Banner + descripción + web/Discord para que te encuentren rápido.</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/70 dark:border-white/10 dark:bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                    <span className="h-9 w-9 rounded-xl grid place-items-center bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 text-minecraft-grass">
                      <FaShieldAlt />
                    </span>
                    <span>Info en vivo</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">Mostramos online/offline y jugadores (cuando aplica).</div>
                </div>
              </div>
            </div>

            <Card hover={false} className="rounded-3xl border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-950/35 p-6 sm:p-8">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Cómo funciona</div>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-minecraft-grass/15 text-minecraft-grass grid place-items-center text-xs font-bold">1</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Rellena tu anuncio</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Nombre, IP, versión, descripción y banner.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-minecraft-grass/15 text-minecraft-grass grid place-items-center text-xs font-bold">2</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Elige tu puesto</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Compra un slot disponible dentro del top.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-minecraft-grass/15 text-minecraft-grass grid place-items-center text-xs font-bold">3</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Sale en el ranking</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Tu anuncio se muestra con datos y enlaces.</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 p-4">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Consejo rápido</div>
                <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                  Un buen banner + una descripción clara suelen marcar la diferencia.
                </div>
              </div>

              <div className="mt-5">
                <Link href="/partner/publicar" className="inline-flex w-full">
                  <Button variant="primary" size="md" className="w-full">
                    <span>Empezar ahora</span>
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="mt-8">
        {error ? (
          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-gray-900 dark:text-white font-semibold">No se pudo cargar el ranking</div>
                <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 break-words">{error}</div>
              </div>
              <Link href="/partner/publicar" className="shrink-0 hidden sm:inline-flex">
                <Button variant="secondary" size="sm">Publicar</Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Ranking */}
      <div id="ranking" className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Partners destacados</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Ranking en vivo • hasta {PARTNER_SLOTS} puestos
            </p>
          </div>
          <Link href="/partner/publicar" className="inline-flex">
            <Button variant="primary" size="md">Publicar mi servidor</Button>
          </Link>
        </div>
      </div>

      {!error && !loading && !items.length ? (
        <Card hover={false} className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25 overflow-hidden p-0">
          <div className="p-6 sm:p-8 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-minecraft-grass/10 via-transparent to-transparent" />
            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">Vacío</Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Aún no hay partners activos</span>
                  </div>
                  <div className="mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Sé el primero en ocupar un puesto del top
                  </div>
                  <div className="mt-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 max-w-2xl">
                    Publica tu servidor con un anuncio completo (banner, descripción y enlaces) para atraer jugadores.
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="info">Banner + enlaces</Badge>
                    <Badge variant="success">Datos en vivo</Badge>
                    <Badge variant="default">Slots limitados</Badge>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link href="/partner/publicar" className="inline-flex">
                    <Button variant="primary" size="lg">Publicar mi servidor</Button>
                  </Link>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Es rápido y sencillo.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className={`space-y-3 ${showRanking ? 'mt-6' : ''}`}>
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
                          <Badge variant="success">Destacado</Badge>
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
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">Cargando ranking…</div>
      ) : null}
    </main>
  );
}
