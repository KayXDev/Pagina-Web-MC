import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';
import { isEmailConfigured } from '@/lib/email';
import { sendWeeklyNewsletter } from '@/lib/newsletterWeekly';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

function baseUrlFromEnv() {
  const base = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();
  return base ? base.replace(/\/$/, '') : '';
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    await dbConnect();

    const baseUrl = baseUrlFromEnv();
    if (!baseUrl) {
      return NextResponse.json({ error: 'SITE_URL / NEXTAUTH_URL no configurado' }, { status: 400 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({ error: 'SMTP no configurado' }, { status: 400 });
    }

    const result = await sendWeeklyNewsletter();

    await Settings.findOneAndUpdate(
      { key: 'newsletter_last_sent_at' },
      { key: 'newsletter_last_sent_at', value: result.nowIso, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'MANUAL_NEWSLETTER_WEEKLY',
      targetType: 'EMAIL',
      targetId: 'newsletter',
      meta: {
        sent: result.sent,
        subscribers: result.subscribers,
        path: '/api/admin/newsletter/send',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('Admin newsletter send error:', error);
    return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 });
  }
}
