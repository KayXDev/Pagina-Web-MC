import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Staff',
  description:
    'Conoce al equipo de 999Wrld Network: administración, moderación y soporte del servidor de Minecraft.',
  path: '/staff',
  keywords: ['minecraft staff', 'server moderators', '999wrld staff'],
});

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children;
}
