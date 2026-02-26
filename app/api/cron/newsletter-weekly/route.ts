import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';
import { sendWeeklyNewsletter } from '@/lib/newsletterWeekly';
import { isEmailConfigured } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

function isAuthorizedCronRequest(request: Request) {
  const secret = String(process.env.CRON_SECRET || '').trim();

  if (secret) {
    const headerSecret = String(request.headers.get('x-cron-secret') || '').trim();
    const url = new URL(request.url);
    const querySecret = String(url.searchParams.get('secret') || '').trim();
    return headerSecret === secret || querySecret === secret;
  }

  const ua = String(request.headers.get('user-agent') || '');
  return ua.includes('vercel-cron/1.0');
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const baseUrl = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();
    if (!baseUrl) {
      await AdminLog.create({
        adminId: 'system',
        adminUsername: 'cron',
        action: 'AUTO_NEWSLETTER_WEEKLY',
        targetType: 'EMAIL',
        targetId: 'newsletter',
        meta: {
          skipped: 'site-url-not-configured',
          path: '/api/cron/newsletter-weekly',
          method: 'GET',
          userAgent: request.headers.get('user-agent') || undefined,
        },
        ipAddress: getRequestIp(request) || undefined,
      });

      return NextResponse.json({ success: true, skipped: 'site-url-not-configured' });
    }

    const autoSetting = await Settings.findOne({ key: 'newsletter_auto_enabled' }).lean();
    const autoEnabled = String((autoSetting as any)?.value ?? 'true').trim() !== 'false';
    if (!autoEnabled) {
      await AdminLog.create({
        adminId: 'system',
        adminUsername: 'cron',
        action: 'AUTO_NEWSLETTER_WEEKLY',
        targetType: 'EMAIL',
        targetId: 'newsletter',
        meta: {
          skipped: 'disabled',
          path: '/api/cron/newsletter-weekly',
          method: 'GET',
          userAgent: request.headers.get('user-agent') || undefined,
        },
        ipAddress: getRequestIp(request) || undefined,
      });

      return NextResponse.json({ success: true, skipped: 'disabled' });
    }

    if (!isEmailConfigured()) {
      await AdminLog.create({
        adminId: 'system',
        adminUsername: 'cron',
        action: 'AUTO_NEWSLETTER_WEEKLY',
        targetType: 'EMAIL',
        targetId: 'newsletter',
        meta: {
          skipped: 'smtp-not-configured',
          path: '/api/cron/newsletter-weekly',
          method: 'GET',
          userAgent: request.headers.get('user-agent') || undefined,
        },
        ipAddress: getRequestIp(request) || undefined,
      });

      return NextResponse.json({ success: true, skipped: 'smtp-not-configured' });
    }

    const lastSentSetting = await Settings.findOne({ key: 'newsletter_last_sent_at' }).lean();
    const lastSentIso = String(lastSentSetting?.value || '').trim();
    const lastSentAt = lastSentIso ? Date.parse(lastSentIso) : NaN;

    // Prevent accidental duplicates (e.g., retries): 6 days cooldown
    if (Number.isFinite(lastSentAt) && Date.now() - lastSentAt < 6 * 24 * 60 * 60_000) {
      return NextResponse.json({ success: true, skipped: 'recently-sent', lastSentAt: lastSentIso });
    }

    const result = await sendWeeklyNewsletter();

    await Settings.findOneAndUpdate(
      { key: 'newsletter_last_sent_at' },
      { key: 'newsletter_last_sent_at', value: result.nowIso, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    await AdminLog.create({
      adminId: 'system',
      adminUsername: 'cron',
      action: 'AUTO_NEWSLETTER_WEEKLY',
      targetType: 'EMAIL',
      targetId: 'newsletter',
      meta: {
        sent: result.sent,
        subscribers: result.subscribers,
        path: '/api/cron/newsletter-weekly',
        method: 'GET',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron newsletter weekly error:', error);
    return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 });
  }
}
