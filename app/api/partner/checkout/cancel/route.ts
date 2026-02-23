import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import PartnerBooking from '@/models/PartnerBooking';

const schema = z.object({
  bookingId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();
    const booking = await PartnerBooking.findById(parsed.data.bookingId).select('userId status').lean();
    if (!booking) return NextResponse.json({ ok: true });

    if (String((booking as any).userId) !== String(user.id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (String((booking as any).status) === 'PENDING') {
      await PartnerBooking.updateOne(
        { _id: parsed.data.bookingId, status: 'PENDING' },
        { $set: { status: 'CANCELED', slotActiveKey: '' } }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Partner cancel error:', error);
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
