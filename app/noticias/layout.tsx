import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Noticias',
  description:
    'Noticias, eventos, actualizaciones y guías de 999Wrld Network. Mantente al día con novedades del servidor de Minecraft.',
  alternates: {
    canonical: '/noticias',
  },
};

export default function NoticiasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
