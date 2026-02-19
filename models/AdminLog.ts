import mongoose, { Schema, models } from 'mongoose';
import Settings from './Settings';

export interface IAdminLog {
  _id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  meta?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    adminId: {
      type: String,
      required: true,
    },
    adminUsername: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
    },
    targetId: {
      type: String,
    },
    details: {
      type: String,
    },
    meta: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const DISCORD_WEBHOOK_SETTINGS_KEY = 'admin_logs_discord_webhook';
let cachedWebhookUrl: string | null = null;
let cachedWebhookUrlAt = 0;
const WEBHOOK_CACHE_TTL_MS = 30_000;

async function getDiscordWebhookUrl(): Promise<string | null> {
  const now = Date.now();
  if (now - cachedWebhookUrlAt < WEBHOOK_CACHE_TTL_MS) return cachedWebhookUrl;

  try {
    const setting = await Settings.findOne({ key: DISCORD_WEBHOOK_SETTINGS_KEY }).lean();
    const url = typeof setting?.value === 'string' ? setting.value.trim() : '';
    cachedWebhookUrl = url.length > 0 ? url : null;
    cachedWebhookUrlAt = now;
    return cachedWebhookUrl;
  } catch {
    cachedWebhookUrl = null;
    cachedWebhookUrlAt = now;
    return null;
  }
}

function safeString(value: unknown, maxLen: number) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

function prettyJson(value: unknown, maxLen: number) {
  try {
    const text = JSON.stringify(value, null, 2);
    return safeString(text, maxLen);
  } catch {
    return safeString(value, maxLen);
  }
}

function pickColor(action: string) {
  const upper = (action || '').toUpperCase();
  if (/(DELETE|REMOVE|BAN|BLOCK)/.test(upper)) return 0xc62424; // redstone
  if (/(CREATE|ADD|NEW)/.test(upper)) return 0x7bc043; // grass
  if (/(UPDATE|EDIT|PATCH|SET)/.test(upper)) return 0x47d1e8; // diamond
  if (/(LOGIN|AUTH|SESSION)/.test(upper)) return 0xf9e547; // gold
  return 0x7f7f7f; // stone
}

function humanizeAction(action: string) {
  return (action || 'UNKNOWN').replace(/_/g, ' ').trim();
}

function buildDiscordPayload(log: IAdminLog) {
  const actionText = humanizeAction(log.action);
  const title = actionText;

  const details = log.details ? safeString(log.details, 900) : '';
  const quoteDetails = details
    ? `> ${details.replace(/\n/g, '\n> ')}`
    : '> *(sin detalles)*';

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  fields.push({
    name: 'Admin',
    value: `**${safeString(log.adminUsername, 120)}**\n\`${safeString(log.adminId, 120)}\``,
    inline: true,
  });

  if (log.targetType || log.targetId) {
    fields.push({
      name: 'Target',
      value: `${log.targetType ?? '-'}\n\`${safeString(log.targetId ?? '-', 200)}\``,
      inline: true,
    });
  }

  if (log.ipAddress) {
    fields.push({
      name: 'IP',
      value: `\`${safeString(log.ipAddress, 80)}\``,
      inline: true,
    });
  }

  if (log.meta && Object.keys(log.meta).length > 0) {
    const metaJson = prettyJson(log.meta, 900);
    fields.push({
      name: 'Meta',
      value: `\`\`\`json\n${metaJson}\n\`\`\``,
    });
  }

  return {
    username: '999Wrld Logs',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title,
        color: pickColor(log.action),
        description: `**Acción:** \`${safeString(log.action, 120)}\`\n\n**Detalles**\n${quoteDetails}`.slice(
          0,
          4096
        ),
        timestamp: (log.createdAt ? new Date(log.createdAt) : new Date()).toISOString(),
        footer: {
          text: '999Wrld Network • Admin Logs',
        },
        fields: fields.slice(0, 25),
      },
    ],
  };
}

const WEBHOOK_HOOK_FLAG = '__adminLogDiscordWebhookHookRegistered__';

function registerDiscordWebhookHook(schema: Schema) {
  const anySchema = schema as any;
  if (anySchema[WEBHOOK_HOOK_FLAG]) return;
  anySchema[WEBHOOK_HOOK_FLAG] = true;

  schema.post('save', (doc) => {
    void (async () => {
      const url = await getDiscordWebhookUrl();
      if (!url) return;
      if (!/^https?:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(url)) return;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildDiscordPayload(doc as unknown as IAdminLog)),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          console.error('Discord webhook failed', res.status, res.statusText, body);
        }
      } catch (err) {
        console.error('Discord webhook error', err);
      }
    })();
  });
}

registerDiscordWebhookHook(AdminLogSchema);

const AdminLog = models.AdminLog || mongoose.model<IAdminLog>('AdminLog', AdminLogSchema);

registerDiscordWebhookHook((AdminLog as any).schema);

export default AdminLog;
