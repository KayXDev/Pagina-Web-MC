import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';
import { sendTicketDiscordWebhook } from '@/lib/ticketsDiscordWebhook';

const TICKETS_DISCORD_WEBHOOK_KEY = 'tickets_discord_webhook';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));

    await dbConnect();

    const webhookSetting = await Settings.findOne({ key: TICKETS_DISCORD_WEBHOOK_KEY }).lean();
    const webhookUrl = String(webhookSetting?.value || '').trim();
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Ticket Discord webhook is not configured' }, { status: 400 });
    }

    const requestedPriority = String((body as any)?.priority || 'MEDIUM').toUpperCase();
    const priority = requestedPriority === 'HIGH' || requestedPriority === 'LOW' ? requestedPriority : 'MEDIUM';

    const siteName = String(process.env.SITE_NAME || '999Wrld Network').trim();
    const siteUrl = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();

    await sendTicketDiscordWebhook({
      webhookUrl,
      siteName,
      siteUrl,
      ticketId: `test-${Date.now()}`,
      username: admin.name,
      userEmail: admin.email || 'admin@example.com',
      subject: '[TEST] Ticket webhook preview',
      category: 'TECHNICAL',
      priority,
      message:
        'This is a test ticket sent from the admin panel.\nUse this message to verify markdown, quotes, links, and priority colors.',
      createdAt: new Date().toISOString(),
      isTest: true,
    });

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'SEND_TICKETS_WEBHOOK_TEST',
      targetType: 'DISCORD',
      targetId: TICKETS_DISCORD_WEBHOOK_KEY,
      meta: {
        priority,
        path: '/api/admin/tickets/webhook-test',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true, priority });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Ticket webhook test error:', error);
    return NextResponse.json({ error: error?.message || 'Error sending test webhook' }, { status: 500 });
  }
}
