import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Vote',
  description:
    'Vota por 999Wrld Network, ayuda al servidor de Minecraft a posicionarse mejor y consigue recompensas dentro de la comunidad.',
  path: '/vote',
  keywords: ['vote minecraft server', 'minecraft voting rewards', '999wrld vote'],
});

export default function VoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
