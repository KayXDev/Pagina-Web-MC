import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Foro',
  description:
    'Foro de 999Wrld Network para dudas, guías, comercio, reportes y conversación de la comunidad del servidor de Minecraft.',
  path: '/foro',
  keywords: ['minecraft forum', 'foro minecraft', 'comunidad minecraft', '999wrld foro'],
});

export default function ForoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
