import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopDelivery from '@/models/ShopDelivery';
import { getMaxDeliveryAttempts, requireDeliveryKey } from '@/lib/deliveries';

const schema = z.object({
  deliveryId: z.string().min(1),
  error: z.string().optional(),
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

    const maxAttempts = getMaxDeliveryAttempts();
    const delivery = await ShopDelivery.findById(parsed.data.deliveryId);
    if (!delivery) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const attempts = Number((delivery as any).attempts || 0);
    const nextStatus = attempts >= maxAttempts ? 'FAILED' : 'PENDING';

    (delivery as any).status = nextStatus;
    (delivery as any).lastError = String(parsed.data.error || '').slice(0, 500);
    (delivery as any).lockedAt = undefined;
    (delivery as any).lockedBy = '';
    await delivery.save();

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (err: any) {
    console.error('Delivery fail error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
