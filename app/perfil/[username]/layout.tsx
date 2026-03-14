import type { Metadata } from 'next';
import { cache } from 'react';
import { headers } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { absoluteUrl, buildPageMetadata, getSiteName } from '@/lib/seo';
import SeoJsonLd from '@/components/SeoJsonLd';
import PublicProfileShell from './_components/PublicProfileShell';

const getPublicProfile = cache(async (username: string) => {
  const normalized = String(username || '').trim();
  if (!normalized) return null;
  await dbConnect();
  return User.findOne({ username: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
    .select('username displayName avatar banner verified createdAt tags')
    .lean();
});

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const profile = await getPublicProfile(params.username);
  if (!profile) {
    return { title: 'Perfil no encontrado', robots: { index: false, follow: false } };
  }

  const username = String((profile as any).username || params.username).trim();
  const displayName = String((profile as any).displayName || '').trim();
  const heading = displayName || username;
  const description = `${heading} en ${getSiteName()}. Perfil público de la comunidad con actividad y presencia dentro del servidor.`;
  const images = [String((profile as any).banner || ''), String((profile as any).avatar || '')].filter(Boolean);

  return buildPageMetadata({
    title: `${heading} - Perfil`,
    description,
    path: `/perfil/${encodeURIComponent(username)}`,
    type: 'profile',
    images,
    keywords: ['perfil minecraft', username, displayName],
  });
}

export default function PublicPerfilLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { username: string };
}) {
  const nonce = headers().get('x-csp-nonce') || undefined;
  const profileUrl = absoluteUrl(`/perfil/${encodeURIComponent(params.username)}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: params.username,
      url: profileUrl,
    },
    url: profileUrl,
  };

  return (
    <>
      <SeoJsonLd data={jsonLd} nonce={nonce} />
      <PublicProfileShell username={params.username}>{children}</PublicProfileShell>
    </>
  );
}
