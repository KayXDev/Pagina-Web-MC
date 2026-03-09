import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import { getCurrentUser } from '@/lib/session';
import { paypalCreateOrder } from '@/lib/paypal';
import { ensureDeliveryForOrder } from '@/lib/deliveries';
import { ensureStockDeductedForOrder } from '@/lib/stock';
import { buildPricingFromItems } from '@/lib/shopPricing';
import { resolveCheckoutTarget } from '@/lib/shopCheckout';
import { runOrderPostPaymentEffects } from '@/lib/shopPostPayment';

const schema = z.object({
  minecraftUsername: z.string().default(''),
  productId: z.string().min(1).optional(),
  couponCode: z.string().max(40).optional(),
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

    // If the order is free, bypass PayPal and enqueue delivery immediately.
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
      currency: String(process.env.SHOP_CURRENCY || 'EUR').toUpperCase(),
      status: 'PENDING',
      provider: 'PAYPAL',
      ip,
      userAgent,
    });

    const siteUrl = getSiteUrl(request);
    const returnUrl = `${siteUrl}/carrito/paypal/return?orderId=${encodeURIComponent(String(order._id))}`;
    const cancelUrl = `${siteUrl}/carrito/paypal/cancel?orderId=${encodeURIComponent(String(order._id))}`;

    const description = String(process.env.SITE_NAME || 'Shop') + ` - Order ${String(order._id)}`;

    const created = await paypalCreateOrder({
      totalPrice,
      currency: (order as any).currency || 'EUR',
      description,
      customId: String(order._id),
      returnUrl,
      cancelUrl,
    });

    const approvalUrl = String((created as any).approvalUrl || '').trim();
    if (!approvalUrl) {
      return NextResponse.json({ error: 'No se pudo iniciar el pago con PayPal' }, { status: 500 });
    }

    await ShopOrder.updateOne(
      { _id: order._id },
      {
        $set: {
          paypalOrderId: created.paypalOrderId,
          paypalStatus: created.status,
        },
      }
    );

    return NextResponse.json({
      orderId: String(order._id),
      paypalOrderId: created.paypalOrderId,
      approvalUrl,
    });
  } catch (error: any) {
    console.error('PayPal create order error:', error);
    return NextResponse.json({ error: error?.message || 'Error al crear pago con PayPal' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
