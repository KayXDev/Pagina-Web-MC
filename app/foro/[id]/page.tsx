'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  FaArrowLeft,
  FaTrash,
  FaEye,
  FaHeart,
  FaRegHeart,
  FaRegComment,
  FaShare,
  FaRegImage,
  FaTimes,
  FaCheckCircle,
} from 'react-icons/fa';
import AnimatedSection from '@/components/AnimatedSection';
import { Badge, Button, Card, Textarea } from '@/components/ui';
import { getClientLangFromCookie, getDateLocale, type Lang, t } from '@/lib/i18n';
import { toast } from 'react-toastify';

type ForumCategory = 'GENERAL' | 'HELP' | 'REPORTS' | 'TRADES';

interface ForumPost {
  _id: string;
  title: string;
  content: string;
  category: ForumCategory;
  authorId: string;
  authorUsername: string;
  authorAvatar?: string | null;
  authorVerified?: boolean;
  parentId?: string | null;
  media?: string[];
  repliesCount: number;
  views?: number;
  likesCount?: number;
  createdAt: string;
}

interface ForumReply {
  _id: string;
  postId: string;
  parentId?: string;
  rootId?: string | null;
  userId: string;
  username: string;
  userAvatar?: string | null;
  userVerified?: boolean;
  content: string;
  createdAt: string;
  likesCount?: number;
  views?: number;
  media?: string[];
  isLegacy?: boolean;
}

