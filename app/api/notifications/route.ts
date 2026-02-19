import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { requireAuth } from '@/lib/session';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

async function resolveUserIdFromSessionUser(user: any) {
  const direct = typeof user?.id === 'string' && user.id ? user.id : undefined;
  if (direct) return direct;

  const alt = typeof user?._id === 'string' && user._id ? user._id : undefined;
  if (alt) return alt;

  const email = typeof user?.email === 'string' ? user.email.toLowerCase() : '';
  if (!email) throw new Error('Unauthorized');

  await dbConnect();
  const found = await User.findOne({ email }, { _id: 1 }).lean();
  const id = found?._id ? String((found as any)._id) : '';
  if (!id) throw new Error('Unauthorized');
  return id;
}

export async function GET() {
  try {
    const user = await requireAuth();
    await dbConnect();

    const userId = await resolveUserIdFromSessionUser(user);

    // User asked: once read, notifications should disappear.
    // Clean up any legacy read notifications.
    await Notification.deleteMany({ userId, readAt: { $exists: true } });

    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId, readAt: { $exists: false } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Notification.countDocuments({ userId, readAt: { $exists: false } }),
    ]);

    return NextResponse.json({ items, unreadCount });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    await dbConnect();

    const userId = await resolveUserIdFromSessionUser(user);

    const all = Boolean((body as any).all);
    const ids = Array.isArray((body as any).ids) ? ((body as any).ids as string[]) : [];

    const now = new Date();

    if (all) {
      // Delete everything (read = removed)
      await Notification.deleteMany({ userId });
      return NextResponse.json({ ok: true, deleted: true, at: now.toISOString() });
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids requerido' }, { status: 400 });
    }

    await Notification.deleteMany({ _id: { $in: ids }, userId });

    return NextResponse.json({ ok: true, deleted: true, at: now.toISOString() });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Error al actualizar notificaciones' }, { status: 500 });
  }
}
