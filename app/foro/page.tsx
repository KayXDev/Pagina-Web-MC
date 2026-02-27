'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  FaComments,
  FaPlus,
  FaSearch,
  FaEye,
  FaHeart,
  FaRegHeart,
  FaRegComment,
  FaRegImage,
  FaShare,
  FaTimes,
  FaCheckCircle,
} from 'react-icons/fa';
import AnimatedSection from '@/components/AnimatedSection';
import { Badge, Button, Card, Input, Select, Textarea } from '@/components/ui';
import { getDateLocale, t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { toast } from 'react-toastify';

type ForumCategory = 'GENERAL' | 'HELP' | 'REPORTS' | 'TRADES';

interface ForumPost {
  _id: string;
  title: string;
  content: string;
  category: ForumCategory;
  authorId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatar?: string | null;
  authorVerified?: boolean;
  parentId?: string | null;
  media?: string[];
  repliesCount: number;
  views?: number;
  likesCount?: number;
  createdAt: string;
}

const CATEGORIES: Array<{ value: '' | ForumCategory; labelKey: string }> = [
  { value: '', labelKey: 'forum.categories.all' },
  { value: 'GENERAL', labelKey: 'forum.categories.general' },
  { value: 'HELP', labelKey: 'forum.categories.help' },
  { value: 'REPORTS', labelKey: 'forum.categories.reports' },
  { value: 'TRADES', labelKey: 'forum.categories.trades' },
];

export default function ForoPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const lang = useClientLang();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [category, setCategory] = useState<'' | ForumCategory>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'views' | 'likes'>('recent');
  const [feed, setFeed] = useState<'recent' | 'following'>('recent');

  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'GENERAL' as ForumCategory,
    content: '',
  });

  const [media, setMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchPosts = async (
    selectedCategory: '' | ForumCategory,
    selectedSort: typeof sort,
    selectedFeed: typeof feed
  ) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedCategory) query.set('category', selectedCategory);
      if (selectedSort && selectedSort !== 'recent') query.set('sort', selectedSort);
      if (selectedFeed === 'following') query.set('feed', 'following');
      const url = query.toString() ? `/api/forum/posts?${query.toString()}` : '/api/forum/posts';
      const res = await fetch(url);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setPosts(Array.isArray(data) ? (data as ForumPost[]) : []);
    } catch (e) {
      toast.error(t(lang, 'forum.loadError'));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(category, sort, feed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, feed]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => p.title.toLowerCase().includes(q) || p.authorUsername.toLowerCase().includes(q));
  }, [posts, search]);

  const categoryLabel = (c: ForumCategory) => {
    switch (c) {
      case 'GENERAL':
        return t(lang, 'forum.categories.general');
      case 'HELP':
        return t(lang, 'forum.categories.help');
      case 'REPORTS':
        return t(lang, 'forum.categories.reports');
      case 'TRADES':
        return t(lang, 'forum.categories.trades');
    }
  };

  const handleCreate = async () => {
    if (!session) {
      toast.info(t(lang, 'forum.loginToPost'));
      return;
    }

    const title = form.title.trim();
    const content = form.content.trim();

    if (title.length < 3) {
      toast.error(t(lang, 'forum.titleInvalid'));
      return;
    }
    if (content.length < 1 || content.length > 280) {
      toast.error(t(lang, 'forum.contentInvalid'));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category: form.category, media }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      toast.success(t(lang, 'forum.created'));
      setForm({ title: '', category: 'GENERAL', content: '' });
      setMedia([]);
      await fetchPosts(category, sort, feed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'forum.createError'));
    } finally {
      setCreating(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (!session) {
      toast.info(t(lang, 'forum.loginToPost'));
      return;
    }
    if (media.length >= 4) {
      toast.info(t(lang, 'forum.mediaMax'));
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/forum-image', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      const url = String((data as any).url || '');
      if (!url) throw new Error('Error');
      setMedia((prev) => [...prev, url].slice(0, 4));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'forum.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const timeAgo = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return new Intl.DateTimeFormat(getDateLocale(lang), { year: 'numeric', month: 'short', day: '2-digit' }).format(
      new Date(iso)
    );
  };

  const toggleLike = async (postId: string) => {
    if (!session) {
      toast.info(t(lang, 'forum.loginToLike'));
      return;
    }
    try {
      const res = await fetch(`/api/forum/posts/${postId}/like`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      const likesCount = typeof (data as any).likesCount === 'number' ? (data as any).likesCount : 0;
      const liked = Boolean((data as any).liked);

      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, likesCount, _liked: liked } : p)) as any
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const sharePost = async (postId: string) => {
    const url = `${window.location.origin}/foro/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t(lang, 'forum.linkCopied'));
    } catch {
      toast.info(url);
    }
  };

  const tabLabel = (value: '' | ForumCategory, labelKey: string) => {
    if (!value) return t(lang, labelKey);
    return categoryLabel(value as ForumCategory);
  };

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <AnimatedSection>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-minecraft-diamond/15 text-minecraft-diamond flex items-center justify-center">
                  <FaComments />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{t(lang, 'forum.title')}</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{t(lang, 'forum.headerDesc')}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFeed('recent')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    feed === 'recent'
                      ? 'bg-gray-100 border-gray-200 text-gray-900 dark:bg-white/10 dark:border-white/15 dark:text-white'
                      : 'bg-transparent border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 dark:border-white/10 dark:text-gray-400 dark:hover:text-white dark:hover:border-white/15'
                  }`}
                >
                  {t(lang, 'forum.feed.recent')}
                </button>
                <button
                  type="button"
                  onClick={() => setFeed('following')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    feed === 'following'
                      ? 'bg-gray-100 border-gray-200 text-gray-900 dark:bg-white/10 dark:border-white/15 dark:text-white'
                      : 'bg-transparent border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 dark:border-white/10 dark:text-gray-400 dark:hover:text-white dark:hover:border-white/15'
                  }`}
                >
                  {t(lang, 'forum.feed.following')}
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(lang, 'forum.searchPlaceholder')}
                  className="pl-10"
                />
              </div>

              <div className="w-full sm:w-48">
                <Select value={sort} onChange={(e) => setSort(e.target.value as any)}>
                  <option value="recent">Recientes</option>
                  <option value="views">Más vistos</option>
                  <option value="likes">Más likes</option>
                </Select>
              </div>

              <Button
                variant="secondary"
                onClick={() => setCreateOpen((v) => !v)}
                disabled={!session}
              >
                <FaPlus />
                <span>{createOpen ? t(lang, 'common.close') : t(lang, 'forum.createTitle')}</span>
              </Button>
            </div>
          </div>

          <div className="md:hidden overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {CATEGORIES.map((c) => {
                const active = category === c.value;
                return (
                  <button
                    key={c.labelKey}
                    type="button"
                    onClick={() => setCategory(c.value as any)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      active
                        ? 'bg-gray-100 border-gray-200 text-gray-900 dark:bg-white/10 dark:border-white/15 dark:text-white'
                        : 'bg-transparent border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 dark:border-white/10 dark:text-gray-400 dark:hover:text-white dark:hover:border-white/15'
                    }`}
                  >
                    {tabLabel(c.value, c.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {createOpen && (
            <Card hover={false} className="p-4">
              {!session ? (
                <p className="text-gray-600 dark:text-gray-400 text-sm">{t(lang, 'forum.loginToPost')}</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-12 flex items-center gap-3 pb-1">
                    <div className="h-10 w-10 rounded-full bg-gray-200/60 dark:bg-white/10 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 dark:text-white font-semibold truncate">
                        {String((session?.user as any)?.displayName || '').trim() || String((session?.user as any)?.username || session?.user?.name || '').trim()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        @{String((session?.user as any)?.username || session?.user?.name || '').trim()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'forum.contentPlaceholder')}</div>
                    </div>
                  </div>
                  <div className="lg:col-span-5">
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder={t(lang, 'forum.titlePlaceholder')}
                      maxLength={80}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <Select
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ForumCategory }))}
                    >
                      <option value="GENERAL">{t(lang, 'forum.categories.general')}</option>
                      <option value="HELP">{t(lang, 'forum.categories.help')}</option>
                      <option value="REPORTS">{t(lang, 'forum.categories.reports')}</option>
                      <option value="TRADES">{t(lang, 'forum.categories.trades')}</option>
                    </Select>
                  </div>
                  <div className="lg:col-span-4">
                    <Button onClick={handleCreate} disabled={creating} className="w-full">
                      <span>{creating ? t(lang, 'forum.creating') : t(lang, 'forum.createBtn')}</span>
                    </Button>
                  </div>
                  <div className="lg:col-span-12">
                    <Textarea
                      value={form.content}
                      onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                      placeholder={t(lang, 'forum.contentPlaceholder')}
                      rows={5}
                      maxLength={280}
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading || media.length >= 4}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              uploadImage(f);
                              e.currentTarget.value = '';
                            }}
                          />
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/10 dark:bg-black/20 dark:hover:bg-black/30">
                            <FaRegImage />
                            <span>{uploading ? t(lang, 'forum.uploading') : t(lang, 'forum.addImage')}</span>
                          </span>
                        </label>
                        {media.length > 0 && (
                          <button
                            type="button"
                            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            onClick={() => setMedia([])}
                          >
                            {t(lang, 'forum.clearMedia')}
                          </button>
                        )}
                      </div>

                      <div className="text-xs text-gray-400">
                        {form.content.trim().length}/280
                      </div>
                    </div>

                    {media.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {media.map((url) => (
                          <div
                            key={url}
                            className="relative h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20"
                          >
                            <Image
                              src={url}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 50vw, 25vw"
                              className="object-cover"
                            />
                            <button
                              type="button"
                              className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/70"
                              onClick={() => setMedia((prev) => prev.filter((u) => u !== url))}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <aside className="hidden md:block md:col-span-4">
            <Card hover={false} className="p-4 md:sticky md:top-24">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Categorías</div>
              <div className="space-y-1">
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      key={c.labelKey}
                      type="button"
                      onClick={() => setCategory(c.value as any)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors border ${
                        active
                          ? 'bg-gray-100 border-gray-200 text-gray-900 dark:bg-white/10 dark:border-white/15 dark:text-white'
                          : 'bg-transparent border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white'
                      }`}
                    >
                      {tabLabel(c.value, c.labelKey)}
                    </button>
                  );
                })}
              </div>
            </Card>
          </aside>

          <div className="md:col-span-8">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-black/20 animate-pulse"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200/60 dark:bg-white/10" />
                        <div className="flex-1">
                          <div className="h-3 w-32 bg-gray-200/60 dark:bg-white/10 rounded mb-2" />
                          <div className="h-4 w-2/3 bg-gray-200/60 dark:bg-white/10 rounded mb-2" />
                          <div className="h-3 w-1/2 bg-gray-200/60 dark:bg-white/10 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card hover={false} className="p-8 text-center text-gray-600 dark:text-gray-400">
                {t(lang, 'forum.empty')}
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((post) => {
                  const mediaUrls = Array.isArray(post.media) ? post.media : [];
                  const initial = (post.authorUsername || '?').slice(0, 1).toUpperCase();
                  const authorDisplayName = String(post.authorDisplayName || '').trim();
                  const authorTitle = authorDisplayName || post.authorUsername;

                  return (
                    <Card
                      key={post._id}
                      hover={false}
                      className="rounded-2xl border border-gray-200 bg-white/70 dark:border-white/10 dark:bg-black/20"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className="h-10 w-10 rounded-full bg-gray-100 dark:bg-white/10 shrink-0 flex items-center justify-center text-gray-900 dark:text-white font-semibold overflow-hidden relative"
                          onClick={() => router.push(`/perfil/${encodeURIComponent(post.authorUsername)}`)}
                        >
                          {post.authorAvatar ? (
                            <Image
                              src={post.authorAvatar}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            initial
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <button
                              type="button"
                              className="text-gray-900 dark:text-white font-semibold hover:underline"
                              onClick={() => router.push(`/perfil/${encodeURIComponent(post.authorUsername)}`)}
                            >
                              <span className="inline-flex items-center gap-1">
                                {authorTitle}
                                {post.authorVerified ? (
                                  <FaCheckCircle className="text-blue-400 shrink-0 text-sm relative top-px" title="Verificado" />
                                ) : null}
                              </span>
                            </button>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">@{post.authorUsername}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600 dark:text-gray-400">{timeAgo(post.createdAt)}</span>
                            <span className="ml-auto" />
                            <Badge variant="info">{categoryLabel(post.category)}</Badge>
                          </div>

                          <button
                            type="button"
                            className="mt-1 text-left w-full"
                            onClick={() => router.push(`/foro/${post._id}`)}
                          >
                            <div className="text-gray-900 dark:text-white font-semibold leading-snug">{post.title}</div>
                            {post.content ? (
                              <div className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-200 text-sm leading-relaxed line-clamp-3">
                                {post.content}
                              </div>
                            ) : null}
                          </button>

                          {mediaUrls.length > 0 ? (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {mediaUrls.slice(0, 4).map((url) => (
                                <div
                                  key={url}
                                  className="relative h-24 sm:h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20"
                                >
                                  <Image
                                    src={url}
                                    alt=""
                                    fill
                                    sizes="(max-width: 640px) 50vw, 25vw"
                                    className="object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex flex-wrap items-center gap-4">
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                                onClick={() => router.push(`/foro/${post._id}`)}
                              >
                                <FaRegComment className="opacity-80" />
                                <span>{post.repliesCount || 0}</span>
                              </button>

                              <button
                                type="button"
                                className="inline-flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                                onClick={() => toggleLike(post._id)}
                              >
                                {(post as any)._liked ? (
                                  <FaHeart className="text-red-400" />
                                ) : (
                                  <FaRegHeart className="opacity-80" />
                                )}
                                <span>{post.likesCount || 0}</span>
                              </button>

                              <div className="inline-flex items-center gap-2">
                                <FaEye className="opacity-80" />
                                <span>{post.views || 0}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="inline-flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
                              onClick={() => sharePost(post._id)}
                            >
                              <FaShare className="opacity-80" />
                              <span className="hidden sm:inline">{t(lang, 'forum.share')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
