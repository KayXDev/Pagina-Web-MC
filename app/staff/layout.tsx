import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff',
  description:
    'Meet the 999Wrld Network staff and learn how to contact the team. Administration, moderation, and support.',
  alternates: {
    canonical: '/staff',
  },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children;
}
