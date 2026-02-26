import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';
import { sendWeeklyNewsletter } from '@/lib/newsletterWeekly';
import { isEmailConfigured } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function parseIntSetting(value: unknown, fallback: number) {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

const FIXED_SEND_HOUR_UTC = 10;
const FIXED_SEND_MINUTE_UTC = 0;

// Returns the scheduled DateTime (UTC) for the current week (week starts Monday) at the given weekday/time.
// weekday: 0(Sun) .. 6(Sat)
function scheduledUtcForCurrentWeek(now: Date, weekday: number, hourUtc: number, minuteUtc: number) {
  const day = now.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - daysSinceMonday);

  const weekdayOffsetFromMonday = (weekday + 6) % 7;
  const scheduled = new Date(startOfWeek);
  scheduled.setUTCDate(scheduled.getUTCDate() + weekdayOffsetFromMonday);
  scheduled.setUTCHours(hourUtc, minuteUtc, 0, 0);
  return scheduled;
}

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

    const [scheduleDowSetting, lastAutoSlotSetting] = await Promise.all([
      Settings.findOne({ key: 'newsletter_schedule_dow' }).lean(),
      Settings.findOne({ key: 'newsletter_last_auto_scheduled_at' }).lean(),
    ]);

    const weekday = clampInt(parseIntSetting((scheduleDowSetting as any)?.value, 1), 0, 6); // default Monday (1)
    const lastAutoSlotIso = String((lastAutoSlotSetting as any)?.value || '').trim();

    const hourUtc = FIXED_SEND_HOUR_UTC;
    const minuteUtc = FIXED_SEND_MINUTE_UTC;

    const now = new Date();

    // Vercel Hobby cron can run only once per day. We call this endpoint daily and only send
    // on the configured weekday.
    if (now.getUTCDay() !== weekday) {
      return NextResponse.json({
        success: true,
        skipped: 'wrong-day',
        schedule: { weekday },
      });
    }

    const scheduledSlot = scheduledUtcForCurrentWeek(now, weekday, hourUtc, minuteUtc);
    const scheduledSlotIso = scheduledSlot.toISOString();

    if (now.getTime() < scheduledSlot.getTime()) {
      return NextResponse.json({
        success: true,
        skipped: 'not-time-yet',
        schedule: { weekday, scheduledSlotIso },
      });
    }

    if (lastAutoSlotIso && lastAutoSlotIso === scheduledSlotIso) {
      return NextResponse.json({
        success: true,
        skipped: 'already-sent-for-slot',
        schedule: { weekday, scheduledSlotIso },
      });
    }

    const result = await sendWeeklyNewsletter();

    await Promise.all([
      Settings.findOneAndUpdate(
        { key: 'newsletter_last_sent_at' },
        { key: 'newsletter_last_sent_at', value: result.nowIso, updatedAt: new Date() },
        { upsert: true, new: true }
      ),
      Settings.findOneAndUpdate(
        { key: 'newsletter_last_auto_scheduled_at' },
        { key: 'newsletter_last_auto_scheduled_at', value: scheduledSlotIso, updatedAt: new Date() },
        { upsert: true, new: true }
      ),
    ]);

    await AdminLog.create({
      adminId: 'system',
      adminUsername: 'cron',
      action: 'AUTO_NEWSLETTER_WEEKLY',
      targetType: 'EMAIL',
      targetId: 'newsletter',
      meta: {
        sent: result.sent,
        subscribers: result.subscribers,
        schedule: { weekday, scheduledSlotIso },
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
