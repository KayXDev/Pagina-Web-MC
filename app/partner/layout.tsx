import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner',
  description:
    '999Wrld Network Partner Program. Collaborate with the community and join initiatives, events, and promotions.',
  alternates: {
    canonical: '/partner',
  },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
