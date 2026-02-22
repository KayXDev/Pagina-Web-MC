import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';

const schema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();

    const order = await ShopOrder.findById(parsed.data.orderId);
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    if (String((order as any).provider) !== 'STRIPE') {
      return NextResponse.json({ error: 'Proveedor inválido' }, { status: 400 });
    }

    const current = String((order as any).status || '');
    if (current !== 'PAID') {
      await ShopOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            status: 'CANCELED',
            stripeStatus: 'CANCELED',
          },
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Stripe cancel error:', error);
    return NextResponse.json({ error: error?.message || 'Error al cancelar pedido' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
