import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vote',
  description:
    'Vote for 999Wrld Network to help the Minecraft server rank higher. Get rewards for supporting the community.',
  alternates: {
    canonical: '/vote',
  },
};

export default function VoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
