import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import PartnerBooking from '@/models/PartnerBooking';
import PartnerAd from '@/models/PartnerAd';
import { paypalCaptureOrder } from '@/lib/paypal';

const schema = z.object({
  bookingId: z.string().min(1),
  paypalOrderId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    const booking = await PartnerBooking.findById(parsed.data.bookingId);
    if (!booking) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    if (String((booking as any).userId) !== String(user.id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (String((booking as any).provider) !== 'PAYPAL') {
      return NextResponse.json({ error: 'Proveedor inválido' }, { status: 400 });
    }

    if (String((booking as any).status) === 'ACTIVE') {
      return NextResponse.json({ ok: true, status: 'ACTIVE', endsAt: (booking as any).endsAt || null });
    }

    const storedOrderId = String((booking as any).paypalOrderId || '').trim();
    if (!storedOrderId || storedOrderId !== parsed.data.paypalOrderId) {
      return NextResponse.json({ error: 'Orden inválida' }, { status: 400 });
    }

    const ad = await PartnerAd.findById(booking.adId).lean();
    if (!ad) return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });

    const captured = await paypalCaptureOrder(parsed.data.paypalOrderId);

    const now = new Date();

    const isApproved = String((ad as any).status || '') === 'APPROVED';
    if (isApproved) {
      const endsAt = new Date(now.getTime() + Number((booking as any).days || 1) * 24 * 60 * 60 * 1000);

      await PartnerBooking.updateOne(
        { _id: booking._id },
        {
          $set: {
            status: 'ACTIVE',
            paidAt: now,
            startsAt: now,
            endsAt,
            paypalStatus: captured.status,
            paypalCaptureId: captured.captureId,
            paypalPayerId: captured.payerId,
            paypalPayerEmail: captured.payerEmail,
          },
        }
      );

      return NextResponse.json({ ok: true, status: 'ACTIVE', endsAt });
    }

    await PartnerBooking.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: 'PENDING',
          paidAt: now,
          paypalStatus: captured.status,
          paypalCaptureId: captured.captureId,
          paypalPayerId: captured.payerId,
          paypalPayerEmail: captured.payerEmail,
        },
        $unset: { startsAt: 1, endsAt: 1 },
      }
    );

    return NextResponse.json({ ok: true, status: 'PENDING_REVIEW' });
  } catch (error: any) {
    console.error('Partner paypal capture error:', error);
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
