import type { Metadata } from 'next';
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import BlogPost from '@/models/BlogPost';
import { absoluteUrl, buildPageMetadata } from '@/lib/seo';
import SeoJsonLd from '@/components/SeoJsonLd';

const getPost = cache(async (slug: string) => {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return null;
  await dbConnect();
  const post = await BlogPost.findOne({ slug: s, isPublished: true })
    .select('title slug excerpt image author publishedAt updatedAt tags')
    .lean();
  return post as any;
});

function stripMarkdown(text: string) {
  return String(text || '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) {
    return {
      title: 'Noticia no encontrada',
      robots: { index: false, follow: false },
    };
  }

  const title = String(post.title || '').trim() || 'Noticia';
  const description = stripMarkdown(post.excerpt || '') || 'Noticias de 999Wrld Network.';
  const url = absoluteUrl(`/noticias/${encodeURIComponent(String(post.slug))}`);

  const image = String(post.image || '').trim();
  const images = image ? [image] : ['/icon.png'];

  return {
    ...buildPageMetadata({
      title,
      description,
      path: `/noticias/${encodeURIComponent(String(post.slug))}`,
      type: 'article',
      images,
      keywords: Array.isArray(post.tags) ? (post.tags as string[]) : [],
    }),
  };
}

export default async function NoticiaSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const url = absoluteUrl(`/noticias/${encodeURIComponent(String(post.slug))}`);
  const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null;
  const modifiedAt = post.updatedAt ? new Date(post.updatedAt) : publishedAt;
  const nonce = headers().get('x-csp-nonce') || undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: String(post.title || ''),
    description: stripMarkdown(post.excerpt || ''),
    image: post.image ? [String(post.image)] : [absoluteUrl('/icon.png')],
    author: {
      '@type': 'Person',
      name: String(post.author || '999Wrld Network'),
    },
    publisher: {
      '@type': 'Organization',
      name: process.env.SITE_NAME || '999Wrld Network',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/icon.png'),
      },
    },
    mainEntityOfPage: url,
    datePublished: publishedAt ? publishedAt.toISOString() : undefined,
    dateModified: modifiedAt ? modifiedAt.toISOString() : undefined,
  };

  return (
    <>
      <SeoJsonLd data={jsonLd} nonce={nonce} />
      {children}
    </>
  );
}
