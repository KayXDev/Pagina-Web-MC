import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';
import { getServerStatus } from '@/lib/minecraft';
import { getStripe } from '@/lib/stripe';

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
  if (!trimmed) throw new Error('Webhook no configurado');
  if (!isDiscordWebhookUrl(trimmed)) throw new Error('Webhook de Discord inválido');

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

type CheckResult = {
  ok: boolean;
  name: string;
  summary: string;
  detail?: string;
  latencyMs?: number;
};

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; latencyMs: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, latencyMs: Date.now() - start };
}

function formatResult(r: CheckResult) {
  const icon = r.ok ? '🟢' : '🔴';
  const latency = typeof r.latencyMs === 'number' ? `\n⏱️ ${r.latencyMs}ms` : '';
  const detail = r.detail ? `\n${r.detail}` : '';
  return `${icon} **${r.summary}**${latency}${detail}`.slice(0, 1024);
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

    const host = process.env.MINECRAFT_SERVER_IP || process.env.NEXT_PUBLIC_MINECRAFT_SERVER_IP || 'localhost';
    const port = Number(process.env.MINECRAFT_SERVER_PORT || process.env.NEXT_PUBLIC_MINECRAFT_SERVER_PORT || 25565);

    const checks: CheckResult[] = [];

    // DB
    try {
      const { latencyMs } = await timed(async () => {
        // Lightweight query that still hits the DB.
        await Settings.findOne({ key: 'maintenance_mode' }).lean();
      });
      checks.push({ ok: true, name: 'db', summary: 'MongoDB', latencyMs, detail: 'Conexión OK' });
    } catch (err: any) {
      checks.push({ ok: false, name: 'db', summary: 'MongoDB', detail: err?.message || 'Error de conexión' });
    }

    // Minecraft status (mcsrvstat)
    try {
      const { value, latencyMs } = await timed(async () => getServerStatus(host, port));
      const ok = Boolean(value?.online);
      checks.push({
        ok,
        name: 'minecraft',
        summary: `Minecraft (${host}:${port})`,
        latencyMs,
        detail: ok ? `Jugadores: ${value.players.online}/${value.players.max}` : 'Servidor offline',
      });
    } catch (err: any) {
      checks.push({
        ok: false,
        name: 'minecraft',
        summary: `Minecraft (${host}:${port})`,
        detail: err?.message || 'Error consultando estado',
      });
    }

    // Stripe (optional)
    try {
      const hasStripe = Boolean(String(process.env.STRIPE_SECRET_KEY || '').trim());
      if (!hasStripe) {
        checks.push({ ok: true, name: 'stripe', summary: 'Stripe', detail: 'No configurado (omitido)' });
      } else {
        const { latencyMs } = await timed(async () => {
          const stripe = getStripe();
          await stripe.balance.retrieve();
        });
        checks.push({ ok: true, name: 'stripe', summary: 'Stripe', latencyMs, detail: 'API OK' });
      }
    } catch (err: any) {
      checks.push({ ok: false, name: 'stripe', summary: 'Stripe', detail: err?.message || 'Error consultando Stripe' });
    }

    const allOk = checks.every((c) => c.ok);
    const siteName = process.env.SITE_NAME || '999Wrld Network';
    const siteUrl = process.env.SITE_URL || '';
    const nowIso = new Date().toISOString();

    const fields = checks.slice(0, 25).map((c) => ({
      name: c.summary,
      value: formatResult(c),
      inline: false,
    }));

    const payload: DiscordWebhookPayload = {
      embeds: [
        {
          author: { name: `Estado de servicios • ${admin.name}` },
          title: allOk ? '✅ Servicios operativos' : '⚠️ Incidencias detectadas',
          url: siteUrl || undefined,
          description: `Reporte generado automáticamente desde el panel admin.`,
          color: allOk ? 0x22c55e : 0xf59e0b,
          timestamp: nowIso,
          footer: { text: siteUrl ? `${siteName} • ${siteUrl}` : siteName },
          fields,
        },
      ],
    };

    await sendDiscordWebhook(webhookUrl, payload);

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'SEND_SERVICES_STATUS_REPORT',
      targetType: 'DISCORD',
      targetId: 'services_status_discord_webhook',
      meta: {
        ok: allOk,
        checks: checks.map((c) => ({ name: c.name, ok: c.ok, latencyMs: c.latencyMs, detail: c.detail })),
        path: '/api/admin/services-status/report',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true, ok: allOk });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Services status report error:', error);
    return NextResponse.json({ error: error?.message || 'Error generando reporte' }, { status: 500 });
  }
}
