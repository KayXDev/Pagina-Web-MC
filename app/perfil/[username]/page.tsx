'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { type Lang, t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { FaClock, FaIdBadge } from 'react-icons/fa';
import { usePublicProfile } from './_components/public-profile-context';

export default function PublicPerfilOverviewPage() {
  const { profile, loading } = usePublicProfile();
  const lang = useClientLang();

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
  };

  if (loading || !profile) return null;

  return (
    <div className="space-y-4">
      <Card
        hover={false}
        className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
      >
        <div className="text-gray-900 dark:text-white font-bold">{t(lang, 'profile.nav.overview')}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Información del usuario</div>
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
                <p className="text-gray-600 dark:text-gray-400 text-sm">ID</p>
                <p className="text-gray-900 dark:text-white break-all font-semibold">{profile.id}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl border border-gray-200 bg-white grid place-items-center text-minecraft-grass dark:border-white/10 dark:bg-gray-950/40">
                <FaClock />
              </div>
              <div className="min-w-0">
                <p className="text-gray-600 dark:text-gray-400 text-sm">Miembro desde</p>
                <p className="text-gray-900 dark:text-white font-semibold">{formatDateTime(profile.createdAt || null)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
