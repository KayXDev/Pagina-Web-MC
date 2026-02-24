'use client';

import { useEffect, useState } from 'react';
import { FaIdBadge, FaClock, FaShieldAlt } from 'react-icons/fa';
import { Card, Badge } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { useProfile } from './_components/profile-context';

export default function PerfilPage() {
  const { session, status, details, loadingDetails } = useProfile();
  const lang = useClientLang();

  const formatDateTime = (value?: string | null) => {
    if (!value) return t(lang, 'common.loading');
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
  };

  if (status !== 'authenticated' || !session) return null;

  return (
    <div className="space-y-4">
      <Card
        hover={false}
        className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
      >
        <div className="text-gray-900 dark:text-white font-bold">{t(lang, 'profile.nav.overview')}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t(lang, 'profile.detailsTitle')}</div>
      </Card>

      <Card
        hover={false}
        className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl border border-gray-200 bg-white grid place-items-center text-minecraft-grass dark:border-white/10 dark:bg-gray-950/40">
                <FaIdBadge />
              </div>
              <div className="min-w-0">
                <p className="text-gray-600 dark:text-gray-400 text-sm">{t(lang, 'profile.userId')}</p>
                <p className="text-gray-900 dark:text-white break-all font-semibold">{details?.id || session.user.id}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl border border-gray-200 bg-white grid place-items-center text-minecraft-grass dark:border-white/10 dark:bg-gray-950/40">
                <FaClock />
              </div>
              <div className="min-w-0">
                <p className="text-gray-600 dark:text-gray-400 text-sm">{t(lang, 'profile.memberSince')}</p>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {loadingDetails ? t(lang, 'common.loading') : formatDateTime(details?.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl border border-gray-200 bg-white grid place-items-center text-minecraft-grass dark:border-white/10 dark:bg-gray-950/40">
                <FaClock />
              </div>
              <div className="min-w-0">
                <p className="text-gray-600 dark:text-gray-400 text-sm">{t(lang, 'profile.lastLogin')}</p>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {loadingDetails ? t(lang, 'common.loading') : formatDateTime(details?.lastLogin ?? null)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl border border-gray-200 bg-white grid place-items-center text-minecraft-grass dark:border-white/10 dark:bg-gray-950/40">
                <FaShieldAlt />
              </div>
              <div className="min-w-0">
                <p className="text-gray-600 dark:text-gray-400 text-sm">{t(lang, 'profile.status')}</p>
                {loadingDetails ? (
                  <p className="text-gray-900 dark:text-white font-semibold">{t(lang, 'common.loading')}</p>
                ) : details?.isBanned ? (
                  <div className="space-y-1">
                    <Badge variant="danger">{t(lang, 'profile.statusBanned')}</Badge>
                    {details?.bannedReason ? <div className="text-xs text-red-700 dark:text-red-300">{details.bannedReason}</div> : null}
                  </div>
                ) : (
                  <Badge variant="success">{t(lang, 'profile.statusActive')}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
