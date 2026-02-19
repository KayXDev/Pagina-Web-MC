'use client';

import { useEffect, useState } from 'react';
import { FaIdBadge, FaClock, FaShieldAlt } from 'react-icons/fa';
import { Card, Badge } from '@/components/ui';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { useProfile } from './_components/profile-context';

export default function PerfilPage() {
  const { session, status, details, loadingDetails } = useProfile();
  const [lang, setLang] = useState<Lang>('es');

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const formatDateTime = (value?: string | null) => {
    if (!value) return t(lang, 'common.loading');
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
  };

  if (status !== 'authenticated' || !session) return null;

  return (
    <div className="space-y-4">
      <Card hover={false}>
        <div className="text-white font-semibold">{t(lang, 'profile.nav.overview')}</div>
        <div className="text-sm text-gray-400 mt-1">{t(lang, 'profile.detailsTitle')}</div>
      </Card>

      <Card hover={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-3">
            <FaIdBadge className="text-minecraft-grass text-xl" />
            <div>
              <p className="text-gray-400 text-sm">{t(lang, 'profile.userId')}</p>
              <p className="text-white break-all">{details?.id || session.user.id}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <FaClock className="text-minecraft-grass text-xl" />
            <div>
              <p className="text-gray-400 text-sm">{t(lang, 'profile.memberSince')}</p>
              <p className="text-white">{loadingDetails ? t(lang, 'common.loading') : formatDateTime(details?.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <FaClock className="text-minecraft-grass text-xl" />
            <div>
              <p className="text-gray-400 text-sm">{t(lang, 'profile.lastLogin')}</p>
              <p className="text-white">{loadingDetails ? t(lang, 'common.loading') : formatDateTime(details?.lastLogin ?? null)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <FaShieldAlt className="text-minecraft-grass text-xl" />
            <div>
              <p className="text-gray-400 text-sm">{t(lang, 'profile.status')}</p>
              {loadingDetails ? (
                <p className="text-white">{t(lang, 'common.loading')}</p>
              ) : details?.isBanned ? (
                <div className="space-y-1">
                  <Badge variant="danger">{t(lang, 'profile.statusBanned')}</Badge>
                  {details?.bannedReason ? <div className="text-xs text-red-300">{details.bannedReason}</div> : null}
                </div>
              ) : (
                <Badge variant="success">{t(lang, 'profile.statusActive')}</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
