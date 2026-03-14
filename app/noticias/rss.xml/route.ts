import dbConnect from '@/lib/mongodb';
import BlogPost from '@/models/BlogPost';
import { absoluteUrl, getSiteName, getSiteUrl } from '@/lib/seo';

function escapeXml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const now = new Date().toUTCString();

  try {
    await dbConnect();
    const posts = await BlogPost.find({ isPublished: true })
      .select('title slug excerpt updatedAt publishedAt')
      .sort({ publishedAt: -1 })
      .limit(100)
      .lean();

    const items = posts
      .map((post: any) => {
        const slug = String(post.slug || '').trim();
        if (!slug) return '';
        const url = absoluteUrl(`/noticias/${encodeURIComponent(slug)}`);
        const pubDate = new Date(post.updatedAt || post.publishedAt || Date.now()).toUTCString();
        return [
          '<item>',
          `<title>${escapeXml(String(post.title || 'Noticia'))}</title>`,
          `<link>${url}</link>`,
          `<guid>${url}</guid>`,
          `<description>${escapeXml(String(post.excerpt || ''))}</description>`,
          `<pubDate>${pubDate}</pubDate>`,
          '</item>',
        ].join('');
      })
      .filter(Boolean)
      .join('');

    const xml = [
      '<?xml version="1.0" encoding="UTF-8" ?>',
      '<rss version="2.0">',
      '<channel>',
      `<title>${escapeXml(getSiteName())} Noticias</title>`,
      `<link>${getSiteUrl()}</link>`,
      '<description>Noticias, eventos y actualizaciones del servidor.</description>',
      `<lastBuildDate>${now}</lastBuildDate>`,
      '<language>es-es</language>',
      items,
      '</channel>',
      '</rss>',
    ].join('');

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    const fallback = `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>${escapeXml(getSiteName())} Noticias</title><link>${getSiteUrl()}</link><description>Noticias, eventos y actualizaciones del servidor.</description><lastBuildDate>${now}</lastBuildDate></channel></rss>`;
    return new Response(fallback, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
      },
    });
  }
}