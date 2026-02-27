import type { Metadata } from 'next';
import { Rajdhani } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import ChatbotWidget from '@/components/ChatbotWidget';
import RootShell from '@/components/RootShell';
import { Providers } from './providers';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { normalizeLang } from '@/lib/i18n';
import ConsentAnalytics from '@/components/ConsentAnalytics';
import { getSiteUrl } from '@/lib/seo';
import SeoJsonLd from '@/components/SeoJsonLd';

const rajdhani = Rajdhani({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const siteUrl = getSiteUrl();

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.BING_SITE_VERIFICATION || process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

const verification: Metadata['verification'] = {
  ...(googleVerification ? { google: googleVerification } : {}),
  ...(bingVerification ? { other: { bing: bingVerification } } : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '999Wrld Network - Servidor de Minecraft',
    template: '%s | 999Wrld Network',
  },
  description: 'El mejor servidor de Minecraft en español. Únete a nuestra comunidad y disfruta de múltiples modos de juego, eventos y mucho más.',
  keywords: ['minecraft', 'servidor', 'minecraft server', 'survival', 'pvp', 'skyblock'],
  authors: [{ name: '999Wrld Network' }],
  alternates: {
    canonical: '/',
  },
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
    url: siteUrl,
    siteName: '999Wrld Network',
    images: [{ url: '/icon.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '999Wrld Network',
    description: 'El mejor servidor de Minecraft en español',
    images: ['/icon.png'],
  },
  verification,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = normalizeLang(cookies().get('lang')?.value);

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: process.env.SITE_NAME || '999Wrld Network',
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
    sameAs: [
      process.env.DISCORD_URL,
      process.env.TIKTOK_URL,
      process.env.YOUTUBE_URL,
    ].filter(Boolean),
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: process.env.SITE_NAME || '999Wrld Network',
    url: siteUrl,
    inLanguage: lang,
  };

  return (
    <html lang={lang} className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <SeoJsonLd data={orgJsonLd} />
        <SeoJsonLd data={websiteJsonLd} />
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
        <Providers initialLang={lang}>
          <RootShell>{children}</RootShell>
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
        <ConsentAnalytics />
      </body>
    </html>
  );
}
