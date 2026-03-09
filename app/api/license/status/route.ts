import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateLicense } from '@/lib/license';
import { getStoredLicenseMetadata } from '@/lib/license-settings';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  try {
    await requireAdmin();

    const headerStore = headers();
    const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || '';
    const proto = headerStore.get('x-forwarded-proto') || 'https';

    const result = await validateLicense({
      host,
      origin: host ? `${proto}://${host}` : undefined,
      pathname: '/api/license/status',
      userAgent: headerStore.get('user-agent') || '',
    });

    const storedLicense = await getStoredLicenseMetadata();
    const responsePayload = storedLicense.expiresAt
      ? {
          ...result,
          expiresAt: storedLicense.expiresAt,
          meta: {
            ...(result.meta || {}),
            extractedLicenseInfo: {
              ...((result.meta as any)?.extractedLicenseInfo || {}),
              expiresAt: storedLicense.expiresAt,
              expirySource: storedLicense.source,
            },
          },
        }
      : result;

    return NextResponse.json(responsePayload, {
      status: result.ok ? 200 : 403,
      headers: {
        'cache-control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Error al validar licencia' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
