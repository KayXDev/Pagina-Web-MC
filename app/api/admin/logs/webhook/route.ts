import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';

const SETTINGS_KEY = 'admin_logs_discord_webhook';

function isDiscordWebhookUrl(url: string) {
  return /^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\//.test(url);
}

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function GET() {
  try {
    await requireOwner();
    await dbConnect();

    const setting = await Settings.findOne({ key: SETTINGS_KEY });
    return NextResponse.json({ webhookUrl: setting?.value || '' });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Error al obtener webhook' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const owner = await requireOwner();
    const body = await request.json().catch(() => ({}));
    const webhookUrl = String(body.webhookUrl ?? '');

    const trimmed = webhookUrl.trim();
    if (trimmed && !isDiscordWebhookUrl(trimmed)) {
      return NextResponse.json({ error: 'Webhook de Discord inválido' }, { status: 400 });
    }

    await dbConnect();

    await Settings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { key: SETTINGS_KEY, value: trimmed, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    await AdminLog.create({
      adminId: owner.id,
      adminUsername: owner.name,
      action: 'UPDATE_LOGS_WEBHOOK',
      targetType: 'SETTINGS',
      targetId: SETTINGS_KEY,
      meta: {
        key: SETTINGS_KEY,
        hasWebhook: !!trimmed,
        path: '/api/admin/logs/webhook',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Error al guardar webhook' }, { status: 500 });
  }
}
