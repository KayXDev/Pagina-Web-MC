import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Normas',
  description:
    'Normas del servidor y de Discord de 999Wrld Network para mantener una comunidad sana, segura y competitiva.',
  path: '/normas',
  keywords: ['minecraft server rules', 'normas minecraft', 'discord server rules'],
});

export default function NormasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
