'use client';

import { usePathname } from 'next/navigation';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NewsletterPopup from '@/components/NewsletterPopup';

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isAdmin) {
    return <div className="h-[100dvh] overflow-hidden minecraft-bg">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col minecraft-bg relative overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gray-50 dark:bg-brand-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-white dark:from-brand-bg dark:via-brand-surface/40 dark:to-brand-bg" />
        <div className="absolute -top-48 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-neon/18 blur-3xl" />
        <div className="absolute -bottom-52 left-1/3 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-brand-accent/14 blur-3xl" />
        <div className="absolute top-24 -right-40 h-[26rem] w-[26rem] rounded-full bg-brand-electric/12 blur-3xl" />
      </div>
      <NewsletterPopup />
      <Navbar />
      <main className="flex-grow pt-16">{children}</main>
      <Footer />
    </div>
  );
}
