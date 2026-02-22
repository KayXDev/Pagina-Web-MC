import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

let maintenanceCache:
  | {
      enabled: boolean;
      paths: string[];
      ts: number;
    }
  | null = null;

const MAINTENANCE_CACHE_MS = 5000;

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const pathname = request.nextUrl.pathname;

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
  try {
    const now = Date.now();
    let enabled: boolean | null = null;
    let paths: string[] = [];

    if (maintenanceCache && now - maintenanceCache.ts < MAINTENANCE_CACHE_MS) {
      enabled = maintenanceCache.enabled;
      paths = maintenanceCache.paths;
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);

      const res = await fetch(new URL('/api/maintenance', request.url), {
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const maintenance = await res.json();
      enabled = Boolean(maintenance?.enabled);
      paths = Array.isArray(maintenance?.paths) ? maintenance.paths.map((p: any) => String(p)) : [];
      maintenanceCache = { enabled, paths, ts: now };
    }

    if (enabled) {
      const isStaff = token?.role === 'ADMIN' || token?.role === 'STAFF' || token?.role === 'OWNER';

      const allowList =
        pathname === '/mantenimiento' ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/admin');

      if (!isStaff && !allowList) {
        // If no paths are configured, keep legacy behaviour (maintenance applies to all pages)
        if (!paths.length || matchesMaintenancePath(paths, pathname)) {
          return NextResponse.redirect(new URL('/mantenimiento', request.url));
        }
      }
    } else {
      // Si no está en mantenimiento, evitamos que se quede en /mantenimiento
      if (pathname === '/mantenimiento') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  } catch {
    // Si falla la comprobación, no bloqueamos
  }
  
  // Check if user is trying to access admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login?callbackUrl=/admin', request.url));
    }
    
    if (token.role !== 'ADMIN' && token.role !== 'STAFF' && token.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // OWNER can access everything.
    if (token.role !== 'OWNER') {
      // /admin/permisos is OWNER-only
      if (pathname.startsWith('/admin/permisos')) {
        return NextResponse.redirect(new URL('/admin', request.url));
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
                      : pathname.startsWith('/admin/logs')
                        ? 'logs'
                        : pathname.startsWith('/admin/settings')
                          ? 'settings'
                          : null;

        if (sectionKey && sectionKey !== 'dashboard' && !sections.includes(sectionKey)) {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
