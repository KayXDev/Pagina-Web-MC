import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import { getCurrentUser } from '@/lib/session';

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
    if (!order) return NextResponse.json({ ok: true });

    if (String((order as any).provider) !== 'PAYPAL') {
      return NextResponse.json({ ok: true });
    }

    const user = await getCurrentUser().catch(() => null);
    const orderUserId = String((order as any).userId || '');
    if (orderUserId && user?.id && String(user.id) !== orderUserId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (String((order as any).status) !== 'PAID') {
      await ShopOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            status: 'CANCELED',
            paypalStatus: 'CANCELED',
          },
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('PayPal cancel error:', error);
    return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
