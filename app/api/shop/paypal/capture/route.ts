import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import { paypalCaptureOrder } from '@/lib/paypal';
import { getCurrentUser } from '@/lib/session';

const schema = z.object({
  orderId: z.string().min(1),
  paypalOrderId: z.string().min(1),
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

    if (String((order as any).provider) !== 'PAYPAL') {
      return NextResponse.json({ error: 'Proveedor inválido' }, { status: 400 });
    }

    if (String((order as any).status) === 'PAID') {
      return NextResponse.json({ ok: true, status: 'PAID', orderId: String(order._id) });
    }

    const storedPaypalOrderId = String((order as any).paypalOrderId || '').trim();
    if (!storedPaypalOrderId || storedPaypalOrderId !== parsed.data.paypalOrderId) {
      return NextResponse.json({ error: 'Token de PayPal inválido' }, { status: 400 });
    }

    const user = await getCurrentUser().catch(() => null);
    const orderUserId = String((order as any).userId || '');
    if (orderUserId && user?.id && String(user.id) !== orderUserId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const captured = await paypalCaptureOrder(parsed.data.paypalOrderId);

    const captureId = String(captured.captureId || '').trim();
    const payerId = String(captured.payerId || '').trim();
    const payerEmail = String(captured.payerEmail || '').trim();

    const status = String(captured.status || '').toUpperCase();
    if (status !== 'COMPLETED') {
      await ShopOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            paypalStatus: status,
          },
        }
      );
      return NextResponse.json({ error: 'Pago no completado' }, { status: 400 });
    }

    await ShopOrder.updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'PAID',
          paidAt: new Date(),
          paypalStatus: status,
          paypalCaptureId: captureId,
          paypalPayerId: payerId,
          paypalPayerEmail: payerEmail,
        },
      }
    );

    return NextResponse.json({ ok: true, status: 'PAID', orderId: String(order._id) });
  } catch (error: any) {
    console.error('PayPal capture error:', error);
    return NextResponse.json({ error: error?.message || 'Error al confirmar pago' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
