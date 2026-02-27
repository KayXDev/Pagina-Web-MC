import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Soporte',
  description:
    'Soporte de 999Wrld Network: crea tickets y recibe ayuda del equipo. Problemas de cuenta, tienda, pagos y servidor.',
  alternates: {
    canonical: '/soporte',
  },
};

export default function SoporteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
