import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Store',
  description:
    'Official 999Wrld Network store. Support the Minecraft server and get ranks, keys, coins, and bundles.',
  alternates: {
    canonical: '/tienda',
  },
};

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
