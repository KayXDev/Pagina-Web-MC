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
