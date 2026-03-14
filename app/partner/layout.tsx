import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partners',
  description:
    'Programa partner de 999Wrld Network para colaboraciones, promociones y visibilidad entre comunidades y servidores de Minecraft.',
  path: '/partner',
  keywords: ['minecraft partner program', 'partner minecraft server', '999wrld partners'],
});

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
