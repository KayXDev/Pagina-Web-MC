'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaNewspaper, FaEye, FaCalendar, FaUser, FaHeart } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-toastify';
import { getDateLocale, t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  image?: string;
  author: string;
  publishedAt: string;
  views: number;
  likesCount?: number;
  tags: string[];
}

export default function NoticiasPage() {
  const lang = useClientLang();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/blog');
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        toast.error(t(lang, 'news.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <PageHeader
        title={t(lang, 'news.title')}
        description={t(lang, 'news.headerDesc')}
        icon={<FaNewspaper className="text-6xl text-minecraft-grass" />}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shimmer h-96">
              <div></div>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <FaNewspaper className="text-6xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">{t(lang, 'news.empty')}</p>
        </div>
      ) : (
        <AnimatedSection>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
            {posts.map((post, index) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/noticias/${post.slug}`}>
                  <Card hover className="h-full cursor-pointer rounded-[30px] flex flex-col overflow-hidden">
                    {/* Image */}
                    <div className="relative mb-4 h-48 w-full overflow-hidden rounded-[22px] bg-gradient-to-br from-minecraft-grass/20 to-minecraft-diamond/20 sm:h-52">
                      {post.image ? (
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaNewspaper className="text-6xl text-minecraft-grass" />
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="info" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="mb-2 text-xl font-bold text-gray-900 transition-colors hover:text-minecraft-grass dark:text-white">
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-gray-600 dark:text-gray-400 mb-4 flex-grow line-clamp-3">
                      {post.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FaUser />
                        <span className="truncate">{post.author}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-1">
                          <FaCalendar />
                          <span>{formatDate(post.publishedAt, getDateLocale(lang))}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FaHeart />
                          <span>
                            {post.likesCount || 0} {t(lang, 'news.likes')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FaEye />
                          <span>
                            {post.views} {t(lang, 'news.views')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}
