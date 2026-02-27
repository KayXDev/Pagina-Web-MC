import { NextResponse } from 'next/server';
import { GET as servicesStatusGET } from '../services-status/route';
import { GET as newsletterWeeklyGET } from '../newsletter-weekly/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function isAuthorizedCronRequest(request: Request) {
  const ua = String(request.headers.get('user-agent') || '');
  if (ua.includes('vercel-cron/1.0')) return true;

  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) return false;

  const headerSecret = String(request.headers.get('x-cron-secret') || '').trim();
  const url = new URL(request.url);
  const querySecret = String(url.searchParams.get('secret') || '').trim();
  return headerSecret === secret || querySecret === secret;
}

function buildInternalHeaders(fromRequest: Request) {
  const headers = new Headers();

  const forwardedFor = fromRequest.headers.get('x-forwarded-for');
  const realIp = fromRequest.headers.get('x-real-ip');
  const ua = fromRequest.headers.get('user-agent') || 'vercel-cron/1.0';

  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
  if (realIp) headers.set('x-real-ip', realIp);
  headers.set('user-agent', ua);

  const secret = String(process.env.CRON_SECRET || '').trim();
  if (secret) headers.set('x-cron-secret', secret);

  return headers;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const origin = new URL(request.url).origin;
    const headers = buildInternalHeaders(request);

    const [servicesResult, newsletterResult] = await Promise.allSettled([
      servicesStatusGET(new Request(`${origin}/api/cron/services-status`, { headers })),
      newsletterWeeklyGET(new Request(`${origin}/api/cron/newsletter-weekly`, { headers })),
    ]);

    const services =
      servicesResult.status === 'fulfilled'
        ? { ok: true, status: servicesResult.value.status, body: await servicesResult.value.json().catch(() => null) }
        : { ok: false, error: String((servicesResult as any).reason?.message || (servicesResult as any).reason || 'Error') };

    const newsletter =
      newsletterResult.status === 'fulfilled'
        ? { ok: true, status: newsletterResult.value.status, body: await newsletterResult.value.json().catch(() => null) }
        : { ok: false, error: String((newsletterResult as any).reason?.message || (newsletterResult as any).reason || 'Error') };

    return NextResponse.json({ success: true, services, newsletter });
  } catch (error: any) {
    console.error('Cron daily error:', error);
    return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 });
  }
}
