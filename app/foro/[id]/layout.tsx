import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';
import { absoluteUrl } from '@/lib/seo';
import SeoJsonLd from '@/components/SeoJsonLd';

const getPost = cache(async (id: string) => {
  const postId = String(id || '').trim();
  if (!postId) return null;
  await dbConnect();
  const post = await ForumPost.findById(postId)
    .select('title content authorUsername createdAt updatedAt repliesCount likesCount views')
    .lean();
  return post as any;
});

function excerpt(text: string, max = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + '…';
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const post = await getPost(params.id);
  if (!post) {
    return {
      title: 'Publicación no encontrada',
      robots: { index: false, follow: false },
    };
  }

  const title = String(post.title || '').trim() || 'Foro';
  const description = excerpt(post.content || '', 160) || 'Publicación del foro de 999Wrld Network.';
  const url = absoluteUrl(`/foro/${encodeURIComponent(params.id)}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      images: [{ url: '/icon.png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/icon.png'],
    },
  };
}

export default async function ForoIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const post = await getPost(params.id);
  if (!post) notFound();

  const url = absoluteUrl(`/foro/${encodeURIComponent(params.id)}`);
  const createdAt = post.createdAt ? new Date(post.createdAt) : null;
  const modifiedAt = post.updatedAt ? new Date(post.updatedAt) : createdAt;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: String(post.title || ''),
    text: String(post.content || ''),
    author: {
      '@type': 'Person',
      name: String(post.authorUsername || ''),
    },
    mainEntityOfPage: url,
    datePublished: createdAt ? createdAt.toISOString() : undefined,
    dateModified: modifiedAt ? modifiedAt.toISOString() : undefined,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: Number(post.likesCount || 0),
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: Number(post.views || 0),
      },
    ],
    commentCount: Number(post.repliesCount || 0),
  };

  return (
    <>
      <SeoJsonLd data={jsonLd} />
      {children}
    </>
  );
}
