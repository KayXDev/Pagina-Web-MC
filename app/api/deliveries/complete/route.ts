import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopDelivery from '@/models/ShopDelivery';
import ShopOrder from '@/models/ShopOrder';
import { requireDeliveryKey } from '@/lib/deliveries';

const schema = z.object({
  deliveryId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    if (!requireDeliveryKey(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();

    const delivery = await ShopDelivery.findById(parsed.data.deliveryId);
    if (!delivery) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    (delivery as any).status = 'COMPLETED';
    (delivery as any).completedAt = new Date();
    (delivery as any).lastError = '';
    await delivery.save();

    const orderId = String((delivery as any).orderId || '').trim();
    if (orderId) {
      await ShopOrder.updateOne(
        { _id: orderId, status: { $in: ['PAID', 'DELIVERED'] } },
        { $set: { status: 'DELIVERED' } }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Delivery complete error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
