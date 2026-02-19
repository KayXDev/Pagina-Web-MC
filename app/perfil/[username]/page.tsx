'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { FaClock, FaIdBadge } from 'react-icons/fa';
import { usePublicProfile } from './_components/public-profile-context';

export default function PublicPerfilOverviewPage() {
  const { profile, loading } = usePublicProfile();
  const [lang, setLang] = useState<Lang>('es');

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
  };

  if (loading || !profile) return null;

  return (
    <div className="space-y-4">
      <Card hover={false}>
        <div className="text-white font-semibold">{t(lang, 'profile.nav.overview')}</div>
        <div className="text-sm text-gray-400 mt-1">Información del usuario</div>
      </Card>

      <Card hover={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-3">
            <FaIdBadge className="text-minecraft-grass text-xl" />
            <div>
              <p className="text-gray-400 text-sm">ID</p>
              <p className="text-white break-all">{profile.id}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <FaClock className="text-minecraft-grass text-xl" />
            <div>
              <p className="text-gray-400 text-sm">Miembro desde</p>
              <p className="text-white">{formatDateTime(profile.createdAt || null)}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
