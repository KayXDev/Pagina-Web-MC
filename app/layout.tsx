import type { Metadata } from 'next';
import { Rajdhani } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import ChatbotWidget from '@/components/ChatbotWidget';
import { Providers } from './providers';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { normalizeLang } from '@/lib/i18n';
import { Analytics } from '@vercel/analytics/next';

const rajdhani = Rajdhani({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: '999Wrld Network - Servidor de Minecraft',
  description: 'El mejor servidor de Minecraft en español. Únete a nuestra comunidad y disfruta de múltiples modos de juego, eventos y mucho más.',
  keywords: ['minecraft', 'servidor', 'minecraft server', 'survival', 'pvp', 'skyblock'],
  authors: [{ name: '999Wrld Network' }],
  icons: {
    icon: [{ url: '/icon.png' }],
    shortcut: [{ url: '/icon.png' }],
    apple: [{ url: '/icon.png' }],
  },
  openGraph: {
    title: '999Wrld Network - Servidor de Minecraft',
    description: 'El mejor servidor de Minecraft en español',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: '999Wrld Network',
    description: 'El mejor servidor de Minecraft en español',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = normalizeLang(cookies().get('lang')?.value);

  return (
    <html lang={lang} className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(() => {\n" +
              "  try {\n" +
              "    const saved = localStorage.getItem('theme');\n" +
              "    const theme = (saved === 'dark' || saved === 'light') ? saved : 'dark';\n" +
              "    if (theme === 'dark') document.documentElement.classList.add('dark');\n" +
              "    else document.documentElement.classList.remove('dark');\n" +
              "  } catch {}\n" +
              "})();",
          }}
        />
      </head>
      <body className={rajdhani.className}>
        <Providers>
          <div className="min-h-screen flex flex-col minecraft-bg">
            <Navbar />
            <main className="flex-grow pt-16">
              {children}
            </main>
            <Footer />
          </div>
          <CookieConsent />
          <ChatbotWidget />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
