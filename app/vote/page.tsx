'use client';

import { useClientLang } from '@/lib/useClientLang';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaGift, FaExternalLinkAlt, FaVoteYea } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
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
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <PageHeader
        title={t(lang, 'vote.title')}
        description={t(lang, 'vote.headerDesc')}
        icon={<FaVoteYea className="text-6xl text-minecraft-gold" />}
      />

      <AnimatedSection>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <Card
            className="lg:col-span-2 bg-gradient-to-br from-minecraft-grass/10 to-minecraft-diamond/10 border-minecraft-grass/30"
            hover={false}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t(lang, 'vote.howTitle')}</h2>
              <div className="shrink-0 h-10 w-10 rounded-xl bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-minecraft-gold">
                <FaVoteYea />
              </div>
            </div>

            <ol className="space-y-3">
              {[
                t(lang, 'vote.howStep1'),
                t(lang, 'vote.howStep2'),
                t(lang, 'vote.howStep3'),
              ].map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white/70 px-4 py-3 text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
                >
                  <Badge variant="info" className="mt-0.5">
                    {idx + 1}
                  </Badge>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-minecraft-gold shrink-0">
                  <FaGift />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white">{t(lang, 'vote.rewardsTitle')}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t(lang, 'vote.rewardsSubtitle')}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {t(lang, 'vote.rewardsText')}
              </div>
            </div>
          </Card>

          <div className="lg:col-span-3 space-y-8">
            <Card hover={false} className="border-gray-200 dark:border-white/10">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t(lang, 'vote.linksTitle')}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{t(lang, 'vote.linksSubtitle')}</p>
                </div>
                <Badge variant="info">{VOTE_SITES.length}</Badge>
              </div>

              {VOTE_SITES.length === 0 ? (
                <div className="text-center py-10">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t(lang, 'vote.comingTitle')}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{t(lang, 'vote.comingDesc')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {VOTE_SITES.map((site) => (
                    <div
                      key={site.name}
                      className="rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors p-5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{site.name}</div>
                          {site.description ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{site.description}</div>
                          ) : null}
                        </div>

                        <div className="shrink-0 h-11 w-11 rounded-xl bg-white border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-minecraft-gold">
                          <FaVoteYea />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Link
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => recordVoteClick(site.name)}
                          className="w-full font-semibold rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 bg-minecraft-grass text-white hover:bg-minecraft-grass/80 shadow-lg shadow-minecraft-grass/20 px-5 py-3 text-base"
                        >
                          <FaExternalLinkAlt />
                          <span>{t(lang, 'vote.cta')}</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card hover={false} className="border-gray-200 dark:border-white/10">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t(lang, 'vote.topTitle')}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{t(lang, 'vote.topSubtitle')}</p>
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
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-black/20"
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
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
