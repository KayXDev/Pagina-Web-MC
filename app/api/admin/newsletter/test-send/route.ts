import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import AdminLog from '@/models/AdminLog';
import { isEmailConfigured } from '@/lib/email';
import { sendWeeklyNewsletterTest } from '@/lib/newsletterWeekly';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner();
    await dbConnect();

    if (!isEmailConfigured()) {
      return NextResponse.json({ error: 'SMTP no configurado' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const to = String((body as any)?.to || process.env.ADMIN_EMAIL || '').trim().toLowerCase();

    if (!to || !isValidEmail(to)) {
      return NextResponse.json({ error: 'Email destino inválido' }, { status: 400 });
    }

    const result = await sendWeeklyNewsletterTest(to);

    await AdminLog.create({
      adminId: owner.id,
      adminUsername: owner.name,
      action: 'MANUAL_NEWSLETTER_WEEKLY_TEST',
      targetType: 'EMAIL',
      targetId: to,
      meta: {
        sent: result.sent,
        to,
        path: '/api/admin/newsletter/test-send',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Owner access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Admin newsletter test-send error:', error);
    return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 });
  }
}
