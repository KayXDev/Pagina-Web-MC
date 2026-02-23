'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaVoteYea } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Badge, Card } from '@/components/ui';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { VOTE_SITES } from '@/lib/voteSites';

export default function VotePage() {
  const [lang, setLang] = useState<Lang>('es');

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <PageHeader
        title={t(lang, 'vote.title')}
        description={t(lang, 'vote.headerDesc')}
        icon={<FaVoteYea className="text-6xl text-minecraft-gold" />}
      />

      <AnimatedSection>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1" hover={false}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t(lang, 'vote.howTitle')}</h2>
            <ol className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-3">
                <Badge variant="info" className="mt-0.5">1</Badge>
                <span>{t(lang, 'vote.howStep1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="info" className="mt-0.5">2</Badge>
                <span>{t(lang, 'vote.howStep2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="info" className="mt-0.5">3</Badge>
                <span>{t(lang, 'vote.howStep3')}</span>
              </li>
            </ol>
          </Card>

          <div className="lg:col-span-2">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t(lang, 'vote.linksTitle')}</h2>
              <p className="text-gray-600 dark:text-gray-400">{t(lang, 'vote.linksSubtitle')}</p>
            </div>

            {VOTE_SITES.length === 0 ? (
              <Card className="text-center" hover={false}>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t(lang, 'vote.comingTitle')}</h3>
                <p className="text-gray-600 dark:text-gray-400">{t(lang, 'vote.comingDesc')}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {VOTE_SITES.map((site) => (
                  <Card key={site.name} className="flex flex-col" hover={false}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{site.name}</h3>
                      <FaVoteYea className="text-minecraft-gold" />
                    </div>
                    {site.description ? (
                      <p className="text-gray-600 dark:text-gray-400 mb-5">{site.description}</p>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 mb-5">&nbsp;</p>
                    )}
                    <div className="mt-auto">
                      <Link
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium rounded-md transition-all duration-200 flex items-center justify-center space-x-2 bg-minecraft-grass text-white hover:bg-minecraft-grass/80 shadow-lg shadow-minecraft-grass/20 px-5 py-2.5 text-base"
                      >
                        <FaVoteYea />
                        <span>{t(lang, 'vote.cta')}</span>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
