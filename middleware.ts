import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  applySecurityHeaders,
  getTrustedOrigins,
  isMutationMethod,
  requestHasTrustedOrigin,
  shouldRequireTrustedOrigin,
} from '@/lib/security';

let maintenanceCache:
  | {
      enabled: boolean;
      paths: string[];
      ts: number;
    }
  | null = null;

const MAINTENANCE_CACHE_MS = 5000;
const MAINTENANCE_TIMEOUT_MS = 5000;
const MAINTENANCE_FALLBACK_MAX_AGE_MS = 60_000;

function finalizeResponse(request: NextRequest, response: NextResponse, pathname: string, nonce: string) {
  return applySecurityHeaders(response, {
    nonce,
    requestUrl: request.nextUrl,
    pathname,
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api');
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-csp-nonce', nonce);

  if (!isApiRoute && /\.[a-zA-Z0-9]+$/.test(pathname)) {
    return finalizeResponse(
      request,
      NextResponse.next({ request: { headers: requestHeaders } }),
      pathname,
      nonce
    );
  }

  if (isApiRoute && isMutationMethod(request.method) && shouldRequireTrustedOrigin(pathname)) {
    const trustedOrigins = getTrustedOrigins(request);
    if (!requestHasTrustedOrigin(request, trustedOrigins)) {
      return finalizeResponse(
        request,
        NextResponse.json({ error: 'Origen no permitido' }, { status: 403 }),
        pathname,
        nonce
      );
    }
  }

  if (isApiRoute) {
    return finalizeResponse(
      request,
      NextResponse.next({ request: { headers: requestHeaders } }),
      pathname,
      nonce
    );
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // If the user has no explicit language cookie, infer it from the browser.
  // Supported: 'es' | 'en'
  const shouldSetLangCookie = !request.cookies.get('lang')?.value;
  const inferLang = () => {
    const raw = String(request.headers.get('accept-language') || '').toLowerCase();
    const first = raw.split(',')[0]?.trim() || '';
    const base = first.slice(0, 2);
    return base === 'en' ? 'en' : 'es';
  };

  const matchesMaintenancePath = (paths: string[], currentPath: string) => {
    const cur = (currentPath || '').trim();
    if (!cur.startsWith('/')) return false;

    for (const raw of paths) {
      const p0 = String(raw || '').trim();
      if (!p0) continue;

      // support "*" and "/*" suffix as prefix match
      const isWildcard = p0.endsWith('*');
      const base = (isWildcard ? p0.slice(0, -1) : p0).replace(/\/+$/, '') || '/';

      if (base === '/') return true;
      if (cur === base) return true;
      if (cur.startsWith(base + '/')) return true;

      // if user wrote "/foo/" match "/foo" too
      if (cur === base + '/') return true;
    }

    return false;
  };

  // Modo mantenimiento (dinámico desde Settings)
  const now = Date.now();
  let maintenanceEnabled: boolean | null = null;
  let maintenancePaths: string[] = [];
  let maintenanceKnown = false;

  try {
    if (maintenanceCache && now - maintenanceCache.ts < MAINTENANCE_CACHE_MS) {
      maintenanceEnabled = maintenanceCache.enabled;
      maintenancePaths = maintenanceCache.paths;
      maintenanceKnown = true;
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MAINTENANCE_TIMEOUT_MS);

      const res = await fetch(new URL('/api/maintenance', request.url), {
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const maintenance = await res.json();
      maintenanceEnabled = Boolean(maintenance?.enabled);
      maintenancePaths = Array.isArray(maintenance?.paths) ? maintenance.paths.map((p: any) => String(p)) : [];
      maintenanceCache = { enabled: maintenanceEnabled, paths: maintenancePaths, ts: now };
      maintenanceKnown = true;
    }
  } catch {
    // Fallback: en conexiones lentas (móvil) o cold starts, usa el último valor conocido.
    if (maintenanceCache && now - maintenanceCache.ts < MAINTENANCE_FALLBACK_MAX_AGE_MS) {
      maintenanceEnabled = maintenanceCache.enabled;
      maintenancePaths = maintenanceCache.paths;
      maintenanceKnown = true;
    }
  }

  if (maintenanceKnown) {
    if (maintenanceEnabled) {
      const allowList =
        pathname === '/mantenimiento' ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/admin');

      if (!allowList) {
        // Maintenance applies only to configured paths.
        // Use "/" (or "/*") to put the entire site into maintenance.
        if (matchesMaintenancePath(maintenancePaths, pathname)) {
          return finalizeResponse(
            request,
            NextResponse.redirect(new URL('/mantenimiento', request.url)),
            pathname,
            nonce
          );
        }
      }
    } else {
      // Si no está en mantenimiento, evitamos que se quede en /mantenimiento
      if (pathname === '/mantenimiento') {
        return finalizeResponse(request, NextResponse.redirect(new URL('/', request.url)), pathname, nonce);
      }
    }
  }
  
  // Check if user is trying to access admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return finalizeResponse(
        request,
        NextResponse.redirect(new URL('/auth/login?callbackUrl=/admin', request.url)),
        pathname,
        nonce
      );
    }
    
    if (token.role !== 'ADMIN' && token.role !== 'STAFF' && token.role !== 'OWNER') {
      return finalizeResponse(request, NextResponse.redirect(new URL('/', request.url)), pathname, nonce);
    }

    // OWNER can access everything.
    if (token.role !== 'OWNER') {
      // /admin/permisos is OWNER-only
      if (pathname.startsWith('/admin/permisos')) {
        return finalizeResponse(request, NextResponse.redirect(new URL('/admin', request.url)), pathname, nonce);
      }

      // Restrict ADMIN users by configured section permissions.
      if (token.role === 'ADMIN' && (token as any).adminSectionsConfigured) {
        const sections = Array.isArray((token as any).adminSections) ? ((token as any).adminSections as string[]) : [];

        const sectionKey =
          pathname === '/admin'
            ? 'dashboard'
            : pathname.startsWith('/admin/users')
              ? 'users'
              : pathname.startsWith('/admin/products')
                ? 'products'
                : pathname.startsWith('/admin/tickets')
                  ? 'tickets'
                  : pathname.startsWith('/admin/blog')
                    ? 'blog'
                    : pathname.startsWith('/admin/postulaciones')
                      ? 'applications'
                      : pathname.startsWith('/admin/newsletter')
                        ? 'newsletter'
                      : pathname.startsWith('/admin/logs')
                        ? 'logs'
                        : pathname.startsWith('/admin/settings')
                          ? 'settings'
                          : null;

        if (sectionKey && sectionKey !== 'dashboard' && !sections.includes(sectionKey)) {
          return finalizeResponse(request, NextResponse.redirect(new URL('/admin', request.url)), pathname, nonce);
        }
      }
    }
  }
  
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (shouldSetLangCookie) {
    res.cookies.set('lang', inferLang(), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    });
  }
  return finalizeResponse(request, res, pathname, nonce);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
