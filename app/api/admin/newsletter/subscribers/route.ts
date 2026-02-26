import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import AdminLog from '@/models/AdminLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    await dbConnect();

    const url = new URL(request.url);
    const status = String(url.searchParams.get('status') || 'active').trim();
    const q = String(url.searchParams.get('q') || '').trim();
    const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
    const limitRaw = Number(url.searchParams.get('limit') || '25') || 25;
    const limit = Math.min(100, Math.max(5, limitRaw));

    const filter: any = {};
    if (status === 'active') filter.unsubscribedAt = null;
    if (status === 'unsubscribed') filter.unsubscribedAt = { $ne: null };
    if (q) filter.email = { $regex: escapeRegex(q), $options: 'i' };

    const [items, total] = await Promise.all([
      NewsletterSubscriber.find(filter)
        .sort({ subscribedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('email subscribedAt unsubscribedAt source createdAt')
        .lean(),
      NewsletterSubscriber.countDocuments(filter),
    ]);

    const [totalAll, totalActive, totalUnsubscribed] = await Promise.all([
      NewsletterSubscriber.countDocuments({}),
      NewsletterSubscriber.countDocuments({ unsubscribedAt: null }),
      NewsletterSubscriber.countDocuments({ unsubscribedAt: { $ne: null } }),
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      totals: { all: totalAll, active: totalActive, unsubscribed: totalUnsubscribed },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('Admin newsletter subscribers GET error:', error);
    return NextResponse.json({ error: 'Error al obtener suscriptores' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    const action = String(body?.action || '').trim();

    if (!id || !action) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const sub: any = await NewsletterSubscriber.findById(id).select('email unsubscribedAt').lean();
    if (!sub) {
      return NextResponse.json({ error: 'Suscriptor no encontrado' }, { status: 404 });
    }

    if (action === 'unsubscribe') {
      await NewsletterSubscriber.updateOne({ _id: id }, { $set: { unsubscribedAt: new Date() } });
    } else if (action === 'resubscribe') {
      await NewsletterSubscriber.updateOne({ _id: id }, { $set: { unsubscribedAt: null } });
    } else if (action === 'delete') {
      await NewsletterSubscriber.deleteOne({ _id: id });
    } else {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'NEWSLETTER_SUBSCRIBER_UPDATE',
      targetType: 'NEWSLETTER',
      targetId: id,
      meta: {
        action,
        email: sub.email,
        path: '/api/admin/newsletter/subscribers',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('Admin newsletter subscribers PATCH error:', error);
    return NextResponse.json({ error: 'Error actualizando suscriptor' }, { status: 500 });
  }
}
