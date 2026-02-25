'use client';

import { useClientLang } from '@/lib/useClientLang';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaGift, FaExternalLinkAlt, FaVoteYea } from 'react-icons/fa';
import AnimatedSection from '@/components/AnimatedSection';
import { Badge, Card } from '@/components/ui';
import { t } from '@/lib/i18n';
import { VOTE_SITES } from '@/lib/voteSites';
import { useSession } from 'next-auth/react';

type LeaderboardItem = {
  userId: string;
  username: string;
  votes: number;
};

function recordVoteClick(site: string) {
  try {
    const payload = JSON.stringify({ site });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/votes/click', blob);
      return;
    }

    fetch('/api/votes/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // best-effort
  }
}

export default function VotePage() {
  const lang = useClientLang();
  const { status } = useSession();
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingLeaderboard(true);
        const res = await fetch('/api/votes/leaderboard?days=30&limit=10', { cache: 'no-store' });
        const data = await res.json();
        const items = Array.isArray(data?.items) ? (data.items as LeaderboardItem[]) : [];
        if (!cancelled) setLeaderboard(items);
      } catch {
        if (!cancelled) setLeaderboard([]);
      } finally {
        if (!cancelled) setLoadingLeaderboard(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <AnimatedSection>
        <Card
          hover={false}
          className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/70 dark:border-white/10 dark:bg-gray-950/25"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-minecraft-grass/10 via-transparent to-minecraft-diamond/10" />
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                  <span className="h-6 w-6 rounded-full bg-minecraft-gold/15 text-minecraft-gold grid place-items-center">
                    <FaVoteYea className="text-sm" />
                  </span>
                  <span>{t(lang, 'vote.title')}</span>
                </div>

                <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  {t(lang, 'vote.linksTitle')}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
                  {t(lang, 'vote.headerDesc')}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <a
                    href="#vote-sites"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-minecraft-grass px-4 py-2 text-sm font-semibold text-white hover:bg-minecraft-grass/85 border border-minecraft-grass/20 shadow-lg shadow-minecraft-grass/15"
                  >
                    <FaExternalLinkAlt className="text-sm" />
                    <span>{t(lang, 'vote.cta')}</span>
                  </a>
                  <Badge variant="info">{VOTE_SITES.length}</Badge>
                </div>
              </div>

              <div className="w-full lg:w-[360px]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t(lang, 'vote.rewardsTitle')}</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'vote.rewardsSubtitle')}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t(lang, 'vote.topTitle')}</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">30d</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section id="vote-sites" className="lg:col-span-7">
            <Card hover={false} className="border-gray-200 dark:border-white/10">
              <div className="flex items-end justify-between gap-3 mb-5">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{t(lang, 'vote.linksTitle')}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t(lang, 'vote.linksSubtitle')}</div>
                </div>
                <Badge variant="info">{VOTE_SITES.length}</Badge>
              </div>

              {VOTE_SITES.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t(lang, 'vote.comingTitle')}</div>
                  <div className="text-gray-600 dark:text-gray-400">{t(lang, 'vote.comingDesc')}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {VOTE_SITES.map((site) => (
                    <div
                      key={site.name}
                      className="rounded-2xl border border-gray-200 bg-white/80 p-4 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-minecraft-gold shrink-0">
                              <FaVoteYea />
                            </div>
                            <div className="min-w-0">
                              <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{site.name}</div>
                              {site.description ? (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{site.description}</div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Link
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => recordVoteClick(site.name)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-minecraft-grass px-4 py-2.5 text-sm font-semibold text-white hover:bg-minecraft-grass/85 border border-minecraft-grass/20 shadow-lg shadow-minecraft-grass/15"
                          >
                            <FaExternalLinkAlt className="text-sm" />
                            <span className="hidden sm:inline">{t(lang, 'vote.cta')}</span>
                            <span className="sm:hidden">{t(lang, 'vote.cta')}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <aside className="lg:col-span-5 space-y-6">
            <Card
              hover={false}
              className="border-gray-200 dark:border-white/10 bg-gradient-to-br from-minecraft-grass/10 to-minecraft-diamond/10"
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{t(lang, 'vote.howTitle')}</div>
                </div>
                <div className="shrink-0 h-10 w-10 rounded-2xl bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-minecraft-gold">
                  <FaVoteYea />
                </div>
              </div>

              <ol className="space-y-3">
                {[t(lang, 'vote.howStep1'), t(lang, 'vote.howStep2'), t(lang, 'vote.howStep3')].map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
                  >
                    <Badge variant="info" className="mt-0.5">
                      {idx + 1}
                    </Badge>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-9 w-9 rounded-2xl bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-minecraft-gold shrink-0">
                    <FaGift />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white">{t(lang, 'vote.rewardsTitle')}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'vote.rewardsSubtitle')}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{t(lang, 'vote.rewardsText')}</div>
              </div>
            </Card>

            <Card hover={false} className="border-gray-200 dark:border-white/10">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{t(lang, 'vote.topTitle')}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t(lang, 'vote.topSubtitle')}</div>
                </div>
                {status !== 'authenticated' ? <Badge variant="warning">{t(lang, 'vote.topLoginHint')}</Badge> : null}
              </div>

              {loadingLeaderboard ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">{t(lang, 'common.loading')}</div>
              ) : leaderboard.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">{t(lang, 'vote.topEmpty')}</div>
              ) : (
                <ol className="space-y-2">
                  {leaderboard.map((item, idx) => (
                    <li
                      key={item.userId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-black/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="info">#{idx + 1}</Badge>
                        <span className="font-semibold text-gray-900 dark:text-white truncate">{item.username}</span>
                      </div>
                      <Badge variant="success">{item.votes}</Badge>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </aside>
        </div>
      </AnimatedSection>
    </div>
  );
}
