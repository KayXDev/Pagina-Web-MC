'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';

import { Badge, Button, Card, Input, Select } from '@/components/ui';
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

  const summary = useMemo(() => {
    const total = posts.length;
    const replies = posts.reduce((acc, p) => acc + Number(p.repliesCount || 0), 0);
    const likes = posts.reduce((acc, p) => acc + Number(p.likesCount || 0), 0);
    const views = posts.reduce((acc, p) => acc + Number(p.views || 0), 0);
    return { total, replies, likes, views };
  }, [posts]);

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
      <Card className="rounded-2xl dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-gray-200 dark:to-white dark:bg-clip-text truncate">
              {t(lang, 'admin.forum.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{t(lang, 'admin.forum.subtitle')}</p>
          </div>
          <Button onClick={load} disabled={loading} className="w-full md:w-auto">
            {loading ? t(lang, 'admin.forum.loading') : t(lang, 'admin.forum.reload')}
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400">Posts</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.total}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400">Respuestas</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.replies}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400">Likes</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.likes}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400">Vistas</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.views}</div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(lang, 'admin.forum.searchPlaceholder')} />
          </div>
          <div className="md:col-span-4">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value === 'all' ? t(lang, 'admin.forum.allCategories') : c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <Card className="rounded-2xl dark:border-white/10 dark:bg-gray-950/25" hover={false}>
            <div className="text-gray-600 dark:text-gray-400">{t(lang, 'admin.forum.empty')}</div>
          </Card>
        ) : (
          posts.map((p) => (
            <Card key={p._id} className="rounded-2xl dark:border-white/10 dark:bg-gray-950/25" hover={false}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{p.category}</Badge>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(p.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="mt-2 text-gray-900 dark:text-white font-semibold truncate">{p.title}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">{p.content}</div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/5">
                      {t(lang, 'admin.forum.thAuthor')}: <span className="font-semibold text-gray-800 dark:text-gray-200">{p.authorUsername}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/5">
                      {t(lang, 'admin.forum.thReplies')}: <span className="font-semibold text-gray-800 dark:text-gray-200">{p.repliesCount ?? 0}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/5">
                      {t(lang, 'admin.forum.thLikes')}: <span className="font-semibold text-gray-800 dark:text-gray-200">{p.likesCount ?? 0}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/5">
                      {t(lang, 'admin.forum.thViews')}: <span className="font-semibold text-gray-800 dark:text-gray-200">{p.views ?? 0}</span>
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2">
                  <Link
                    href={`/foro/${p._id}`}
                    className="h-9 px-3 inline-flex items-center rounded-md border border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:text-white dark:hover:bg-white/5"
                    target="_blank"
                  >
                    {t(lang, 'admin.forum.view')}
                  </Link>
                  <button
                    className="h-9 px-3 inline-flex items-center rounded-md border border-red-300 text-red-700 hover:text-red-800 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:text-red-200 dark:hover:bg-red-500/10"
                    onClick={() => deletePost(p._id)}
                  >
                    {t(lang, 'admin.forum.delete')}
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
