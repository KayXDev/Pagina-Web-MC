'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Card } from '@/components/ui';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
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

export default function PublicPerfilActividadPage() {
  const params = useParams<{ username: string }>();
  const [lang, setLang] = useState<Lang>('es');
  const [items, setItems] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const username = typeof params?.username === 'string' ? params.username : '';

  const queryUrl = useMemo(() => {
    const p = new URLSearchParams();
    p.set('author', username);
    p.set('sort', 'recent');
    p.set('limit', '50');
    return `/api/forum/posts?${p.toString()}`;
  }, [username]);

  useEffect(() => {
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
  }, [username, queryUrl]);

  return (
    <div className="space-y-4">
      <Card hover={false}>
        <div className="text-white font-semibold">{t(lang, 'profile.nav.activity')}</div>
        <div className="text-sm text-gray-400 mt-1">Publicaciones recientes en el foro</div>
      </Card>

      {loading ? (
        <Card hover={false}>
          <div className="text-gray-400 text-sm">{t(lang, 'common.loading')}</div>
        </Card>
      ) : items.length === 0 ? (
        <Card hover={false}>
          <div className="text-gray-400 text-sm">No hay actividad todavía.</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Card key={p._id} hover={false} className="border-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/foro/${p._id}`} className="text-white font-semibold hover:text-minecraft-grass">
                    {p.title}
                  </Link>
                  <div className="text-sm text-gray-300 mt-2 whitespace-pre-wrap line-clamp-4">{p.content}</div>

                  <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-gray-400">
                    {p.category && <Badge variant="default">{p.category}</Badge>}
                    {p.createdAt && <span>{formatDate(p.createdAt, lang)}</span>}
                    <span className="inline-flex items-center gap-1">
                      <FaHeart /> {p.likesCount ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FaEye /> {p.views ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FaComments /> {p.repliesCount ?? 0}
                    </span>
                  </div>
                </div>

                <Link href={`/foro/${p._id}`} className="text-sm text-gray-300 hover:text-white shrink-0">
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
