import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forum',
  description:
    '999Wrld Network forum: questions, trades, reports, and general discussion with the Minecraft server community.',
  alternates: {
    canonical: '/foro',
  },
};

export default function ForoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
