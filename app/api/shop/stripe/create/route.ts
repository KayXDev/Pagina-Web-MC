import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import { getCurrentUser } from '@/lib/session';
import { getStripe, toStripeAmount } from '@/lib/stripe';
import { ensureDeliveryForOrder } from '@/lib/deliveries';
import { ensureStockDeductedForOrder } from '@/lib/stock';
import { buildPricingFromItems } from '@/lib/shopPricing';
import { resolveCheckoutTarget } from '@/lib/shopCheckout';
import { runOrderPostPaymentEffects } from '@/lib/shopPostPayment';

const schema = z.object({
  minecraftUsername: z.string().default(''),
  productId: z.string().min(1).optional(),
  couponCode: z.string().max(40).optional(),
  loyaltyPointsToRedeem: z.number().int().min(0).optional(),
  useBalance: z.boolean().optional(),
  gift: z
    .object({
      recipientUsername: z.string().max(40).optional(),
      message: z.string().max(240).optional(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .optional(),
});

function getSiteUrl(request: Request): string {
  const fromEnv = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const rawItems =
      parsed.data.items && parsed.data.items.length
        ? parsed.data.items
        : parsed.data.productId
          ? [{ productId: parsed.data.productId, quantity: 1 }]
          : [];

    if (!rawItems.length) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();

    const user = await getCurrentUser().catch(() => null);
    let target;
    try {
      target = await resolveCheckoutTarget({
        minecraftUsername: parsed.data.minecraftUsername,
        gift: parsed.data.gift,
        buyer: user,
      });
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'Datos inválidos' }, { status: 400 });
    }

    let pricing;
    try {
      pricing = await buildPricingFromItems({
        rawItems,
        couponCode: parsed.data.couponCode,
        buyerUserId: user?.id || '',
        loyaltyPointsToRedeem: parsed.data.loyaltyPointsToRedeem || 0,
        useBalance: parsed.data.useBalance ?? false,
      });
    } catch (err: any) {
      const msg = String(err?.message || 'Error');
      if (msg === 'Producto no encontrado') return NextResponse.json({ error: msg }, { status: 404 });
      if (msg === 'Sin stock suficiente') {
        const meta = (err as any)?.meta || {};
        return NextResponse.json({ error: msg, ...meta }, { status: 409 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const orderItems = pricing.orderItems;
    const totalPrice = pricing.totalPrice;
    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      return NextResponse.json({ error: 'Total inválido' }, { status: 400 });
    }

    // Stripe has minimum charge amounts (e.g. ~0.50 EUR). If the order is truly free,
    // we bypass Stripe and enqueue delivery immediately.
    if (totalPrice === 0) {
      const first = orderItems[0];

      const headers = new Headers(request.headers);
      const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '';
      const userAgent = headers.get('user-agent') || '';

      const order = await ShopOrder.create({
        userId: user?.id || '',
        minecraftUsername: target.minecraftUsername,
        minecraftUuid: target.minecraftUuid,
        isGift: target.gift.isGift,
        giftRecipientUserId: target.gift.giftRecipientUserId,
        giftRecipientUsername: target.gift.giftRecipientUsername,
        giftRecipientMinecraftUsername: target.gift.giftRecipientMinecraftUsername,
        giftMessage: target.gift.giftMessage,
        productId: first?.productId || '',
        productName: first?.productName || '',
        productPrice: first?.unitPrice || 0,
        items: orderItems,
        subtotalPrice: pricing.subtotal,
        totalPrice,
        couponCode: pricing.coupon?.code || '',
        couponType: pricing.coupon?.type || '',
        couponValue: pricing.coupon?.value || 0,
        couponDiscountAmount: pricing.coupon?.discountAmount || 0,
        referralCode: pricing.referral?.code || '',
        referralReferrerUserId: pricing.referral?.referrerUserId || '',
        referralDiscountPercent: pricing.referral?.discountPercent || 0,
        referralDiscountAmount: pricing.referral?.discountAmount || 0,
        referralRewardAmount: pricing.referral?.rewardAmount || 0,
        loyaltyPointsUsed: pricing.loyalty?.pointsUsed || 0,
        loyaltyDiscountAmount: pricing.loyalty?.discountAmount || 0,
        balanceUsedAmount: pricing.storeBalance?.appliedBalance || 0,
        currency: String(process.env.SHOP_CURRENCY || 'EUR').toUpperCase(),
        status: 'PAID',
        provider: 'MANUAL',
        paidAt: new Date(),
        ip,
        userAgent,
      });

      const stockRes = await ensureStockDeductedForOrder(String(order._id));
      if (!stockRes.ok) {
        await ShopOrder.updateOne(
          { _id: order._id },
          {
            $set: {
              stockDeductionError: stockRes.error.message,
            },
          }
        );
        return NextResponse.json({ error: 'Sin stock suficiente' }, { status: 409 });
      }

      await ensureDeliveryForOrder(String(order._id));
      await runOrderPostPaymentEffects(String(order._id));

      return NextResponse.json({ free: true, orderId: String(order._id), status: 'PAID' });
    }

    const first = orderItems[0];

    const headers = new Headers(request.headers);
    const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '';
    const userAgent = headers.get('user-agent') || '';

    const order = await ShopOrder.create({
      userId: user?.id || '',
      minecraftUsername: target.minecraftUsername,
      minecraftUuid: target.minecraftUuid,
      isGift: target.gift.isGift,
      giftRecipientUserId: target.gift.giftRecipientUserId,
      giftRecipientUsername: target.gift.giftRecipientUsername,
      giftRecipientMinecraftUsername: target.gift.giftRecipientMinecraftUsername,
      giftMessage: target.gift.giftMessage,
      productId: first?.productId || '',
      productName: first?.productName || '',
      productPrice: first?.unitPrice || 0,
      items: orderItems,
      subtotalPrice: pricing.subtotal,
      totalPrice,
      couponCode: pricing.coupon?.code || '',
      couponType: pricing.coupon?.type || '',
      couponValue: pricing.coupon?.value || 0,
      couponDiscountAmount: pricing.coupon?.discountAmount || 0,
      referralCode: pricing.referral?.code || '',
      referralReferrerUserId: pricing.referral?.referrerUserId || '',
      referralDiscountPercent: pricing.referral?.discountPercent || 0,
      referralDiscountAmount: pricing.referral?.discountAmount || 0,
      referralRewardAmount: pricing.referral?.rewardAmount || 0,
      loyaltyPointsUsed: pricing.loyalty?.pointsUsed || 0,
      loyaltyDiscountAmount: pricing.loyalty?.discountAmount || 0,
      balanceUsedAmount: pricing.storeBalance?.appliedBalance || 0,
      currency: String(process.env.SHOP_CURRENCY || 'EUR').toUpperCase(),
      status: 'PENDING',
      provider: 'STRIPE',
      ip,
      userAgent,
    });

    const siteUrl = getSiteUrl(request);

    const stripe = getStripe();
    const currency = String((order as any).currency || 'EUR').toLowerCase();

    // Provide a clearer error than Stripe's when below common minimums.
    // For EUR, Stripe requires at least 0.50.
    if (currency === 'eur') {
      const totalCents = orderItems.reduce((sum, it) => sum + Math.round(Number(it.unitPrice || 0) * 100) * Number(it.quantity || 1), 0);
      if (totalCents > 0 && totalCents < 50) {
        return NextResponse.json(
          { error: 'Stripe no permite pagos menores de 0,50€. Pon el producto a 0€ (gratis) o sube el precio.' },
          { status: 400 }
        );
      }
    }

    const hasAdjustedTotal = Math.abs(Math.round(Number(pricing.subtotal || 0) * 100) - Math.round(Number(pricing.totalPrice || 0) * 100)) > 0;
    const summaryLabel = orderItems
      .slice(0, 3)
      .map((item) => {
        const qty = Math.max(1, Number(item.quantity || 1));
        return qty > 1 ? `${item.productName} x${qty}` : item.productName;
      })
      .join(', ');

    const lineItems = hasAdjustedTotal
      ? [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: toStripeAmount(totalPrice),
              product_data: {
                name: String(process.env.SITE_NAME || 'Shop') + ' - Order total',
                description: summaryLabel || 'Order total after discounts and balance',
              },
            },
          },
        ]
      : orderItems.map((it) => ({
          quantity: it.quantity,
          price_data: {
            currency,
            unit_amount: toStripeAmount(it.unitPrice),
            product_data: {
              name: it.productName || 'Producto',
            },
          },
        }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      client_reference_id: String(order._id),
      metadata: {
        orderId: String(order._id),
      },
      payment_intent_data: {
        metadata: {
          orderId: String(order._id),
        },
      },
      customer_email: user?.email ? String(user.email) : undefined,
      success_url: `${siteUrl}/carrito/stripe/success?orderId=${encodeURIComponent(String(order._id))}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/carrito/stripe/cancel?orderId=${encodeURIComponent(String(order._id))}`,
    });

    await ShopOrder.updateOne(
      { _id: order._id },
      {
        $set: {
          stripeCheckoutSessionId: String(session.id || ''),
          stripeStatus: String((session as any).status || ''),
          stripePaymentStatus: String((session as any).payment_status || ''),
        },
      }
    );

    const url = String((session as any).url || '').trim();
    if (!url) {
      return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: String(order._id),
      sessionId: String(session.id || ''),
      url,
    });
  } catch (error: any) {
    console.error('Stripe create session error:', error);
    return NextResponse.json({ error: error?.message || 'Error al crear pago con Stripe' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
