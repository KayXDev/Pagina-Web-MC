import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Noticias',
  description:
    'Noticias, eventos, guías y actualizaciones de 999Wrld Network para seguir el pulso del servidor de Minecraft.',
  path: '/noticias',
  keywords: ['minecraft news', 'minecraft updates', 'noticias minecraft', '999wrld noticias'],
});

export default function NoticiasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
