import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'News',
  description:
    'News, events, updates, and guides for 999Wrld Network. Stay up to date with the Minecraft server.',
  alternates: {
    canonical: '/noticias',
  },
};

export default function NoticiasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
