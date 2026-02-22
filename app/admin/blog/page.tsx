'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaNewspaper, FaEye } from 'react-icons/fa';
import { Card, Button, Input, Textarea, Badge } from '@/components/ui';
import { toast } from 'react-toastify';
import { formatDate } from '@/lib/utils';
import { getClientLangFromCookie, t, type Lang } from '@/lib/i18n';

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image?: string;
  author: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: string;
  views: number;
  createdAt: string;
}

export default function AdminBlogPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    image: '',
    tags: '',
    isPublished: false,
  });

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/blog');
      if (!response.ok) throw new Error(t(lang, 'admin.blog.loadError'));
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      toast.error(t(lang, 'admin.blog.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPost ? '/api/admin/blog' : '/api/admin/blog';
      const method = editingPost ? 'PATCH' : 'POST';
      const body = editingPost
        ? {
            postId: editingPost._id,
            updates: {
              ...formData,
              image: formData.image?.trim() || undefined,
              tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            },
          }
        : {
            ...formData,
            image: formData.image?.trim() || undefined,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(t(lang, 'admin.blog.saveError'));

      toast.success(
        editingPost
          ? t(lang, 'admin.blog.saveSuccessUpdate')
          : t(lang, 'admin.blog.saveSuccessCreate')
      );
      setShowForm(false);
      setEditingPost(null);
      resetForm();
      fetchPosts();
    } catch (error) {
      toast.error(t(lang, 'admin.blog.saveError'));
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      image: post.image || '',
      tags: post.tags.join(', '),
      isPublished: post.isPublished,
    });
    setShowForm(true);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm(t(lang, 'admin.blog.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/admin/blog?id=${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(t(lang, 'admin.blog.deleteError'));

      toast.success(t(lang, 'admin.blog.deleteSuccess'));
      fetchPosts();
    } catch (error) {
      toast.error(t(lang, 'admin.blog.deleteError'));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      image: '',
      tags: '',
      isPublished: false,
    });
  };

  const uploadImageFile = async (file: File) => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/admin/uploads/blog-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || t(lang, 'admin.blog.imageUploadError'));

      const url = typeof (data as any).url === 'string' ? (data as any).url : '';
      if (!url) throw new Error(t(lang, 'admin.blog.imageMissingUrl'));

      setFormData((prev) => ({ ...prev, image: url }));
      toast.success(t(lang, 'admin.blog.imageUploaded'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'admin.blog.imageUploadError'));
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white">
              <FaNewspaper />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent truncate">
                {t(lang, 'admin.blog.title')}
              </h1>
              <p className="text-gray-400 text-sm md:text-base">{t(lang, 'admin.blog.subtitle')}</p>
            </div>
          </div>

          <Button onClick={() => setShowForm(true)} className="w-full md:w-auto">
            <FaPlus />
            <span>{t(lang, 'admin.blog.new')}</span>
          </Button>
        </div>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-950/95 border border-white/10 rounded-2xl p-6 md:p-8 max-w-4xl w-full my-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingPost
                ? t(lang, 'admin.blog.form.editTitle')
                : t(lang, 'admin.blog.form.newTitle')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'admin.blog.form.imageLabel')}
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Input
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder={t(lang, 'admin.blog.form.imagePlaceholder')}
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      {t(lang, 'admin.blog.form.imageHint')}
                    </div>
                  </div>

                  <div>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImageFile(file);
                      }}
                      disabled={uploadingImage}
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!formData.image}
                        onClick={() => setFormData({ ...formData, image: '' })}
                      >
                        {t(lang, 'admin.blog.form.removeImage')}
                      </Button>
                      {uploadingImage && (
                        <div className="text-xs text-gray-400 self-center">
                          {t(lang, 'admin.blog.form.uploading')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {formData.image?.trim() && (
                  <div className="mt-4 w-full h-56 bg-gradient-to-br from-minecraft-grass/10 to-minecraft-diamond/10 rounded-xl flex items-center justify-center overflow-hidden border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.image}
                      alt={t(lang, 'admin.blog.form.previewAlt')}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'admin.blog.form.title')} {formData.title.length > 0 && (
                    <span className={formData.title.length >= 5 ? 'text-green-500' : 'text-yellow-500'}>
                      ({formData.title.length}/5 {t(lang, 'admin.blog.form.titleMin')})
                    </span>
                  )}
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  minLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'admin.blog.form.excerpt')} {formData.excerpt.length > 0 && (
                    <span className={formData.excerpt.length >= 10 && formData.excerpt.length <= 200 ? 'text-green-500' : 'text-yellow-500'}>
                      ({formData.excerpt.length}/10-200)
                    </span>
                  )}
                </label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={2}
                  maxLength={200}
                  minLength={10}
                  required
                  placeholder={t(lang, 'admin.blog.form.excerptPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'admin.blog.form.content')} {formData.content.length > 0 && (
                    <span className={formData.content.length >= 50 ? 'text-green-500' : 'text-yellow-500'}>
                      ({formData.content.length}/50 {t(lang, 'admin.blog.form.titleMin')})
                    </span>
                  )}
                </label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
                  minLength={50}
                  required
                  placeholder={t(lang, 'admin.blog.form.contentPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'admin.blog.form.tags')}
                </label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder={t(lang, 'admin.blog.form.tagsPlaceholder')}
                />
              </div>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-gray-300">{t(lang, 'admin.blog.publishNow')}</span>
              </label>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={
                    uploadingImage ||
                    formData.title.length < 5 ||
                    formData.excerpt.length < 10 ||
                    formData.excerpt.length > 200 ||
                    formData.content.length < 50
                  }
                >
                  {editingPost
                    ? t(lang, 'admin.blog.form.submitUpdate')
                    : t(lang, 'admin.blog.form.submitCreate')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPost(null);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  {t(lang, 'common.cancel')}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post._id}>
            <div className="flex items-start justify-between">
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{post.title}</h3>
                  <Badge variant={post.isPublished ? 'success' : 'default'}>
                    {post.isPublished
                      ? t(lang, 'admin.blog.form.statusPublished')
                      : t(lang, 'admin.blog.form.statusDraft')}
                  </Badge>
                </div>
                <p className="text-gray-400 mb-3">{post.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>
                    {t(lang, 'admin.blog.by')}: {post.author}
                  </span>
                  <span>•</span>
                  <span>{formatDate(post.createdAt)}</span>
                  {post.views > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FaEye /> {post.views} {t(lang, 'admin.blog.views')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleEdit(post)}>
                  <FaEdit />
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(post._id)}>
                  <FaTrash />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {posts.length === 0 && !loading && (
        <div className="text-center py-20">
          <FaNewspaper className="text-6xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">{t(lang, 'admin.blog.empty')}</p>
        </div>
      )}
    </div>
  );
}
