import type { Metadata } from 'next';

export function getSiteUrl(): string {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://www.999wrldnetwork.es';

  const trimmed = String(raw || '').trim();
  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash || 'https://www.999wrldnetwork.es';
}

export function absoluteUrl(pathname: string): string {
  const base = getSiteUrl();
  const path = String(pathname || '').trim();
  if (!path) return base;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${base}${path}`;
  return `${base}/${path}`;
}

export function getSiteName(): string {
  return String(process.env.SITE_NAME || '999Wrld Network').trim() || '999Wrld Network';
}

export function getDefaultOgImage(): string {
  return absoluteUrl('/icon.png');
}

export function getDefaultKeywords(): string[] {
  return [
    'minecraft',
    'minecraft server',
    'servidor minecraft espanol',
    'spanish minecraft community',
    'minecraft ranks',
    'minecraft store',
    'minecraft forum',
    'minecraft noticias',
    '999wrld network',
  ];
}

export function getAlternateLanguages(pathname: string): Record<string, string> {
  const path = String(pathname || '/').trim() || '/';
  return {
    'es-ES': path,
    'en-US': path,
    'x-default': path,
  };
}

type BuildPageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: 'website' | 'article' | 'profile';
  images?: string[];
  noIndex?: boolean;
};

export function buildPageMetadata(options: BuildPageMetadataOptions): Metadata {
  const title = String(options.title || '').trim() || getSiteName();
  const description = String(options.description || '').trim();
  const canonical = String(options.path || '/').trim() || '/';
  const images = Array.isArray(options.images) && options.images.length > 0
    ? options.images.map((image) => ({ url: absoluteUrl(image) }))
    : [{ url: getDefaultOgImage() }];

  return {
    title,
    description,
    keywords: Array.from(new Set([...(options.keywords || []), ...getDefaultKeywords()])),
    alternates: {
      canonical,
      languages: getAlternateLanguages(canonical),
    },
    robots: options.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      siteName: getSiteName(),
      type: options.type || 'website',
      locale: 'es_ES',
      alternateLocale: ['en_US'],
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((image) => image.url),
    },
  };
}
