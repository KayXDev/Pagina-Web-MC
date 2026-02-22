import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireAdmin } from '@/lib/session';
import ShopOrder from '@/models/ShopOrder';
import { ensureDeliveryForOrder } from '@/lib/deliveries';

const schema = z.object({
  orderId: z.string().min(1),
});

function allowTestBypass(request: Request): boolean {
  const requiredKey = String(process.env.SHOP_TEST_BYPASS_KEY || '').trim();
  if (!requiredKey) {
    // Default: only allow in non-production environments.
    return process.env.NODE_ENV !== 'production';
  }

  const provided = String(request.headers.get('x-shop-test-key') || '').trim();
  return Boolean(provided) && provided === requiredKey;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    if (!allowTestBypass(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();

    const order = await ShopOrder.findById(parsed.data.orderId);
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const status = String((order as any).status || '');
    if (status === 'DELIVERED') {
      return NextResponse.json({ ok: true, status: 'DELIVERED', orderId: String(order._id) });
    }

    if (status !== 'PAID') {
      await ShopOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            status: 'PAID',
            paidAt: new Date(),
            provider: String((order as any).provider || 'MANUAL') as any,
          },
        }
      );
    }

    const res = await ensureDeliveryForOrder(String(order._id));

    return NextResponse.json({
      ok: true,
      status: 'PAID',
      orderId: String(order._id),
      deliveryCreated: res.created,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Admin mark paid error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
