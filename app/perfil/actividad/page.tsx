'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { useProfile } from '../_components/profile-context';
import { FaComments, FaEye, FaHeart } from 'react-icons/fa';

type ForumPost = {
  _id: string;
  title: string;
  content: string;
  createdAt?: string;
  likesCount?: number;
  views?: number;
  repliesCount?: number;
  category?: string;
};

function formatDate(value?: string, lang?: Lang) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
}

export default function PerfilActividadPage() {
  const { session, status } = useProfile();
  const [lang, setLang] = useState<Lang>('es');
  const [items, setItems] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const username = String(session?.user?.name || '');

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('author', username);
    params.set('sort', 'recent');
    params.set('limit', '50');
    return `/api/forum/posts?${params.toString()}`;
  }, [username]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!username) return;

    let cancelled = false;
    setLoading(true);

    fetch(queryUrl, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ([]));
        if (!res.ok) throw new Error((data as any).error || 'Error');
        return Array.isArray(data) ? (data as ForumPost[]) : [];
      })
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, username, queryUrl]);

  return (
    <div className="space-y-4">
      <Card
        hover={false}
        className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
      >
        <div className="text-gray-900 dark:text-white font-bold">{t(lang, 'profile.nav.activity')}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tus publicaciones del foro</div>
      </Card>

      {loading ? (
        <Card
          hover={false}
          className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
        >
          <div className="text-gray-400 text-sm">{t(lang, 'common.loading')}</div>
        </Card>
      ) : items.length === 0 ? (
        <Card
          hover={false}
          className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
        >
          <div className="text-gray-400 text-sm">No hay actividad todavía.</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Card
              key={p._id}
              hover={false}
              className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/foro/${p._id}`} className="text-gray-900 dark:text-white font-semibold hover:text-minecraft-grass">
                    {p.title}
                  </Link>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap line-clamp-4">{p.content}</div>

                  <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-gray-400">
                    {p.category && <Badge variant="default">{p.category}</Badge>}
                    {p.createdAt && <span>{formatDate(p.createdAt, lang)}</span>}
                    <span className="inline-flex items-center gap-1"><FaHeart /> {p.likesCount ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><FaEye /> {p.views ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><FaComments /> {p.repliesCount ?? 0}</span>
                  </div>
                </div>

                <Link href={`/foro/${p._id}`} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shrink-0">
                  Ver
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
