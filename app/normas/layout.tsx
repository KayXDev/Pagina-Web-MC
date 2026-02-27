import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Normas',
  description:
    'Normas del servidor y Discord de 999Wrld Network. Conoce las reglas para mantener una comunidad sana y divertida.',
  alternates: {
    canonical: '/normas',
  },
};

export default function NormasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
