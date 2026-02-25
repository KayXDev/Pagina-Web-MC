'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '@/components/ui';
import { getDateLocale, t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { formatDateTime, normalizeExternalUrl } from '@/lib/utils';
import { PARTNER_PAID_MAX_SLOT, PARTNER_VIP_SLOT } from '@/lib/partnerPricing';
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

type BrowseItem = {
  _id: string;
  serverName: string;
  ownerUsername?: string;
  address?: string;
  version?: string;
  description?: string;
  banner?: string;
  website?: string;
  discord?: string;
  createdAt: string;
};

function getPodiumStyles(slot: number) {
  if (slot === PARTNER_VIP_SLOT) {
    return {
      border: '!border-minecraft-gold/80 dark:!border-minecraft-gold/55',
      ring: '!ring-2 !ring-minecraft-gold/25 dark:!ring-minecraft-gold/20',
      badge: '!bg-minecraft-gold !text-yellow-950 dark:!bg-minecraft-gold dark:!text-yellow-950',
      bannerGlow: 'from-minecraft-gold/12 via-transparent to-transparent',
      topBar: 'from-minecraft-gold/80 via-minecraft-gold/15 to-transparent',
      pulse: 'animate-pulse',
      label: 'VIP',
      ribbonWrap: 'bg-minecraft-gold text-yellow-950',
    };
  }
  if (slot === 1) {
    return {
      border: '!border-yellow-400/60 dark:!border-yellow-300/35',
      ring: '!ring-1 !ring-yellow-400/20 dark:!ring-yellow-300/15',
      badge: '!bg-yellow-500/15 !text-yellow-950 dark:!bg-yellow-400/15 dark:!text-yellow-100',
      bannerGlow: 'from-yellow-400/12 via-transparent to-transparent',
      topBar: 'from-yellow-400/80 via-yellow-300/15 to-transparent',
      pulse: 'animate-pulse',
      label: 'TOP 1',
    };
  }
  if (slot === 2) {
    return {
      border: '!border-slate-300/90 dark:!border-slate-200/45',
      ring: '!ring-1 !ring-slate-300/25 dark:!ring-slate-200/15',
      badge: '!bg-slate-500/15 !text-slate-950 dark:!bg-slate-200/15 dark:!text-slate-50',
      bannerGlow: 'from-slate-200/12 via-transparent to-transparent',
      topBar: 'from-slate-200/80 via-slate-200/20 to-transparent',
      pulse: '',
      label: 'TOP 2',
    };
  }
  if (slot === 3) {
    return {
      border: '!border-amber-500/70 dark:!border-amber-300/45',
      ring: '!ring-1 !ring-amber-500/20 dark:!ring-amber-300/15',
      badge: '!bg-amber-500/15 !text-amber-950 dark:!bg-amber-400/15 dark:!text-amber-50',
      bannerGlow: 'from-amber-500/12 via-transparent to-transparent',
      topBar: 'from-amber-500/80 via-amber-300/20 to-transparent',
      pulse: '',
      label: 'TOP 3',
    };
  }
  return null;
}

export default function PartnerPublicPage() {
  const lang = useClientLang();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ActiveItem[]>([]);

  const [browse, setBrowse] = useState<BrowseItem[]>([]);
  const [browseCursor, setBrowseCursor] = useState<string>('');
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);

  const [statusByAdId, setStatusByAdId] = useState<Record<string, ServerStatus | null>>({});

  const loadBrowse = async (reset: boolean) => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const excludeIds = Array.from(new Set(items.map((it) => String(it.ad.id || '')).filter(Boolean)));
      const qp = new URLSearchParams();
      qp.set('limit', '24');
      if (!reset && browseCursor) qp.set('cursor', browseCursor);
      if (excludeIds.length) qp.set('exclude', excludeIds.join(','));

      const res = await fetch(`/api/partner/browse?${qp.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));

      const nextItems = Array.isArray((data as any).items) ? ((data as any).items as BrowseItem[]) : [];
      const nextCursor = String((data as any).nextCursor || '').trim();

      setBrowse((prev) => (reset ? nextItems : [...prev, ...nextItems]));
      setBrowseCursor(nextCursor);
    } catch (e: any) {
      setBrowseError(String(e?.message || 'Error'));
      if (reset) setBrowse([]);
    } finally {
      setBrowseLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    void loadBrowse(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items.length]);

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
      await Promise.all(
        items.map(async (it) => {
          const address = String(it.ad.address || '').trim();
          const adId = String(it.ad.id || '').trim();
          if (!address || !adId) return;

          // Skip if already loaded (or attempted)
          if (Object.prototype.hasOwnProperty.call(statusByAdId, adId)) return;

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
  }, [items, statusByAdId]);

  useEffect(() => {
    if (!browse.length) return;

    const controllers: AbortController[] = [];
    let alive = true;

    const run = async () => {
      await Promise.all(
        browse.map(async (a) => {
          const address = String(a.address || '').trim();
          const adId = String(a._id || '').trim();
          if (!address || !adId) return;

          // Skip if already loaded (or attempted)
          if (Object.prototype.hasOwnProperty.call(statusByAdId, adId)) return;

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
  }, [browse, statusByAdId]);

  const dateLocale = getDateLocale(lang);

  const showRanking = !error && !loading && items.length > 0;

  return (
    <main className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{t(lang, 'partnerPublic.badges.liveRanking')}</Badge>
            <Badge variant="warning">
              {t(lang, 'partnerPublic.badges.featuredPrefix')}
              {PARTNER_PAID_MAX_SLOT}
            </Badge>
            <Badge variant="success">{t(lang, 'partnerPublic.badges.onlinePlayers')}</Badge>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{t(lang, 'partnerPublic.title')}</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {t(lang, 'partnerPublic.subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Link href="#ranking" className="inline-flex">
            <Button variant="secondary" size="md">{t(lang, 'partnerPublic.actions.viewRanking')}</Button>
          </Link>
          <Link href="/partner/publicar" className="inline-flex">
            <Button variant="primary" size="md">
              <FaBolt />
              <span>{t(lang, 'partnerPublic.actions.publishMyServer')}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      <div className="mt-8">
        {error ? (
          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-gray-900 dark:text-white font-semibold">{t(lang, 'partnerPublic.errors.cannotLoadRanking')}</div>
                <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 break-words">{error}</div>
              </div>
              <Link href="/partner/publicar" className="shrink-0 hidden sm:inline-flex">
                <Button variant="secondary" size="sm">{t(lang, 'partnerPublic.actions.publish')}</Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Ranking list (moved to the top area) */}
        <section id="ranking" className="min-w-0">
          {!error && !loading && !items.length ? (
            <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{t(lang, 'partnerPublic.badges.empty')}</Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t(lang, 'partnerPublic.emptyState.noActive')}</span>
                  </div>
                  <div className="mt-2 text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {t(lang, 'partnerPublic.emptyState.beFirstTitle')}
                  </div>
                  <div className="mt-1 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    {t(lang, 'partnerPublic.emptyState.beFirstDesc')}
                  </div>
                </div>
                <div className="shrink-0">
                  <Link href="/partner/publicar" className="inline-flex">
                    <Button variant="primary" size="md">{t(lang, 'partnerPublic.actions.publish')}</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : null}

          <div className={`space-y-3 ${showRanking ? '' : 'mt-0'}`}>
            {items
              .slice()
              .sort((a, b) => Number(a.slot) - Number(b.slot))
              .map((it) => {
                const banner = String(it.ad.banner || '').trim();
                const website = normalizeExternalUrl(String(it.ad.website || '').trim());
                const discord = normalizeExternalUrl(String(it.ad.discord || '').trim());
                const status = statusByAdId[String(it.ad.id || '')];
                const slotNum = Number(it.slot);
                const isVip = slotNum === PARTNER_VIP_SLOT;
                const podium = getPodiumStyles(slotNum);

                return (
                  <Card
                    key={`${it.slot}-${it.ad.id}`}
                    hover={false}
                    className={`relative mx-auto w-full max-w-[920px] !rounded-2xl !border overflow-hidden !p-0 !bg-white dark:!bg-gray-950/25 ${
                      podium ? `${podium.border} ${podium.ring}` : '!border-gray-200 dark:!border-white/10'
                    }`}
                  >
                    {isVip ? (
                      <div className="pointer-events-none absolute left-3 top-3 z-10">
                        <div className="relative">
                          <div className={`rounded-full px-3 py-1 text-xs font-extrabold tracking-wide ${podium?.ribbonWrap || 'bg-minecraft-gold text-yellow-950'}`}>
                            <span className="inline-flex items-center">
                              <FaCrown className="mr-1" />
                              VIP
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {isVip ? (
                      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-[5px] bg-minecraft-gold/80" />
                    ) : null}

                    {podium ? (
                      <div className={`absolute left-0 right-0 top-0 h-[4px] bg-gradient-to-r ${podium.topBar} ${podium.pulse}`} />
                    ) : null}

                    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
                      <div className="relative w-full h-28 sm:h-full min-h-28 bg-gray-100 dark:bg-white/5">
                        {banner ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={banner} alt={it.ad.serverName} className="absolute inset-0 w-full h-full object-cover" />
                        ) : null}
                        {banner && podium ? (
                          <div className={`absolute inset-0 bg-gradient-to-br ${podium.bannerGlow}`} />
                        ) : null}
                        {banner && !podium ? (
                          <div className="absolute inset-0 bg-gradient-to-br from-minecraft-grass/20 via-transparent to-transparent" />
                        ) : null}
                        {!banner ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                            <div className="mt-1 text-[12px] text-gray-600 dark:text-gray-400">{t(lang, 'partnerPublic.fields.noBanner')}</div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex-1 p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-gray-900 dark:text-white font-bold text-base sm:text-lg truncate">{it.ad.serverName}</div>
                              {podium ? (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold ${podium.badge}`}>
                                  {isVip ? (
                                    <>
                                      <FaCrown className="mr-1" />
                                      <span>VIP</span>
                                    </>
                                  ) : (
                                    podium.label
                                  )}
                                </span>
                              ) : (
                                <Badge variant="success">{t(lang, 'partnerPublic.badges.featured')}</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{it.ad.address}{it.ad.version ? ` • ${it.ad.version}` : ''}</div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">{t(lang, 'partnerPublic.fields.players')}</div>
                            {status === undefined ? (
                              <div className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">—</div>
                            ) : status && status.online ? (
                              <div className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                                {status.players.online}/{status.players.max}
                              </div>
                            ) : (
                              <div className="text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">{t(lang, 'partnerPublic.fields.offline')}</div>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed line-clamp-3">{it.ad.description}</div>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {website ? (
                            <a href={website} target="_blank" rel="noreferrer" className="text-base text-minecraft-grass hover:underline">{t(lang, 'partnerPublic.fields.web')}</a>
                          ) : null}
                          {discord ? (
                            <a href={discord} target="_blank" rel="noreferrer" className="text-base text-minecraft-grass hover:underline">{t(lang, 'partnerPublic.fields.discord')}</a>
                          ) : null}
                          {it.endsAt ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {t(lang, 'partnerPublic.fields.activeUntil')} {formatDateTime(it.endsAt, dateLocale)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>

          {loading ? <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t(lang, 'partnerPublic.badges.loadingRanking')}</div> : null}

          <div className="mt-10">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-gray-900 dark:text-white font-bold text-lg">{t(lang, 'partnerPublic.all.title')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t(lang, 'partnerPublic.all.subtitle')}</div>
              </div>
            </div>

            {browseError ? <div className="mt-3 text-sm text-red-600 dark:text-red-300">{browseError}</div> : null}

            <div className="mt-3 space-y-3">
              {browse.map((a) => {
                const banner = String(a.banner || '').trim();
                const website = normalizeExternalUrl(String(a.website || '').trim());
                const discord = normalizeExternalUrl(String(a.discord || '').trim());
                const status = statusByAdId[String(a._id || '')];
                return (
                  <Card
                    key={a._id}
                    hover={false}
                    className="mx-auto w-full max-w-[920px] rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                      <div className="relative w-full h-24 sm:h-full min-h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5">
                        {banner ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={banner} alt={a.serverName} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center text-xs text-gray-600 dark:text-gray-400">{t(lang, 'partnerPublic.fields.noBanner')}</div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-gray-900 dark:text-white font-bold truncate">{a.serverName}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{String(a.address || '')}{a.version ? ` • ${a.version}` : ''}</div>
                          </div>
                          <div className="shrink-0">
                            {status === undefined ? (
                              <Badge variant="default">{t(lang, 'partnerPublic.badges.loading')}</Badge>
                            ) : status && status.online ? (
                              <Badge variant="success">
                                {Number(status.players?.online || 0)}/{Number(status.players?.max || 0)} {t(lang, 'partnerPublic.fields.playersSuffix')}
                              </Badge>
                            ) : (
                              <Badge variant="default">{t(lang, 'partnerPublic.fields.offline')}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">{a.description}</div>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {website ? (
                            <a href={website} target="_blank" rel="noreferrer" className="text-sm text-minecraft-grass hover:underline">{t(lang, 'partnerPublic.fields.web')}</a>
                          ) : null}
                          {discord ? (
                            <a href={discord} target="_blank" rel="noreferrer" className="text-sm text-minecraft-grass hover:underline">{t(lang, 'partnerPublic.fields.discord')}</a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="mt-4">
              <Button
                variant="secondary"
                size="md"
                onClick={() => void loadBrowse(false)}
                disabled={browseLoading || !browseCursor}
              >
                {browseLoading ? t(lang, 'partnerPublic.badges.loading') : browseCursor ? t(lang, 'partnerPublic.actions.loadMore') : t(lang, 'partnerPublic.actions.noMore')}
              </Button>
            </div>
          </div>
        </section>

        {/* Right rail */}
        <aside className="space-y-3">
          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'partnerPublic.why.title')}</div>
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl grid place-items-center bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 text-minecraft-grass">
                  <FaCrown />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'partnerPublic.why.topTitle')}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t(lang, 'partnerPublic.why.topDesc')}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl grid place-items-center bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 text-minecraft-grass">
                  <FaGem />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'partnerPublic.why.fullTitle')}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t(lang, 'partnerPublic.why.fullDesc')}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl grid place-items-center bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 text-minecraft-grass">
                  <FaShieldAlt />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'partnerPublic.why.liveTitle')}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t(lang, 'partnerPublic.why.liveDesc')}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'partnerPublic.how.title')}</div>
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-minecraft-grass/15 text-minecraft-grass grid place-items-center text-xs font-bold">1</div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'partnerPublic.how.step1Title')}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t(lang, 'partnerPublic.how.step1Desc')}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-minecraft-grass/15 text-minecraft-grass grid place-items-center text-xs font-bold">2</div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'partnerPublic.how.step2Title')}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {t(lang, 'partnerPublic.how.step2DescPrefix')}
                    {PARTNER_PAID_MAX_SLOT}
                    {t(lang, 'partnerPublic.how.step2DescSuffix')}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-minecraft-grass/15 text-minecraft-grass grid place-items-center text-xs font-bold">3</div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'partnerPublic.how.step3Title')}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t(lang, 'partnerPublic.how.step3Desc')}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 p-4">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t(lang, 'partnerPublic.how.tipLabel')}</div>
              <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">{t(lang, 'partnerPublic.how.tipText')}</div>
            </div>

            <div className="mt-4">
              <Link href="/partner/publicar" className="inline-flex w-full">
                <Button variant="primary" size="md" className="w-full">{t(lang, 'partnerPublic.actions.startNow')}</Button>
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
