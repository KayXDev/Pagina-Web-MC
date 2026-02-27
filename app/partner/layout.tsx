import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner',
  description:
    'Programa Partner de 999Wrld Network. Colabora con la comunidad y participa en iniciativas, eventos y promociones del servidor de Minecraft.',
  alternates: {
    canonical: '/partner',
  },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
