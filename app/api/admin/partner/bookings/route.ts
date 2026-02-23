import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireAdmin } from '@/lib/session';
import PartnerBooking from '@/models/PartnerBooking';
import PartnerAd from '@/models/PartnerAd';

export const dynamic = 'force-dynamic';

const listSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELED']).optional(),
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
    if (parsed.data.status) {
      query.status = parsed.data.status;
    } else {
      query.status = { $in: ['PENDING', 'ACTIVE'] };
    }

    const now = new Date();
    await PartnerBooking.updateMany(
      { status: 'ACTIVE', endsAt: { $lt: now } },
      { $set: { status: 'EXPIRED', slotActiveKey: '' } }
    );

    const bookings = await PartnerBooking.find(query)
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    const adIds = Array.from(new Set((bookings as any[]).map((b) => String(b.adId || '')).filter(Boolean)));
    const ads = await PartnerAd.find({ _id: { $in: adIds } })
      .select('serverName ownerUsername status')
      .lean();

    const adById = new Map<string, any>((ads as any[]).map((a) => [String(a._id), a]));

    return NextResponse.json({
      items: (bookings as any[]).map((b) => {
        const ad = adById.get(String(b.adId));
        return {
          _id: String(b._id),
          adId: String(b.adId || ''),
          userId: String(b.userId || ''),
          slot: Number(b.slot || 0),
          kind: String(b.kind || ''),
          days: Number(b.days || 0),
          currency: String(b.currency || 'EUR'),
          totalPrice: Number(b.totalPrice || 0),
          provider: String(b.provider || ''),
          status: String(b.status || ''),
          paidAt: b.paidAt || null,
          startsAt: b.startsAt || null,
          endsAt: b.endsAt || null,
          createdAt: b.createdAt,
          ad: ad
            ? {
                serverName: String(ad.serverName || ''),
                ownerUsername: String(ad.ownerUsername || ''),
                status: String(ad.status || ''),
              }
            : null,
        };
      }),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
