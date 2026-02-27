import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff',
  description:
    'Conoce al staff de 999Wrld Network y cómo contactar con el equipo. Administración, moderación y soporte del servidor de Minecraft.',
  alternates: {
    canonical: '/staff',
  },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children;
}
