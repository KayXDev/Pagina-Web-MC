import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateLicense } from '@/lib/license';

export async function GET() {
  const headerStore = headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || '';
  const proto = headerStore.get('x-forwarded-proto') || 'https';

  const result = await validateLicense({
    host,
    origin: host ? `${proto}://${host}` : undefined,
    pathname: '/api/license/status',
    userAgent: headerStore.get('user-agent') || '',
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 403,
    headers: {
      'cache-control': 'no-store, max-age=0',
    },
  });
}

export const dynamic = 'force-dynamic';
