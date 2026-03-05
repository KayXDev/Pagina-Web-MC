import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import { resolveMinecraftAccount } from '@/lib/minecraftAccount';
import { getCurrentUser } from '@/lib/session';
import { buildPricingFromItems } from '@/lib/shopPricing';

const checkoutSchema = z.object({
  minecraftUsername: z.string().min(1),
  productId: z.string().min(1).optional(),
  couponCode: z.string().max(40).optional(),
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

    const onlineMode = (process.env.MC_ONLINE_MODE || 'true').toLowerCase() !== 'false';
    const resolved = await resolveMinecraftAccount({
      usernameRaw: parsed.data.minecraftUsername,
      onlineMode,
      timeoutMs: 5000,
    });

    if (!resolved) {
      return NextResponse.json({ error: 'Usuario de Minecraft inválido o no encontrado' }, { status: 400 });
    }

    await dbConnect();

    const user = await getCurrentUser().catch(() => null);

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
    const first = orderItems[0];

    const headers = new Headers(request.headers);
    const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '';
    const userAgent = headers.get('user-agent') || '';

    const order = await ShopOrder.create({
      userId: user?.id || '',
      minecraftUsername: resolved.username,
      minecraftUuid: resolved.uuid,
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
