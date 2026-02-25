import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';
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

export type ServicesStatusTrigger = 'admin' | 'cron';

export type ServicesStatusCheck = {
  key: string;
  ok: boolean;
  title: string;
  summary: string;
  latencyMs?: number;
  detail?: string;
};

function safeValue(text: string, maxLen: number) {
  const v = String(text || '');
  return v.length > maxLen ? `${v.slice(0, maxLen - 1)}…` : v;
}

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

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; latencyMs: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, latencyMs: Date.now() - start };
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'user-agent': '999wrld-services-status/1.0',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function formatCheckValue(c: ServicesStatusCheck) {
  const icon = c.ok ? '🟢' : '🔴';
  const latency = typeof c.latencyMs === 'number' ? `\n⏱️ ${c.latencyMs}ms` : '';
  const detail = c.detail ? `\n${c.detail}` : '';
  return safeValue(`${icon} **${c.summary}**${latency}${detail}`, 1024);
}

function configuredLabel(isConfigured: boolean) {
  return isConfigured ? 'Configurado' : 'No configurado';
}

export async function buildServicesStatusReport(trigger: ServicesStatusTrigger) {
  await dbConnect();

  const siteName = process.env.SITE_NAME || '999Wrld Network';
  const siteUrl = String(process.env.SITE_URL || '').trim();

  const host = process.env.MINECRAFT_SERVER_IP || process.env.NEXT_PUBLIC_MINECRAFT_SERVER_IP || 'localhost';
  const port = Number(process.env.MINECRAFT_SERVER_PORT || process.env.NEXT_PUBLIC_MINECRAFT_SERVER_PORT || 25565);

  const nowIso = new Date().toISOString();

  const maintenanceMode = (await Settings.findOne({ key: 'maintenance_mode' }).lean())?.value === 'true';
  const maintenanceMessage = String((await Settings.findOne({ key: 'maintenance_message' }).lean())?.value || '').trim();
  const staffAppsOpen = (await Settings.findOne({ key: 'staff_applications_open' }).lean())?.value === 'true';

  const checks: ServicesStatusCheck[] = [];

  // DB check (real query)
  try {
    const { latencyMs } = await timed(async () => {
      await Settings.findOne({ key: 'maintenance_mode' }).lean();
    });
    checks.push({ key: 'db', ok: true, title: 'MongoDB', summary: 'MongoDB OK', latencyMs, detail: 'Query OK' });
  } catch (err: any) {
    checks.push({ key: 'db', ok: false, title: 'MongoDB', summary: 'MongoDB ERROR', detail: err?.message || 'Error de conexión' });
  }

  // Web check (SITE_URL)
  if (siteUrl) {
    try {
      const { latencyMs, value } = await timed(async () => {
        const res = await fetchWithTimeout(siteUrl, 7000);
        return res;
      });
      checks.push({
        key: 'web',
        ok: value.ok,
        title: 'Web',
        summary: value.ok ? 'Web OK' : `Web ${value.status}`,
        latencyMs,
        detail: `GET ${new URL(siteUrl).hostname}`,
      });
    } catch (err: any) {
      checks.push({ key: 'web', ok: false, title: 'Web', summary: 'Web ERROR', detail: err?.name === 'AbortError' ? 'Timeout' : (err?.message || 'Error') });
    }
  } else {
    checks.push({ key: 'web', ok: true, title: 'Web', summary: 'Web omitido', detail: 'SITE_URL no configurado' });
  }

  // Auth check (NextAuth session endpoint)
  if (siteUrl) {
    try {
      const sessionUrl = new URL('/api/auth/session', siteUrl).toString();
      const { latencyMs, value } = await timed(async () => {
        const res = await fetchWithTimeout(sessionUrl, 7000);
        return res;
      });

      checks.push({
        key: 'auth',
        ok: value.ok,
        title: 'Auth',
        summary: value.ok ? 'Auth OK' : `Auth ${value.status}`,
        latencyMs,
        detail: 'GET /api/auth/session',
      });
    } catch (err: any) {
      checks.push({ key: 'auth', ok: false, title: 'Auth', summary: 'Auth ERROR', detail: err?.name === 'AbortError' ? 'Timeout' : (err?.message || 'Error') });
    }
  } else {
    checks.push({ key: 'auth', ok: true, title: 'Auth', summary: 'Auth omitido', detail: 'SITE_URL no configurado' });
  }

  // Minecraft check
  try {
    const { value, latencyMs } = await timed(async () => getServerStatus(host, port));
    const ok = Boolean(value?.online);
    const players = ok ? `${value.players.online}/${value.players.max}` : 'offline';
    checks.push({
      key: 'minecraft',
      ok,
      title: 'Minecraft',
      summary: ok ? `Minecraft OK (${players})` : 'Minecraft OFFLINE',
      latencyMs,
      detail: `${host}:${port}`,
    });
  } catch (err: any) {
    checks.push({ key: 'minecraft', ok: false, title: 'Minecraft', summary: 'Minecraft ERROR', detail: err?.message || 'Error consultando estado' });
  }

  // Stripe check (optional)
  try {
    const hasStripe = Boolean(String(process.env.STRIPE_SECRET_KEY || '').trim());
    if (!hasStripe) {
      checks.push({ key: 'stripe', ok: true, title: 'Stripe', summary: 'Stripe omitido', detail: 'STRIPE_SECRET_KEY no configurado' });
    } else {
      const { latencyMs } = await timed(async () => {
        const stripe = getStripe();
        await stripe.balance.retrieve();
      });
      checks.push({ key: 'stripe', ok: true, title: 'Stripe', summary: 'Stripe OK', latencyMs, detail: 'balance.retrieve OK' });
    }
  } catch (err: any) {
    checks.push({ key: 'stripe', ok: false, title: 'Stripe', summary: 'Stripe ERROR', detail: err?.message || 'Error consultando Stripe' });
  }

  // Config checks (presence only, never leak values)
  const nextAuthOk = Boolean(String(process.env.NEXTAUTH_SECRET || '').trim());
  checks.push({
    key: 'nextauth_secret',
    ok: nextAuthOk,
    title: 'Config',
    summary: nextAuthOk ? 'NEXTAUTH_SECRET OK' : 'NEXTAUTH_SECRET falta',
    detail: 'Secreto requerido para sesiones seguras',
  });

  const cloudinaryConfigured = Boolean(String(process.env.CLOUDINARY_URL || '').trim()) ||
    (Boolean(String(process.env.CLOUDINARY_CLOUD_NAME || '').trim()) &&
      Boolean(String(process.env.CLOUDINARY_API_KEY || '').trim()) &&
      Boolean(String(process.env.CLOUDINARY_API_SECRET || '').trim()));

  checks.push({
    key: 'cloudinary',
    ok: true,
    title: 'Uploads',
    summary: `Cloudinary: ${configuredLabel(cloudinaryConfigured)}`,
    detail: cloudinaryConfigured ? 'OK' : 'Opcional (si usas uploads en producción)',
  });

  const blobConfigured = Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || '').trim());
  checks.push({
    key: 'vercel_blob',
    ok: true,
    title: 'Uploads',
    summary: `Vercel Blob: ${configuredLabel(blobConfigured)}`,
    detail: blobConfigured ? 'OK' : 'Opcional (alternativa a Cloudinary)',
  });

  // Deployment info (not a check)
  const vercelEnv = String(process.env.VERCEL_ENV || '').trim();
  const vercelUrl = String(process.env.VERCEL_URL || '').trim();
  const commit = String(process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_REF || '').trim();

  const failures = checks.filter((c) => !c.ok);
  const allOk = failures.length === 0;

  const intervalSetting = await Settings.findOne({ key: 'services_status_interval_minutes' }).lean();
  const intervalMinutesRaw = String(intervalSetting?.value || '60');
  const intervalMinutes = intervalMinutesRaw === '30' ? 30 : 60;

  const overviewFields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Trigger', value: trigger === 'cron' ? 'Automático (cron)' : 'Manual (admin)', inline: true },
    { name: 'Intervalo', value: `${intervalMinutes} min`, inline: true },
    { name: 'Mantenimiento', value: maintenanceMode ? 'ACTIVO' : 'INACTIVO', inline: true },
    { name: 'Staff applications', value: staffAppsOpen ? 'ABIERTO' : 'CERRADO', inline: true },
    { name: 'Checks OK', value: `${checks.length - failures.length}/${checks.length}`, inline: true },
    { name: 'Node', value: safeValue(process.version, 100), inline: true },
  ];

  if (vercelEnv || vercelUrl || commit) {
    overviewFields.push({
      name: 'Deploy',
      value: safeValue(
        `${vercelEnv ? `env=${vercelEnv}` : ''}${vercelEnv && vercelUrl ? '\n' : ''}${vercelUrl ? `url=${vercelUrl}` : ''}${(vercelEnv || vercelUrl) && commit ? '\n' : ''}${commit ? `git=${commit}` : ''}`.trim() || '-',
        1024
      ),
      inline: false,
    });
  }

  if (maintenanceMode && maintenanceMessage) {
    overviewFields.push({
      name: 'Mensaje mantenimiento',
      value: safeValue(maintenanceMessage, 1024),
      inline: false,
    });
  }

  const detailedFields = checks.slice(0, 25).map((c) => ({
    name: c.title,
    value: formatCheckValue(c),
    inline: false,
  }));

  const title = allOk ? '✅ Estado de servicios' : '⚠️ Estado de servicios (incidencias)';
  const color = allOk ? 0x22c55e : 0xf59e0b;

  const embeds: DiscordWebhookPayload['embeds'] = [
    {
      author: { name: `${siteName} • Services` },
      title,
      url: siteUrl || undefined,
      description: 'Reporte automático de estado. No comparte secretos; solo indica si están configurados.',
      color,
      timestamp: nowIso,
      footer: { text: siteUrl ? `${siteName} • ${new URL(siteUrl).hostname}` : siteName },
      fields: overviewFields.slice(0, 25),
    },
    {
      title: 'Detalles',
      color,
      timestamp: nowIso,
      fields: detailedFields,
    },
  ];

  return { allOk, checks, embeds, intervalMinutes, nowIso };
}

export async function sendServicesStatusReport(trigger: ServicesStatusTrigger, webhookUrl: string) {
  const report = await buildServicesStatusReport(trigger);
  await sendDiscordWebhook(webhookUrl, { embeds: report.embeds });
  return report;
}
