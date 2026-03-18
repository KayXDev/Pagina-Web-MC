import type { Metadata } from 'next';
import { Rajdhani } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import ChatbotWidget from '@/components/ChatbotWidget';
import RootShell from '@/components/RootShell';
import { Providers } from './providers';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { normalizeLang } from '@/lib/i18n';
import ConsentAnalytics from '@/components/ConsentAnalytics';
import { buildPageMetadata, getAlternateLanguages, getDefaultKeywords, getSiteName, getSiteUrl } from '@/lib/seo';
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
  ...buildPageMetadata({
    title: '999Wrld Network - Minecraft Server',
    description:
      'Servidor y comunidad de Minecraft con tienda oficial, foro, noticias, soporte y eventos. Preparado para usuarios, buscadores y asistentes IA.',
    path: '/',
    keywords: getDefaultKeywords(),
  }),
  metadataBase: new URL(siteUrl),
  title: {
    default: '999Wrld Network - Minecraft Server',
    template: '%s | 999Wrld Network',
  },
  applicationName: getSiteName(),
  authors: [{ name: getSiteName() }],
  creator: getSiteName(),
  publisher: getSiteName(),
  category: 'games',
  classification: 'Minecraft community website',
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
    languages: getAlternateLanguages('/'),
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: '/favicon.png' }],
    shortcut: [{ url: '/favicon.png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: getSiteName(),
    statusBarStyle: 'default',
  },
  verification,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = normalizeLang(cookies().get('lang')?.value);
  const nonce = headers().get('x-csp-nonce') || undefined;

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
    name: getSiteName(),
    url: siteUrl,
    inLanguage: ['es', 'en'],
  };

  return (
    <html lang={lang} className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <SeoJsonLd data={orgJsonLd} nonce={nonce} />
        <SeoJsonLd data={websiteJsonLd} nonce={nonce} />
        <script
          nonce={nonce}
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
