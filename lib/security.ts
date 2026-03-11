import { NextResponse } from 'next/server';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function normalizeOrigin(raw: string) {
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

export function isMutationMethod(method: string) {
  const upper = String(method || '').toUpperCase();
  return upper === 'POST' || upper === 'PUT' || upper === 'PATCH' || upper === 'DELETE';
}

export function getClientIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export function getTrustedOrigins(request: Request) {
  const origins = new Set<string>();
  const requestOrigin = normalizeOrigin(request.url);
  if (requestOrigin) origins.add(requestOrigin);

  const siteUrl = normalizeOrigin(String(process.env.SITE_URL || '').trim());
  if (siteUrl) origins.add(siteUrl);

  const nextAuthUrl = normalizeOrigin(String(process.env.NEXTAUTH_URL || '').trim());
  if (nextAuthUrl) origins.add(nextAuthUrl);

  return Array.from(origins);
}

export function requestHasTrustedOrigin(request: Request, trustedOrigins = getTrustedOrigins(request)) {
  const origin = normalizeOrigin(request.headers.get('origin') || '');
  if (origin && trustedOrigins.includes(origin)) return true;

  const referer = normalizeOrigin(request.headers.get('referer') || '');
  if (referer && trustedOrigins.includes(referer)) return true;

  return false;
}

export function shouldRequireTrustedOrigin(pathname: string) {
  if (!pathname.startsWith('/api/')) return false;

  if (matchesPrefix(pathname, '/api/shop/stripe/webhook')) return false;
  if (matchesPrefix(pathname, '/api/cron')) return false;
  if (matchesPrefix(pathname, '/api/deliveries')) return false;

  return [
    '/api/admin',
    '/api/auth',
    '/api/chat',
    '/api/follows',
    '/api/forum',
    '/api/newsletter/subscribe',
    '/api/notifications',
    '/api/partner',
    '/api/profile',
    '/api/shop',
    '/api/staff-applications',
    '/api/tickets',
    '/api/votes/click',
  ].some((prefix) => matchesPrefix(pathname, prefix));
}

function isSensitiveApiPath(pathname: string) {
  return [
    '/api/admin',
    '/api/auth',
    '/api/chat',
    '/api/notifications',
    '/api/partner',
    '/api/profile',
    '/api/shop',
    '/api/tickets',
  ].some((prefix) => matchesPrefix(pathname, prefix));
}

export function buildContentSecurityPolicy(nonce: string) {
  const isProduction = process.env.NODE_ENV === 'production';

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    [
      'script-src',
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      !isProduction ? "'unsafe-eval'" : '',
      'https://va.vercel-scripts.com',
    ]
      .filter(Boolean)
      .join(' '),
    [
      'style-src',
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ].join(' '),
    [
      'img-src',
      "'self'",
      'data:',
      'blob:',
      'https://res.cloudinary.com',
      'https://*.blob.vercel-storage.com',
      'https://crafatar.com',
      'https://minotar.net',
    ].join(' '),
    [
      'font-src',
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ].join(' '),
    [
      'connect-src',
      "'self'",
      !isProduction ? 'ws:' : '',
      !isProduction ? 'wss:' : '',
      'https://api.groq.com',
      'https://api.mcsrvstat.us',
      'https://api.mojang.com',
      'https://api-m.paypal.com',
      'https://api-m.sandbox.paypal.com',
      'https://vitals.vercel-insights.com',
      'https://va.vercel-scripts.com',
    ]
      .filter(Boolean)
      .join(' '),
    [
      'frame-src',
      "'self'",
      'https://js.stripe.com',
      'https://hooks.stripe.com',
      'https://www.paypal.com',
      'https://www.sandbox.paypal.com',
    ].join(' '),
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "manifest-src 'self'",
    isProduction ? 'upgrade-insecure-requests' : '',
  ];

  return directives.filter(Boolean).join('; ');
}

export function applySecurityHeaders(
  response: NextResponse,
  options: { nonce?: string; requestUrl?: URL; pathname?: string } = {}
) {
  const { nonce, requestUrl, pathname = '' } = options;

  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce || ''));
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=(), payment=(self)');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  response.headers.set('Origin-Agent-Cluster', '?1');

  if (requestUrl?.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  if (pathname && isSensitiveApiPath(pathname)) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

function cleanupRateLimitStore(now: number) {
  if (rateLimitStore.size < 500) return;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}

export function buildRateLimitKey(prefix: string, request: Request, subject?: string) {
  const ip = getClientIp(request) || 'unknown';
  const normalizedSubject = String(subject || '')
    .trim()
    .toLowerCase()
    .slice(0, 120);

  return [prefix, ip, normalizedSubject].filter(Boolean).join(':');
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    const next: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, next);
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - next.count),
      resetAt: next.resetAt,
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return {
    allowed: current.count <= limit,
    limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export function enforceRateLimit(
  request: Request,
  options: { key: string; limit: number; windowMs: number; message?: string }
) {
  const result = consumeRateLimit(options.key, options.limit, options.windowMs);
  if (result.allowed) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const response = NextResponse.json(
    { error: options.message || 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
    { status: 429 }
  );

  response.headers.set('Retry-After', String(retryAfterSeconds));
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', String(result.resetAt));

  return response;
}