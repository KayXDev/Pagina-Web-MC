import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';
import { sendServicesStatusReport } from '@/lib/servicesStatusReport';


function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    await dbConnect();

    const webhookSetting = await Settings.findOne({ key: 'services_status_discord_webhook' }).lean();
    const webhookUrl = String(webhookSetting?.value || '').trim();
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook de estado de servicios no configurado' }, { status: 400 });
    }

    const report = await sendServicesStatusReport('admin', webhookUrl);

    await Settings.findOneAndUpdate(
      { key: 'services_status_last_sent_at' },
      { key: 'services_status_last_sent_at', value: report.nowIso, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'SEND_SERVICES_STATUS_REPORT',
      targetType: 'DISCORD',
      targetId: 'services_status_discord_webhook',
      meta: {
        ok: report.allOk,
        intervalMinutes: report.intervalMinutes,
        checks: report.checks.map((c) => ({ key: c.key, ok: c.ok, latencyMs: c.latencyMs, detail: c.detail })),
        path: '/api/admin/services-status/report',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true, ok: report.allOk });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Services status report error:', error);
    return NextResponse.json({ error: error?.message || 'Error generando reporte' }, { status: 500 });
  }
}
