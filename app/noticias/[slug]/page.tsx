'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { FaArrowLeft, FaCalendar, FaUser, FaEye, FaHeart, FaRegHeart } from 'react-icons/fa';
import { Card, Button, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import { getDateLocale, t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

interface BlogPost {
  _id: string;
  title: string;
  content: string;
  image?: string;
  author: string;
  publishedAt: string;
  views: number;
  likesCount?: number;
  tags: string[];
}

export default function NoticiaPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const lang = useClientLang();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/blog/${slug}`);
        if (!response.ok) {
          throw new Error(t(lang, 'news.notFound'));
        }
        const data = await response.json();
        setPost(data);
        setLikesCount(typeof data?.likesCount === 'number' ? data.likesCount : 0);
      } catch (error: any) {
        toast.error(error.message || t(lang, 'news.postLoadError'));
        router.push('/noticias');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug, router, lang]);

  useEffect(() => {
    const fetchLikeStatus = async () => {
      if (!session || !slug) return;
      try {
        const res = await fetch(`/api/blog/${slug}/like`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setLiked(Boolean((data as any).liked));
        if (typeof (data as any).likesCount === 'number') setLikesCount((data as any).likesCount);
      } catch {
        // ignore
      }
    };

    fetchLikeStatus();
  }, [session, slug]);

  const toggleLike = async () => {
    if (!session) {
      toast.info(t(lang, 'news.loginToLike'));
      return;
    }

    if (!slug) return;
    setLiking(true);
    try {
      const res = await fetch(`/api/blog/${slug}/like`, { method: 'POST' });
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

  if (loading) {
    return (
      <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <Card className="shimmer h-96"></Card>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="secondary"
          onClick={() => router.push('/noticias')}
          className="mb-6"
        >
          <FaArrowLeft />
          <span>{t(lang, 'common.back')}</span>
        </Button>

        <Card>
          {/* Image */}
          {post.image && (
            <div className="w-full h-96 mb-6 rounded-lg overflow-hidden">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag, i) => (
                <Badge key={i} variant="info">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2">
              <FaUser />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaCalendar />
              <span>{formatDate(post.publishedAt, getDateLocale(lang))}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaHeart />
              <span>
                {likesCount} {t(lang, 'news.likes')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <FaEye />
              <span>
                {post.views} {t(lang, 'news.views')}
              </span>
            </div>
          </div>

          <div className="mb-8 flex items-center justify-end">
            <Button variant="secondary" onClick={toggleLike} disabled={liking}>
              {liked ? <FaHeart className="text-red-400" /> : <FaRegHeart />}
              <span>{liked ? t(lang, 'news.liked') : t(lang, 'news.like')}</span>
            </Button>
          </div>

          {/* Content */}
          <div className="prose dark:prose-invert prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-6" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 mt-4" {...props} />,
                p: ({ node, ...props }) => <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2" {...props} />,
                a: ({ node, ...props }) => <a className="text-minecraft-grass hover:text-minecraft-grass/80 underline" {...props} />,
                code: ({ node, ...props }) => (
                  <code
                    className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-minecraft-diamond"
                    {...props}
                  />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
