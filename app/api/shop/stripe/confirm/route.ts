import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import { getCurrentUser } from '@/lib/session';
import { getStripe } from '@/lib/stripe';
import { ensureDeliveryForOrder } from '@/lib/deliveries';

const schema = z.object({
  sessionId: z.string().min(1),
  orderId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();

    const order = parsed.data.orderId
      ? await ShopOrder.findById(parsed.data.orderId)
      : await ShopOrder.findOne({ stripeCheckoutSessionId: parsed.data.sessionId });

    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    if (String((order as any).provider) !== 'STRIPE') {
      return NextResponse.json({ error: 'Proveedor inválido' }, { status: 400 });
    }

    if (String((order as any).status) === 'PAID') {
      return NextResponse.json({ ok: true, status: 'PAID', orderId: String(order._id) });
    }

    const storedSessionId = String((order as any).stripeCheckoutSessionId || '').trim();
    if (!storedSessionId || storedSessionId !== parsed.data.sessionId) {
      return NextResponse.json({ error: 'Sesión de Stripe inválida' }, { status: 400 });
    }

    const user = await getCurrentUser().catch(() => null);
    const orderUserId = String((order as any).userId || '');
    if (orderUserId && user?.id && String(user.id) !== orderUserId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId, { expand: ['payment_intent'] });

    const paymentStatus = String((session as any).payment_status || '').toLowerCase();
    const sessionStatus = String((session as any).status || '');

    const paymentIntentId =
      typeof (session as any).payment_intent === 'string'
        ? String((session as any).payment_intent)
        : String((session as any).payment_intent?.id || '');

    if (paymentStatus !== 'paid') {
      await ShopOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            stripeStatus: sessionStatus,
            stripePaymentStatus: paymentStatus,
            stripePaymentIntentId: paymentIntentId,
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
          stripeStatus: sessionStatus,
          stripePaymentStatus: paymentStatus,
          stripePaymentIntentId: paymentIntentId,
        },
      }
    );

    // Create (idempotent) delivery job for in-game commands.
    await ensureDeliveryForOrder(String(order._id));

    return NextResponse.json({ ok: true, status: 'PAID', orderId: String(order._id) });
  } catch (error: any) {
    console.error('Stripe confirm error:', error);
    return NextResponse.json({ error: error?.message || 'Error al confirmar pago' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
