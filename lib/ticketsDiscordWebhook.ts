type TicketPriority = 'HIGH' | 'MEDIUM' | 'LOW' | string;

type TicketDiscordWebhookInput = {
  webhookUrl: string;
  siteName: string;
  siteUrl?: string;
  ticketId: string;
  username: string;
  userEmail: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  message: string;
  createdAt: string;
  isTest?: boolean;
};

function normalizePriority(priority: TicketPriority) {
  const p = String(priority || 'MEDIUM').toUpperCase();
  if (p === 'HIGH' || p === 'LOW' || p === 'MEDIUM') return p;
  return 'MEDIUM';
}

function priorityColor(priority: TicketPriority) {
  const p = normalizePriority(priority);
  if (p === 'HIGH') return 0xef4444; // red
  if (p === 'LOW') return 0x22c55e; // green
  return 0xf59e0b; // amber for MEDIUM/default
}

function priorityBadge(priority: TicketPriority) {
  const p = normalizePriority(priority);
  if (p === 'HIGH') return 'HIGH - Urgent';
  if (p === 'LOW') return 'LOW - Normal';
  return 'MEDIUM - Important';
}

export async function sendTicketDiscordWebhook(input: TicketDiscordWebhookInput) {
  const trimmedWebhook = String(input.webhookUrl || '').trim();
  if (!trimmedWebhook) throw new Error('Ticket webhook not configured');

  const normalizedSiteUrl = String(input.siteUrl || '').trim();
  const adminTicketsUrl = normalizedSiteUrl
    ? `${normalizedSiteUrl.replace(/\/$/, '')}/admin/tickets`
    : undefined;

  const subject = String(input.subject || '-').slice(0, 180);
  const categoryLabel = String(input.category || 'OTHER').replace(/_/g, ' ');
  const priorityLabel = priorityBadge(input.priority);
  const messagePreview = String(input.message || '-')
    .replace(/\r/g, '')
    .slice(0, 900)
    .trim();
  const quotedPreview = messagePreview ? `> ${messagePreview.replace(/\n/g, '\n> ')}` : '> -';

  const createdAtMs = new Date(input.createdAt).getTime();
  const createdAtTimestamp = Number.isFinite(createdAtMs)
    ? Math.floor(createdAtMs / 1000)
    : Math.floor(Date.now() / 1000);

  const isTest = Boolean(input.isTest);
  const response = await fetch(trimmedWebhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: `${input.siteName} Tickets`,
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: isTest ? 'Ticket Webhook Test' : 'New Support Ticket Received',
          url: adminTicketsUrl,
          color: priorityColor(input.priority),
          description: [
            isTest ? '**This is a test notification from the admin panel.**' : '**A new support ticket has been submitted.**',
            '',
            `> **Subject:** ${subject}`,
            `> **Category:** ${categoryLabel}`,
            `> **Priority:** ${priorityLabel}`,
            '',
            '**Message Preview**',
            quotedPreview,
          ]
            .join('\n')
            .slice(0, 4096),
          timestamp: new Date().toISOString(),
          footer: {
            text: `${input.siteName} | Support System`,
          },
          fields: [
            {
              name: 'Reporter',
              value: `**${String(input.username || '-').slice(0, 120)}**`,
              inline: true,
            },
            {
              name: 'Contact',
              value: `\`${String(input.userEmail || '-').slice(0, 200)}\``,
              inline: true,
            },
            {
              name: 'Ticket ID',
              value: `\`${String(input.ticketId || '-').slice(0, 120)}\``,
              inline: true,
            },
            {
              name: 'Submitted At',
              value: `<t:${createdAtTimestamp}:F>`,
              inline: true,
            },
            {
              name: 'Quick Action',
              value: adminTicketsUrl ? `[Open Admin Tickets](${adminTicketsUrl})` : 'Admin panel URL is not configured.',
              inline: false,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ticket Discord webhook (${response.status}): ${body || response.statusText}`);
  }
}
