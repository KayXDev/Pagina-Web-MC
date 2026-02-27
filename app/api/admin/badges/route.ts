import { NextResponse } from 'next/server';
import { requireAdmin, requireOwner } from '@/lib/session';
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

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();

    const count = await Badge.countDocuments();
    if (count === 0) {
      await Badge.insertMany(
        [
          { slug: 'partner', labelEs: 'Partner', labelEn: 'Partner', icon: '/badges/partner.png', enabled: true },
          { slug: 'active_developer', labelEs: 'Desarrollador activo', labelEn: 'Active developer', icon: '/badges/active_developer.png', enabled: true },
          { slug: 'bug_hunter', labelEs: 'Cazador de bugs', labelEn: 'Bug hunter', icon: '/badges/bug_hunter.png', enabled: true },
          { slug: 'staff', labelEs: 'Staff', labelEn: 'Staff', icon: '/badges/staff.png', enabled: true },
        ],
        { ordered: false }
      ).catch(() => {
        // ignore duplicate insert races
      });
    }

    const items = await Badge.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(items);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al obtener badges' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner();
    const body = await request.json().catch(() => ({}));

    const slug = normalizeSlug(body?.slug);
    const labelEs = typeof body?.labelEs === 'string' ? body.labelEs.trim().slice(0, 60) : '';
    const labelEn = typeof body?.labelEn === 'string' ? body.labelEn.trim().slice(0, 60) : '';
    const icon = typeof body?.icon === 'string' ? body.icon.trim().slice(0, 300) : '';
    const enabled = typeof body?.enabled === 'boolean' ? body.enabled : true;

    if (!slug || slug.length < 2) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 });
    }
    if (!icon) {
      return NextResponse.json({ error: 'Icon requerido' }, { status: 400 });
    }

    await dbConnect();

    const exists = await Badge.findOne({ slug }).select('_id').lean();
    if (exists) {
      return NextResponse.json({ error: 'Ese slug ya existe' }, { status: 409 });
    }

    const created = await Badge.create({ slug, labelEs, labelEn, icon, enabled });

    await AdminLog.create({
      adminId: owner.id,
      adminUsername: owner.name,
      action: 'CREATE_BADGE',
      targetType: 'BADGE',
      targetId: created._id.toString(),
      details: JSON.stringify({ slug, labelEs, labelEn, icon, enabled }),
      meta: {
        path: '/api/admin/badges',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Owner access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al crear badge' }, { status: 500 });
  }
}
