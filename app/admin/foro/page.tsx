'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';

import { Button, Card, Input } from '@/components/ui';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';

type ForumAdminPost = {
  _id: string;
  title: string;
  content: string;
  category: string;
  authorUsername: string;
  createdAt: string;
  repliesCount: number;
  views: number;
  likesCount: number;
};

const CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'GENERAL', label: 'General' },
  { value: 'HELP', label: 'Ayuda' },
  { value: 'REPORTS', label: 'Reportes' },
  { value: 'TRADES', label: 'Trades' },
];

export default function AdminForoPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<ForumAdminPost[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (category !== 'all') sp.set('category', category);
    sp.set('limit', '100');
    return sp.toString();
  }, [q, category]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/forum-posts?${queryString}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      setPosts(Array.isArray(data?.posts) ? data.posts : []);
    } catch (e: any) {
      toast.error(e?.message || t(lang, 'admin.forum.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLang(getClientLangFromCookie());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const deletePost = async (postId: string) => {
    const ok = confirm(t(lang, 'admin.forum.deleteConfirm'));
    if (!ok) return;

    try {
      const res = await fetch('/api/admin/forum-posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      toast.success(t(lang, 'admin.forum.deleted'));
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (e: any) {
      toast.error(e?.message || t(lang, 'admin.forum.deleteError'));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent truncate">
              {t(lang, 'admin.forum.title')}
            </h1>
            <p className="text-gray-400 text-sm md:text-base">{t(lang, 'admin.forum.subtitle')}</p>
          </div>
          <Button onClick={load} disabled={loading} className="w-full md:w-auto">
            {loading ? t(lang, 'admin.forum.loading') : t(lang, 'admin.forum.reload')}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-8">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(lang, 'admin.forum.searchPlaceholder')} />
        </div>
        <div className="md:col-span-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-10 rounded-md bg-gray-950/60 border border-white/10 text-white px-3"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-gray-950">
                {c.value === 'all' ? t(lang, 'admin.forum.allCategories') : c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gray-950/25 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs text-gray-400 border-b border-white/10">
          <div className="col-span-5">{t(lang, 'admin.forum.thPost')}</div>
          <div className="col-span-2">{t(lang, 'admin.forum.thAuthor')}</div>
          <div className="col-span-1 text-right">{t(lang, 'admin.forum.thReplies')}</div>
          <div className="col-span-1 text-right">{t(lang, 'admin.forum.thLikes')}</div>
          <div className="col-span-1 text-right">{t(lang, 'admin.forum.thViews')}</div>
          <div className="col-span-2 text-right">{t(lang, 'admin.forum.thActions')}</div>
        </div>

        {posts.length === 0 ? (
          <div className="px-4 py-6 text-gray-400">{t(lang, 'admin.forum.empty')}</div>
        ) : (
          <div className="divide-y divide-white/10">
            {posts.map((p) => (
              <div key={p._id} className="grid grid-cols-12 gap-2 px-4 py-3">
                <div className="col-span-5 min-w-0">
                  <div className="text-white font-medium truncate">{p.title}</div>
                  <div className="text-gray-400 text-sm truncate">{p.content}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {p.category} • {new Date(p.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="col-span-2 text-gray-200 truncate">{p.authorUsername}</div>

                <div className="col-span-1 text-gray-200 text-right">{p.repliesCount ?? 0}</div>
                <div className="col-span-1 text-gray-200 text-right">{p.likesCount ?? 0}</div>
                <div className="col-span-1 text-gray-200 text-right">{p.views ?? 0}</div>

                <div className="col-span-2 flex justify-end gap-2">
                  <Link
                    href={`/foro/${p._id}`}
                    className="h-9 px-3 inline-flex items-center rounded-md border border-white/10 text-gray-200 hover:text-white hover:bg-white/5"
                    target="_blank"
                  >
                    {t(lang, 'admin.forum.view')}
                  </Link>
                  <button
                    className="h-9 px-3 inline-flex items-center rounded-md border border-red-500/30 text-red-300 hover:text-red-200 hover:bg-red-500/10"
                    onClick={() => deletePost(p._id)}
                  >
                    {t(lang, 'admin.forum.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
