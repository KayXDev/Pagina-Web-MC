'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingThemeToggle from '@/components/FloatingThemeToggle';
import NewsletterPopup from '@/components/NewsletterPopup';

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isHome = pathname === '/';

  if (isAdmin) {
    return <div className="h-[100dvh] overflow-hidden minecraft-bg">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col minecraft-bg relative overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gray-50 dark:bg-gray-950" />
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        {!isHome ? (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.18] dark:opacity-[0.22]">
              <Image
                src="/fondo.png"
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-top saturate-[1.02] brightness-[0.78]"
              />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,246,249,0.12),rgba(255,246,249,0.04)_14%,rgba(249,250,251,0.12)_28%,rgba(249,250,251,0.26)_42%,rgba(249,250,251,0.46)_58%,rgba(249,250,251,0.7)_74%,rgba(249,250,251,0.9)_88%,rgba(249,250,251,1)_100%)] dark:bg-[linear-gradient(180deg,rgba(24,18,28,0.14),rgba(17,24,39,0.08)_14%,rgba(17,24,39,0.12)_28%,rgba(17,24,39,0.22)_42%,rgba(17,24,39,0.4)_58%,rgba(17,24,39,0.66)_74%,rgba(17,24,39,0.88)_88%,rgba(17,24,39,1)_100%)]" />
          </div>
        ) : null}
        {isHome ? <div className="absolute -top-44 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-minecraft-diamond/15 blur-3xl" /> : null}
        {isHome ? <div className="absolute -bottom-44 left-1/3 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-minecraft-grass/12 blur-3xl" /> : null}
      </div>
      <NewsletterPopup />
      <Navbar />
      <FloatingThemeToggle />
      <main className={`flex-grow ${isHome ? 'pt-0' : 'pt-16'}`}>{children}</main>
      <Footer />
    </div>
  );
}
