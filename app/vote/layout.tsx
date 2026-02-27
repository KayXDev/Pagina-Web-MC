import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Votar',
  description:
    'Vota por 999Wrld Network y ayuda a que el servidor de Minecraft aparezca en los primeros resultados. Obtén recompensas por apoyar a la comunidad.',
  alternates: {
    canonical: '/vote',
  },
};

export default function VoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
