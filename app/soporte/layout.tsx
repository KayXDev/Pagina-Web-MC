import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Soporte',
  description:
    'Soporte técnico y de cuenta para 999Wrld Network: tickets, pagos, tienda, incidencias y ayuda del equipo.',
  path: '/soporte',
  keywords: ['minecraft support', 'soporte minecraft', 'help desk minecraft'],
});

export default function SoporteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
