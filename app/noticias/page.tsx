'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaNewspaper, FaEye, FaCalendar, FaUser, FaHeart } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, getDateLocale, type Lang, t } from '@/lib/i18n';

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
  const [lang, setLang] = useState<Lang>('es');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/blog');
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        toast.error(t(getClientLangFromCookie(), 'news.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <PageHeader
        title={t(lang, 'news.title')}
        description={t(lang, 'news.headerDesc')}
        icon={<FaNewspaper className="text-6xl text-minecraft-grass" />}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shimmer h-96">
              <div></div>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <FaNewspaper className="text-6xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">{t(lang, 'news.empty')}</p>
        </div>
      ) : (
        <AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/noticias/${post.slug}`}>
                  <Card hover className="h-full flex flex-col cursor-pointer">
                    {/* Image */}
                    <div className="w-full h-48 bg-gradient-to-br from-minecraft-grass/20 to-minecraft-diamond/20 rounded-md mb-4 flex items-center justify-center overflow-hidden">
                      {post.image ? (
                        <img 
                          src={post.image} 
                          alt={post.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FaNewspaper className="text-6xl text-minecraft-grass" />
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
                    <h3 className="text-xl font-bold text-white mb-2 hover:text-minecraft-grass transition-colors">
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-gray-400 mb-4 flex-grow line-clamp-3">
                      {post.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <FaUser />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <FaCalendar />
                          <span>{formatDate(post.publishedAt, getDateLocale(lang))}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FaHeart />
                          <span>
                            {post.likesCount || 0} {t(lang, 'news.likes')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
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
