import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import { getStripe } from '@/lib/stripe';
import { ensureDeliveryForOrder } from '@/lib/deliveries';

export async function POST(request: Request) {
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook no configurado' }, { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Falta stripe-signature' }, { status: 400 });
  }

  const stripe = getStripe();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature error:', err);
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;

      await dbConnect();

      const orderId = String(session.metadata?.orderId || session.client_reference_id || '').trim();
      const paymentStatus = String((session as any).payment_status || '').toLowerCase();
      const sessionStatus = String((session as any).status || '');

      const paymentIntentId =
        typeof (session as any).payment_intent === 'string'
          ? String((session as any).payment_intent)
          : String((session as any).payment_intent?.id || '');

      const order = orderId
        ? await ShopOrder.findById(orderId)
        : await ShopOrder.findOne({ stripeCheckoutSessionId: String(session.id || '') });

      if (!order) {
        return NextResponse.json({ received: true });
      }

      if (String((order as any).provider) !== 'STRIPE') {
        return NextResponse.json({ received: true });
      }

      const update: any = {
        stripeCheckoutSessionId: String(session.id || ''),
        stripeStatus: sessionStatus,
        stripePaymentStatus: paymentStatus,
        stripePaymentIntentId: paymentIntentId,
      };

      if (paymentStatus === 'paid') {
        update.status = 'PAID';
        update.paidAt = new Date();
      }

      await ShopOrder.updateOne({ _id: order._id }, { $set: update });

      if (paymentStatus === 'paid') {
        // Create (idempotent) delivery job for in-game commands.
        await ensureDeliveryForOrder(String(order._id));
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
