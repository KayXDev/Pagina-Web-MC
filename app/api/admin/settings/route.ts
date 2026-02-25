import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';

function isDiscordWebhookUrl(url: string) {
  return /^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\//.test(url);
}

type DiscordWebhookPayload = {
  content?: string;
  embeds?: Array<{
    author?: { name: string };
    title?: string;
    url?: string;
    description?: string;
    color?: number;
    timestamp?: string;
    footer?: { text: string };
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
};

async function sendDiscordWebhook(webhookUrl: string, payload: DiscordWebhookPayload) {
  const trimmed = webhookUrl.trim();
  if (!trimmed) return;
  if (!isDiscordWebhookUrl(trimmed)) {
    throw new Error('Webhook de Discord inválido');
  }

  const response = await fetch(trimmed, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Error enviando webhook (${response.status}): ${text || response.statusText}`);
  }
}

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();
    
    const settings = await Settings.find();
    
    // Convertir array a objeto con key-value
    const settingsObj: Record<string, string> = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    return NextResponse.json(settingsObj);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    
    await dbConnect();
    
    const allowedKeys = new Set([
      'maintenance_mode',
      'maintenance_message',
      'maintenance_paths',
      'maintenance_discord_webhook',
      'services_status_discord_webhook',
      'services_status_interval_minutes',
      'staff_applications_open',
    ]);

    const entries = Object.entries(body).filter(([key]) => allowedKeys.has(key));

    // Leer valores actuales para detectar cambios (solo lo necesario)
    const currentMaintenanceMode = await Settings.findOne({ key: 'maintenance_mode' });
    const previousMode = currentMaintenanceMode?.value === 'true' ? 'true' : 'false';

    const updatePromises = entries.map(([key, value]) =>
      Settings.findOneAndUpdate(
        { key },
        { key, value: String(value), updatedAt: new Date() },
        { upsert: true, new: true }
      )
    );
    
    await Promise.all(updatePromises);

    // Enviar aviso a Discord solo si cambió el estado y hay webhook configurado
    let webhookError: string | null = null;
    try {
      const nextModeEntry = entries.find(([k]) => k === 'maintenance_mode');
      const nextMessageEntry = entries.find(([k]) => k === 'maintenance_message');
      const nextWebhookEntry = entries.find(([k]) => k === 'maintenance_discord_webhook');

      const nextMode = nextModeEntry ? String(nextModeEntry[1]) : previousMode;

      if (nextMode !== previousMode) {
        const webhookSetting = nextWebhookEntry
          ? String(nextWebhookEntry[1] ?? '')
          : (await Settings.findOne({ key: 'maintenance_discord_webhook' }))?.value || '';

        const messageSetting = nextMessageEntry
          ? String(nextMessageEntry[1] ?? '')
          : (await Settings.findOne({ key: 'maintenance_message' }))?.value || 'Estamos en mantenimiento. Vuelve más tarde.';

        if (webhookSetting.trim()) {
          const enabled = nextMode === 'true';
          const siteName = process.env.SITE_NAME || 'Sitio';
          const siteUrl = process.env.SITE_URL || '';
          const title = enabled ? '🛠️ Mantenimiento activado' : '✅ Mantenimiento desactivado';
          const color = enabled ? 0xf59e0b : 0x22c55e; // amber / green
          const changedKeys = entries.map(([k]) => k).join(', ') || 'maintenance_mode';

          await sendDiscordWebhook(webhookSetting, {
            embeds: [
              {
                author: { name: `Panel Admin • ${admin.name}` },
                title,
                url: siteUrl || undefined,
                description: messageSetting,
                color,
                timestamp: new Date().toISOString(),
                footer: { text: siteUrl ? `${siteName} • ${siteUrl}` : siteName },
                fields: [
                  { name: 'Estado', value: enabled ? 'EN MANTENIMIENTO' : 'OPERATIVO', inline: true },
                  { name: 'Cambió', value: admin.name, inline: true },
                  { name: 'Claves', value: changedKeys, inline: false },
                ],
              },
            ],
          });
        }
      }
    } catch (err: any) {
      webhookError = err?.message || 'Error enviando webhook';
      console.error('Webhook error:', err);
    }
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'UPDATE_SETTINGS',
      targetType: 'SETTINGS',
      targetId: 'global',
      meta: {
        keys: entries.map(([k]) => k),
        path: '/api/admin/settings',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json({ success: true, webhookError });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
