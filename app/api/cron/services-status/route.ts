import { NextResponse } from 'next/server';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';
import dbConnect from '@/lib/mongodb';
import { sendServicesStatusReport } from '@/lib/servicesStatusReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

function parseIntervalMinutes(raw: string): number {
  const s = String(raw || '').trim();
  if (s === '30') return 30;
  return 60;
}

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

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const autoEnabledSetting = await Settings.findOne({ key: 'services_status_auto_enabled' }).lean();
    const autoEnabled = String(autoEnabledSetting?.value ?? 'true').trim() !== 'false';
    if (!autoEnabled) {
      await AdminLog.create({
        adminId: 'system',
        adminUsername: 'cron',
        action: 'AUTO_SERVICES_STATUS_REPORT_SKIPPED',
        targetType: 'SETTINGS',
        targetId: 'services_status_auto_enabled',
        meta: {
          reason: 'disabled',
          path: '/api/cron/services-status',
          method: 'GET',
          userAgent: request.headers.get('user-agent') || undefined,
        },
        ipAddress: getRequestIp(request) || undefined,
      });

      return NextResponse.json({ success: true, skipped: 'disabled' });
    }

    const webhookSetting = await Settings.findOne({ key: 'services_status_discord_webhook' }).lean();
    const webhookUrl = String(webhookSetting?.value || '').trim();
    if (!webhookUrl) {
      await AdminLog.create({
        adminId: 'system',
        adminUsername: 'cron',
        action: 'AUTO_SERVICES_STATUS_REPORT_SKIPPED',
        targetType: 'SETTINGS',
        targetId: 'services_status_discord_webhook',
        meta: {
          reason: 'no-webhook',
          path: '/api/cron/services-status',
          method: 'GET',
          userAgent: request.headers.get('user-agent') || undefined,
        },
        ipAddress: getRequestIp(request) || undefined,
      });
      return NextResponse.json({ success: true, skipped: 'no-webhook' });
    }

    const intervalSetting = await Settings.findOne({ key: 'services_status_interval_minutes' }).lean();
    const intervalMinutes = parseIntervalMinutes(String(intervalSetting?.value || '60'));
    const intervalMs = intervalMinutes * 60_000;

    const lastSentSetting = await Settings.findOne({ key: 'services_status_last_sent_at' }).lean();
    const lastSentIso = String(lastSentSetting?.value || '').trim();
    const lastSentAt = lastSentIso ? Date.parse(lastSentIso) : NaN;

    const now = Date.now();
    if (Number.isFinite(lastSentAt) && now - lastSentAt < intervalMs - 5_000) {
      await AdminLog.create({
        adminId: 'system',
        adminUsername: 'cron',
        action: 'AUTO_SERVICES_STATUS_REPORT_SKIPPED',
        targetType: 'SETTINGS',
        targetId: 'services_status_last_sent_at',
        meta: {
          reason: 'not-due',
          intervalMinutes,
          lastSentAt: lastSentIso,
          path: '/api/cron/services-status',
          method: 'GET',
          userAgent: request.headers.get('user-agent') || undefined,
        },
        ipAddress: getRequestIp(request) || undefined,
      });
      return NextResponse.json({ success: true, skipped: 'not-due', intervalMinutes, lastSentAt: lastSentIso });
    }

    const report = await sendServicesStatusReport('cron', webhookUrl);

    await Settings.findOneAndUpdate(
      { key: 'services_status_last_sent_at' },
      { key: 'services_status_last_sent_at', value: report.nowIso, updatedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    await AdminLog.create({
      adminId: 'system',
      adminUsername: 'cron',
      action: 'AUTO_SERVICES_STATUS_REPORT',
      targetType: 'DISCORD',
      targetId: 'services_status_discord_webhook',
      meta: {
        ok: report.allOk,
        intervalMinutes: report.intervalMinutes,
        checks: report.checks.map((c) => ({ key: c.key, ok: c.ok, latencyMs: c.latencyMs, detail: c.detail })),
        path: '/api/cron/services-status',
        method: 'GET',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true, ok: report.allOk, sentAt: report.nowIso, intervalMinutes: report.intervalMinutes });
  } catch (error: any) {
    console.error('Cron services status error:', error);
    return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 });
  }
}
