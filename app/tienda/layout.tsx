import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tienda',
  description:
    'Tienda oficial de 999Wrld Network. Apoya al servidor de Minecraft y obtén rangos, llaves, monedas y paquetes.',
  alternates: {
    canonical: '/tienda',
  },
};

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
