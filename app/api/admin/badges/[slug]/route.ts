import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import AdminLog from '@/models/AdminLog';
import Badge from '@/models/Badge';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

function normalizeSlug(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40);
}

export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  try {
    const owner = await requireOwner();
    const slug = normalizeSlug(params?.slug);
    const body = await request.json().catch(() => ({}));

    await dbConnect();

    const updates: Record<string, any> = {};
    if (typeof body?.labelEs === 'string') updates.labelEs = body.labelEs.trim().slice(0, 60);
    if (typeof body?.labelEn === 'string') updates.labelEn = body.labelEn.trim().slice(0, 60);
    if (typeof body?.icon === 'string') updates.icon = body.icon.trim().slice(0, 300);
    if (typeof body?.enabled === 'boolean') updates.enabled = body.enabled;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
    }

    const updated = await Badge.findOneAndUpdate({ slug }, updates, { returnDocument: 'after' });
    if (!updated) {
      return NextResponse.json({ error: 'Badge no encontrado' }, { status: 404 });
    }

    await AdminLog.create({
      adminId: owner.id,
      adminUsername: owner.name,
      action: 'UPDATE_BADGE',
      targetType: 'BADGE',
      targetId: updated._id.toString(),
      details: JSON.stringify({ slug, updates }),
      meta: {
        path: `/api/admin/badges/${slug}`,
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Owner access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al actualizar badge' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { slug: string } }) {
  try {
    const owner = await requireOwner();
    const slug = normalizeSlug(params?.slug);

    await dbConnect();

    const deleted = await Badge.findOneAndDelete({ slug });
    if (!deleted) {
      return NextResponse.json({ error: 'Badge no encontrado' }, { status: 404 });
    }

    await AdminLog.create({
      adminId: owner.id,
      adminUsername: owner.name,
      action: 'DELETE_BADGE',
      targetType: 'BADGE',
      targetId: deleted._id.toString(),
      details: JSON.stringify({ slug }),
      meta: {
        path: `/api/admin/badges/${slug}`,
        method: 'DELETE',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Owner access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al eliminar badge' }, { status: 500 });
  }
}