export default function ForoPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const postId = typeof params?.id === 'string' ? params.id : '';

  const [lang, setLang] = useState<Lang>('es');
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<ForumPost | null>(null);
  const [views, setViews] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [replyMedia, setReplyMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);

  const [followingAuthor, setFollowingAuthor] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER';

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const categoryLabel = useMemo(() => {
    const c = post?.category;
    if (!c) return '';
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
  }, [lang, post?.category]);

  const load = async (postId: string) => {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        fetch(`/api/forum/posts/${postId}`),
        fetch(`/api/forum/posts/${postId}/replies`),
      ]);

      const pData = await pRes.json().catch(() => ({}));
      if (!pRes.ok) throw new Error((pData as any).error || 'Error');
      setPost(pData as ForumPost);
      setViews(typeof (pData as any).views === 'number' ? (pData as any).views : 0);
      setLikesCount(typeof (pData as any).likesCount === 'number' ? (pData as any).likesCount : 0);

      const rData = await rRes.json().catch(() => []);
      if (!rRes.ok) throw new Error((rData as any).error || 'Error');
      setReplies(Array.isArray(rData) ? (rData as ForumReply[]) : []);
    } catch (e) {
      toast.error(t(lang, 'forum.loadError'));
      setPost(null);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!postId) return;
    load(postId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    const bumpView = async () => {
      if (!postId) return;
      try {
        const res = await fetch(`/api/forum/posts/${postId}/view`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (typeof (data as any).views === 'number') setViews((data as any).views);
      } catch {
        // ignore
      }
    };

    bumpView();
  }, [postId]);

  useEffect(() => {
    const fetchLikeStatus = async () => {
      if (!session || !postId) return;
      try {
        const res = await fetch(`/api/forum/posts/${postId}/like`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setLiked(Boolean((data as any).liked));
        if (typeof (data as any).likesCount === 'number') setLikesCount((data as any).likesCount);
      } catch {
        // ignore
      }
    };

    fetchLikeStatus();
  }, [session, postId]);

  useEffect(() => {
    // repost eliminado
  }, [session, postId]);

  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!post?.authorUsername) return;
      if (!session) {
        setFollowingAuthor(false);
        return;
      }
      if (post.authorId === session.user.id) {
        setFollowingAuthor(false);
        return;
      }

      try {
        const res = await fetch(`/api/users/${encodeURIComponent(post.authorUsername)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setFollowingAuthor(Boolean((data as any).isFollowing));
      } catch {
        // ignore
      }
    };

    loadFollowStatus();
  }, [post?.authorUsername, post?.authorId, session]);

  const toggleFollowAuthor = async () => {
    if (!post?.authorUsername) return;
    if (!session) {
      toast.info(t(lang, 'forum.loginToPost'));
      return;
    }
    if (post.authorId === session.user.id) return;

    setFollowLoading(true);
    try {
      const res = await fetch(`/api/follows/${encodeURIComponent(post.authorUsername)}`, {
        method: followingAuthor ? 'DELETE' : 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setFollowingAuthor(!followingAuthor);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setFollowLoading(false);
    }
  };

  const toggleLike = async () => {
    if (!postId) return;
    if (!session) {
      toast.info(t(lang, 'forum.loginToLike'));
      return;
    }

    setLiking(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/like`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      setLiked(Boolean((data as any).liked));
      if (typeof (data as any).likesCount === 'number') setLikesCount((data as any).likesCount);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setLiking(false);
    }
  };

  const sendReply = async () => {
    if (!postId) return;
    if (!session) {
      toast.info(t(lang, 'forum.loginToReply'));
      return;
    }

    const content = replyText.trim();
    if (content.length < 1) {
      toast.error(t(lang, 'forum.replyInvalid'));
      return;
    }
    if (content.length > 280) {
      toast.error(t(lang, 'forum.contentInvalid'));
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, media: replyMedia, parentId: replyTo?.id || postId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      toast.success(t(lang, 'forum.replySent'));
      setReplyText('');
      setReplyMedia([]);
      setReplyTo(null);
      await load(postId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'forum.replyError'));
    } finally {
      setSending(false);
    }
  };

  const onReplyTo = (replyId: string, username: string) => {
    if (!session) {
      toast.info(t(lang, 'forum.loginToReply'));
      return;
    }
    setReplyTo({ id: replyId, username });
  };

  const buildThread = (list: ForumReply[]) => {
    const byId = new Map<string, ForumReply>();
    const children = new Map<string, ForumReply[]>();

    for (const r of list) {
      byId.set(r._id, r);
      const pid = r.parentId || postId;
      const arr = children.get(pid) || [];
      arr.push(r);
      children.set(pid, arr);
    }

    const roots = (children.get(postId) || []).slice();
    return { byId, children, roots };
  };

  const uploadReplyImage = async (file: File) => {
    if (!session) {
      toast.info(t(lang, 'forum.loginToReply'));
      return;
    }
    if (replyMedia.length >= 4) {
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
      setReplyMedia((prev) => [...prev, url].slice(0, 4));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'forum.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const deletePost = async () => {
    if (!postId) return;
    if (!isAdmin) return;
    const ok = window.confirm(t(lang, 'forum.deleteConfirm'));
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      toast.success(t(lang, 'forum.deleted'));
      router.push('/foro');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'forum.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const deleteReply = async (replyId: string) => {
    if (!postId) return;
    if (!isAdmin) return;
    const ok = window.confirm(t(lang, 'forum.deleteReplyConfirm'));
    if (!ok) return;

    try {
      const res = await fetch(`/api/forum/posts/${postId}/replies`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      toast.success(t(lang, 'forum.replyDeleted'));
      await load(postId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'forum.replyDeleteError'));
    }
  };

  const sharePost = async () => {
    const url = `${window.location.origin}/foro/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t(lang, 'forum.linkCopied'));
    } catch {
      toast.info(url);
    }
  };

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 mb-6">
        <div>
          <Button variant="secondary" onClick={() => router.push('/foro')}>
            <FaArrowLeft />
            <span>{t(lang, 'common.back')}</span>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t(lang, 'forum.postTitle')}</h1>
          <p className="text-gray-400 mt-1">{t(lang, 'forum.postSubtitle')}</p>
        </div>
      </div>

      <AnimatedSection>
        {loading ? (
          <Card hover={false} className="text-center text-gray-400 py-10">
            {t(lang, 'common.loading')}
          </Card>
        ) : !post ? (
          <Card hover={false} className="text-center text-gray-400 py-10">
            {t(lang, 'forum.notFound')}
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-9">
              <div className="rounded-xl border border-white/10 bg-black/20">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-white font-semibold overflow-hidden">
                      {post.authorAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        post.authorUsername?.slice(0, 1)?.toUpperCase() || '?'
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                        <Link
                          href={`/perfil/${encodeURIComponent(post.authorUsername)}`}
                          className="text-white font-semibold hover:underline"
                        >
                          <span className="inline-flex items-center gap-1">
                            {post.authorUsername}
                            {post.authorVerified ? (
                              <FaCheckCircle className="text-blue-400 shrink-0 text-sm relative top-px" title="Verificado" />
                            ) : null}
                          </span>
                        </Link>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400">
                          {new Intl.DateTimeFormat(getDateLocale(lang), {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(post.createdAt))}
                        </span>
                        <span className="ml-auto" />
                        <Badge variant="info">{categoryLabel}</Badge>
                      </div>

                      {session && post.authorId !== session.user.id && (
                        <button
                          type="button"
                          className="mt-2 text-sm text-minecraft-diamond hover:underline disabled:opacity-50"
                          onClick={toggleFollowAuthor}
                          disabled={followLoading}
                        >
                          {followingAuthor ? t(lang, 'forum.unfollow') : t(lang, 'forum.follow')}
                        </button>
                      )}

                      <div className="mt-3 text-white text-[16px] leading-relaxed">
                        <div className="font-semibold">{post.title}</div>
                        {post.content && (
                          <div className="mt-1 whitespace-pre-wrap text-gray-200">{post.content}</div>
                        )}
                      </div>

                      {Array.isArray(post.media) && post.media.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {post.media.slice(0, 4).map((url) => (
                            <div
                              key={url}
                              className="rounded-lg overflow-hidden border border-white/10 bg-black/20"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="w-full h-44 object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                        <div className="inline-flex items-center gap-2">
                          <FaRegComment className="opacity-80" />
                          <span>{replies.length}</span>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 hover:text-white disabled:opacity-50"
                          onClick={toggleLike}
                          disabled={liking}
                        >
                          {liked ? <FaHeart className="text-red-400" /> : <FaRegHeart className="opacity-80" />}
                          <span>{likesCount}</span>
                        </button>
                        <div className="inline-flex items-center gap-2">
                          <FaEye className="opacity-80" />
                          <span>{views}</span>
                        </div>
                        <button type="button" className="inline-flex items-center gap-2 hover:text-white" onClick={sharePost}>
                          <FaShare className="opacity-80" />
                          <span className="hidden sm:inline">{t(lang, 'forum.share')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-white">
                    {t(lang, 'forum.repliesTitle')} ({replies.length})
                  </h3>

                  {isAdmin && (
                    <Button variant="danger" onClick={deletePost} disabled={deleting} size="sm">
                      <FaTrash />
                      <span>{deleting ? t(lang, 'forum.deleting') : t(lang, 'forum.deletePost')}</span>
                    </Button>
                  )}
                </div>

                {replies.length === 0 ? (
                  <p className="text-gray-400">{t(lang, 'forum.noReplies')}</p>
                ) : (
                  (() => {
                    const { children, roots } = buildThread(replies);

                    const ReplyItem = ({ r, depth }: { r: ForumReply; depth: number }) => {
                      const kids = (children.get(r._id) || []).slice();
                      const indent = Math.min(depth, 4);
                      return (
                        <div>
                          <div
                            className={`rounded-lg border border-white/10 bg-black/20 p-3 hover:bg-black/30 transition-colors ${
                              indent > 0 ? 'ml-4 sm:ml-6 border-l-2 border-l-white/10' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-white font-semibold overflow-hidden">
                                {r.userAvatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={r.userAvatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  r.username?.slice(0, 1)?.toUpperCase() || '?'
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm text-gray-400">
                                    <Link
                                      href={`/perfil/${encodeURIComponent(r.username)}`}
                                      className="text-white font-medium hover:underline"
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        {r.username}
                                        {r.userVerified ? (
                                          <FaCheckCircle
                                            className="text-blue-400 shrink-0 text-xs relative top-px"
                                            title="Verificado"
                                          />
                                        ) : null}
                                      </span>
                                    </Link>{' '}
                                    <span>•</span>{' '}
                                    {new Intl.DateTimeFormat(getDateLocale(lang), {
                                      year: 'numeric',
                                      month: 'short',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }).format(new Date(r.createdAt))}
                                    {r.isLegacy && (
                                      <span className="ml-2 text-xs text-gray-500">{t(lang, 'forum.legacyReply')}</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {!r.isLegacy && (
                                      <button
                                        type="button"
                                        className="text-gray-300 hover:text-white text-sm"
                                        onClick={() => onReplyTo(r._id, r.username)}
                                      >
                                        {t(lang, 'forum.replyTitle')}
                                      </button>
                                    )}

                                    {isAdmin && (
                                      <button
                                        onClick={() => deleteReply(r._id)}
                                        className="text-red-400 hover:text-red-300 text-sm"
                                      >
                                        {t(lang, 'forum.delete')}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2 whitespace-pre-wrap text-gray-200 leading-relaxed text-sm">
                                  {r.content}
                                </div>

                                {Array.isArray(r.media) && r.media.length > 0 && (
                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    {r.media.slice(0, 4).map((url) => (
                                      <div
                                        key={url}
                                        className="rounded-lg overflow-hidden border border-white/10 bg-black/20"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="" className="w-full h-36 object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {kids.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {kids.map((k) => (
                                <ReplyItem key={k._id} r={k} depth={depth + 1} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-2">
                        {roots.map((r) => (
                          <ReplyItem key={r._id} r={r} depth={0} />
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>

              <div className="mt-6">
                <Card hover={false} className="p-4">
                  <h3 className="text-lg font-bold text-white mb-3">{t(lang, 'forum.replyTitle')}</h3>
                  {!session ? (
                    <p className="text-gray-400">{t(lang, 'forum.loginToReply')}</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-white font-semibold overflow-hidden">
                          {(session?.user as any)?.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={String((session?.user as any).avatar)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            session?.user?.name?.slice(0, 1)?.toUpperCase() || '?'
                          )}
                        </div>
                        <div className="text-sm text-gray-300">
                          <div className="text-white font-semibold">{session?.user?.name}</div>
                          <div className="text-gray-400">{t(lang, 'forum.replyPlaceholder')}</div>
                        </div>
                      </div>

                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t(lang, 'forum.replyPlaceholder')}
                        rows={5}
                        maxLength={280}
                      />

                      {replyTo && (
                        <div className="flex items-center justify-between gap-3 text-sm rounded-md border border-white/10 bg-black/20 px-3 py-2">
                          <div className="text-gray-300">
                            {t(lang, 'forum.replyingTo')} <span className="text-white font-semibold">@{replyTo.username}</span>
                          </div>
                          <button
                            type="button"
                            className="text-gray-300 hover:text-white"
                            onClick={() => setReplyTo(null)}
                          >
                            {t(lang, 'common.cancel')}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading || replyMedia.length >= 4}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              uploadReplyImage(f);
                              e.currentTarget.value = '';
                            }}
                          />
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 bg-black/20 hover:bg-black/30">
                            <FaRegImage />
                            <span>{uploading ? t(lang, 'forum.uploading') : t(lang, 'forum.addImage')}</span>
                          </span>
                        </label>

                        <div className="text-xs text-gray-400">{replyText.trim().length}/280</div>
                      </div>

                      {replyMedia.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {replyMedia.map((url) => (
                            <div key={url} className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="w-full h-24 object-cover" />
                              <button
                                type="button"
                                className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/70"
                                onClick={() => setReplyMedia((prev) => prev.filter((u) => u !== url))}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-gray-400">{replyText.trim().length}/280</div>
                        <Button onClick={sendReply} disabled={sending}>
                          <span>{sending ? t(lang, 'forum.sending') : t(lang, 'forum.sendReply')}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-24 space-y-3">
                <Card hover={false} className="p-4">
                  <div className="text-sm font-semibold text-white mb-2">Resumen</div>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center justify-between">
                      <span>{t(lang, 'forum.likes')}</span>
                      <span className="text-white font-semibold">{likesCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t(lang, 'forum.views')}</span>
                      <span className="text-white font-semibold">{views}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t(lang, 'forum.replies')}</span>
                      <span className="text-white font-semibold">{replies.length}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </aside>
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}
