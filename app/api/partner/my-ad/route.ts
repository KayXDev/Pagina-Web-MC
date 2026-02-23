import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import PartnerAd from '@/models/PartnerAd';
import PartnerBooking from '@/models/PartnerBooking';
import { requireAuth } from '@/lib/session';

const schema = z.object({
  serverName: z.string().min(3).max(60),
  address: z.string().min(3).max(80),
  version: z.string().max(30).optional().or(z.literal('')),
  description: z.string().min(20).max(500),
  website: z.string().max(200).optional().or(z.literal('')),
  discord: z.string().max(200).optional().or(z.literal('')),
  banner: z.string().max(500).optional().or(z.literal('')),
});

export async function GET() {
  try {
    const user = await requireAuth();
    await dbConnect();

    const now = new Date();
    await PartnerBooking.updateMany(
      { userId: user.id, status: 'ACTIVE', endsAt: { $lt: now } },
      { $set: { status: 'EXPIRED', slotActiveKey: '' } }
    );

    const ad = await PartnerAd.findOne({ userId: user.id }).lean();
    const bookings = ad
      ? await PartnerBooking.find({ adId: String((ad as any)._id) })
          .select('slot kind days status startsAt endsAt provider totalPrice currency createdAt')
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
      : [];

    return NextResponse.json({ ad: ad || null, bookings });
  } catch (error: any) {
    const message = String(error?.message || 'Unauthorized');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();

    const existing = await PartnerAd.findOne({ userId: user.id }).select('_id').lean();
    if (existing) {
      return NextResponse.json({ error: 'Ya tienes un anuncio creado' }, { status: 400 });
    }

    const created = await PartnerAd.create({
      userId: user.id,
      ownerUsername: String((user as any).name || user.email || ''),
      ...parsed.data,
      status: 'PENDING_REVIEW',
      rejectionReason: '',
    });

    return NextResponse.json({ ok: true, adId: String(created._id) });
  } catch (error: any) {
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();

    const ad = await PartnerAd.findOne({ userId: user.id }).select('_id status').lean();
    if (!ad) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    // If user edits, it goes back to pending review.
    await PartnerAd.updateOne(
      { _id: (ad as any)._id, userId: user.id },
      { $set: { ...parsed.data, status: 'PENDING_REVIEW', rejectionReason: '' } }
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
