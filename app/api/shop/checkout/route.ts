import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import { getCurrentUser } from '@/lib/session';
import { buildPricingFromItems } from '@/lib/shopPricing';
import { resolveCheckoutTarget } from '@/lib/shopCheckout';

const checkoutSchema = z.object({
  minecraftUsername: z.string().default(''),
  productId: z.string().min(1).optional(),
  couponCode: z.string().max(40).optional(),
  loyaltyPointsToRedeem: z.number().int().min(0).optional(),
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(body);
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
      currency: process.env.SHOP_CURRENCY || 'EUR',
      status: 'PENDING',
      provider: 'MANUAL',
      ip,
      userAgent,
    });

    return NextResponse.json({
      orderId: String(order._id),
      status: order.status,
      provider: order.provider,
      minecraftUsername: order.minecraftUsername,
      minecraftUuid: order.minecraftUuid,
      isGift: Boolean((order as any).isGift),
      giftRecipientUsername: String((order as any).giftRecipientUsername || ''),
      currency: order.currency,
      subtotalPrice: (order as any).subtotalPrice || 0,
      coupon: (order as any).couponCode
        ? {
            code: (order as any).couponCode,
            discountAmount: (order as any).couponDiscountAmount || 0,
          }
        : null,
      referral: (order as any).referralCode
        ? {
            code: (order as any).referralCode,
            discountAmount: (order as any).referralDiscountAmount || 0,
          }
        : null,
      loyalty: Number((order as any).loyaltyPointsUsed || 0) > 0
        ? {
            pointsUsed: Number((order as any).loyaltyPointsUsed || 0),
            discountAmount: Number((order as any).loyaltyDiscountAmount || 0),
          }
        : null,
      totalPrice: (order as any).totalPrice || 0,
      items: (order as any).items || [],
      product:
        Array.isArray((order as any).items) && (order as any).items.length === 1
          ? {
              id: order.productId,
              name: order.productName,
              price: order.productPrice,
              currency: order.currency,
            }
          : null,
    });
  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
