import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';
import dbConnect from '@/lib/mongodb';
import BlogPost from '@/models/BlogPost';
import ForumPost from '@/models/ForumPost';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/vote`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/tienda`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/foro`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/noticias`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/normas`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/staff`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/partner`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/soporte`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/terminos`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Dynamic URLs (best-effort). If DB is unavailable, sitemap still works with static routes.
  try {
    await dbConnect();

    const posts = await BlogPost.find({ isPublished: true })
      .select('slug updatedAt publishedAt')
      .sort({ publishedAt: -1 })
      .limit(5000)
      .lean();

    for (const p of posts) {
      const slug = String((p as any).slug || '').trim();
      if (!slug) continue;
      const last = (p as any).updatedAt || (p as any).publishedAt || now;
      entries.push({
        url: `${baseUrl}/noticias/${encodeURIComponent(slug)}`,
        lastModified: new Date(last),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    const forumPosts = await ForumPost.find({ parentId: null, rootId: null })
      .select('_id updatedAt createdAt')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    for (const fp of forumPosts) {
      const id = String((fp as any)._id || '').trim();
      if (!id) continue;
      const last = (fp as any).updatedAt || (fp as any).createdAt || now;
      entries.push({
        url: `${baseUrl}/foro/${encodeURIComponent(id)}`,
        lastModified: new Date(last),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch {
    // ignore
  }

  return entries;
}
