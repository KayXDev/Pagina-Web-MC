import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireAdmin, requireOwner } from '@/lib/session';
import PartnerAd from '@/models/PartnerAd';
import PartnerBooking from '@/models/PartnerBooking';
import AdminLog from '@/models/AdminLog';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

const listSchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const parsed = listSchema.safeParse({
      status: searchParams.get('status') || undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    const query: any = {};
    if (parsed.data.status) query.status = parsed.data.status;

    const ads = await PartnerAd.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      items: (ads as any[]).map((a) => ({
        _id: String(a._id),
        userId: String(a.userId || ''),
        ownerUsername: String(a.ownerUsername || ''),
        serverName: String(a.serverName || ''),
        address: String(a.address || ''),
        version: String(a.version || ''),
        description: String(a.description || ''),
        website: String(a.website || ''),
        discord: String(a.discord || ''),
        banner: String(a.banner || ''),
        status: String(a.status || ''),
        rejectionReason: String(a.rejectionReason || ''),
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

const createSchema = z.object({
  ownerUsername: z.string().min(1).max(60),
  serverName: z.string().min(3).max(60),
  address: z.string().min(3).max(80),
  version: z.string().max(30).optional().or(z.literal('')),
  description: z.string().min(20).max(500),
  website: z.string().max(200).optional().or(z.literal('')),
  discord: z.string().max(200).optional().or(z.literal('')),
  banner: z.string().max(500).optional().or(z.literal('')),
});

export async function POST(request: Request) {
  try {
    const owner = await requireOwner();
    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    const userId = `SYSTEM:${crypto.randomUUID()}`;

    const created = await PartnerAd.create({
      userId,
      ownerUsername: String(parsed.data.ownerUsername || '').trim(),
      serverName: String(parsed.data.serverName || '').trim(),
      address: String(parsed.data.address || '').trim(),
      version: String(parsed.data.version || '').trim(),
      description: String(parsed.data.description || '').trim(),
      website: String(parsed.data.website || '').trim(),
      discord: String(parsed.data.discord || '').trim(),
      banner: String(parsed.data.banner || '').trim(),
      status: 'APPROVED',
      rejectionReason: '',
    });

    await AdminLog.create({
      adminId: owner.id,
      adminUsername: owner.name,
      action: 'CREATE_PARTNER_AD_SYSTEM',
      targetType: 'PARTNER_AD',
      targetId: String(created._id),
      details: JSON.stringify({ userId }),
      meta: {
        serverName: String(created.serverName || ''),
        ownerUsername: String(created.ownerUsername || ''),
        path: '/api/admin/partner/ads',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ ok: true, adId: String(created._id) });
  } catch (error: any) {
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

const patchSchema = z.object({
  adId: z.string().min(1),
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(300).optional().or(z.literal('')),
});

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    if (parsed.data.action === 'REJECT') {
      const reason = String(parsed.data.reason || '').trim();
      if (!reason) return NextResponse.json({ error: 'Motivo requerido' }, { status: 400 });
    }

    await dbConnect();

    const ad = await PartnerAd.findById(parsed.data.adId).lean();
    if (!ad) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    if (parsed.data.action === 'APPROVE') {
      await PartnerAd.updateOne(
        { _id: parsed.data.adId },
        { $set: { status: 'APPROVED', rejectionReason: '' } }
      );

      // If the user already paid, activate the latest paid booking now.
      const booking = await PartnerBooking.findOne({
        adId: String((ad as any)._id),
        status: 'PENDING',
        paidAt: { $exists: true },
        $or: [{ startsAt: { $exists: false } }, { startsAt: null }],
      })
        .sort({ createdAt: -1 })
        .lean();

      if (booking) {
        const now = new Date();
        const endsAt = new Date(now.getTime() + Number((booking as any).days || 1) * 24 * 60 * 60 * 1000);
        await PartnerBooking.updateOne(
          { _id: (booking as any)._id },
          { $set: { status: 'ACTIVE', startsAt: now, endsAt } }
        );
      }
    } else {
      const reason = String(parsed.data.reason || '').trim();
      await PartnerAd.updateOne(
        { _id: parsed.data.adId },
        { $set: { status: 'REJECTED', rejectionReason: reason } }
      );

      // If an ad is rejected later, free the slot(s)
      await PartnerBooking.updateMany(
        { adId: String((ad as any)._id), status: { $in: ['PENDING', 'ACTIVE'] } },
        { $set: { status: 'CANCELED', slotActiveKey: '' } }
      );
    }

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: parsed.data.action === 'APPROVE' ? 'APPROVE_PARTNER_AD' : 'REJECT_PARTNER_AD',
      targetType: 'PARTNER_AD',
      targetId: parsed.data.adId,
      details: parsed.data.action === 'REJECT' ? String(parsed.data.reason || '') : undefined,
      meta: {
        serverName: String((ad as any).serverName || ''),
        ownerUsername: String((ad as any).ownerUsername || ''),
        path: '/api/admin/partner/ads',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
