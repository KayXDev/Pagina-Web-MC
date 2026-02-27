export function formatDate(date: Date | string, locale: string = 'es-ES'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string, locale: string = 'es-ES'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeAgo(date: Date | string, locale: string = 'es-ES'): string {
  const d = new Date(date);
  const now = new Date();
  const diffSeconds = Math.round((d.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSeconds < 60) return rtf.format(diffSeconds, 'second');

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day');

  const diffWeeks = Math.round(diffDays / 7);
  if (Math.abs(diffWeeks) < 4) return rtf.format(diffWeeks, 'week');

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month');

  const diffYears = Math.round(diffDays / 365);
  return rtf.format(diffYears, 'year');
}

export function formatPrice(price: number, locale: string = 'es-ES', currency: string = 'EUR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(price);
}

export function formatSocialCount(value: number, locale: string = 'es-ES'): string {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';

  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(n));
  const fmtInt = (num: number) => new Intl.NumberFormat(locale).format(num);

  // Only compact once we hit 10,000 (10k)
  if (abs < 10_000) return sign + fmtInt(abs);

  // Rules:
  // - 10,000..99,999 => 1 decimal (17.6k)
  // - 100,000..999,999 => 0 decimals (176k)
  // - 1,000,000..9,999,999 => 1 decimal (1.2M)
  // - >= 10,000,000 => 0 decimals (12M)
  // Same logic applies for billions.
  const formatScaled = (scaled: number, decimals: number, suffix: string) => {
    const rounded = Number(scaled.toFixed(decimals));
    const text = rounded.toFixed(decimals).replace(/\.0$/, '');
    return { rounded, text: `${sign}${text}${suffix}` };
  };

  if (abs >= 1_000_000_000) {
    const scaled = abs / 1_000_000_000;
    const decimals = abs < 10_000_000_000 ? 1 : 0;
    const out = formatScaled(scaled, decimals, 'B');
    return out.text;
  }

  if (abs >= 1_000_000) {
    const scaled = abs / 1_000_000;
    const decimals = abs < 10_000_000 ? 1 : 0;
    const out = formatScaled(scaled, decimals, 'M');
    if (out.rounded >= 1000) {
      const bump = formatScaled(abs / 1_000_000_000, 1, 'B');
      return bump.text;
    }
    return out.text;
  }

  // abs >= 10k here
  const scaled = abs / 1_000;
  const decimals = abs < 100_000 ? 1 : 0;
  const out = formatScaled(scaled, decimals, 'k');
  if (out.rounded >= 1000) {
    const bump = formatScaled(abs / 1_000_000, 1, 'M');
    return bump.text;
  }
  return out.text;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function normalizeExternalUrl(input: string): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const normalized = (() => {
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('//')) return `https:${raw}`;
    return `https://${raw}`;
  })();

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
