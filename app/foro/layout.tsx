import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Foro',
  description:
    'Foro de 999Wrld Network: dudas, trades, reportes y conversación general de la comunidad del servidor de Minecraft.',
  alternates: {
    canonical: '/foro',
  },
};

export default function ForoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
