import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Tienda',
  description:
    'Tienda oficial de 999Wrld Network con rangos, bundles, llaves, monedas y ofertas limitadas para el servidor de Minecraft.',
  path: '/tienda',
  keywords: ['minecraft store', 'minecraft ranks', 'minecraft bundles', '999wrld tienda'],
});

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
