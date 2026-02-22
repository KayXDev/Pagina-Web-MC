import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ShopOrder from '@/models/ShopOrder';
import { resolveMinecraftAccount } from '@/lib/minecraftAccount';
import { getCurrentUser } from '@/lib/session';
import { paypalCreateOrder } from '@/lib/paypal';
import { ensureDeliveryForOrder } from '@/lib/deliveries';

const schema = z.object({
  minecraftUsername: z.string().min(1),
  productId: z.string().min(1).optional(),
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

    const normalizedMap = new Map<string, number>();
    for (const item of rawItems) {
      const prev = normalizedMap.get(item.productId) || 0;
      normalizedMap.set(item.productId, Math.min(99, prev + item.quantity));
    }

    const normalizedItems = Array.from(normalizedMap.entries()).map(([productId, quantity]) => ({ productId, quantity }));
    const ids = normalizedItems.map((i) => i.productId);

    const products = await Product.find({ _id: { $in: ids } }).lean();
    const productById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));

    const lineItems = normalizedItems.map((it) => {
      const p = productById.get(String(it.productId));
      return { it, p };
    });

    for (const { p } of lineItems) {
      if (!p) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
      if (!p.isActive) return NextResponse.json({ error: 'Producto no disponible' }, { status: 400 });
    }

    const orderItems = lineItems.map(({ it, p }) => {
      const unitPrice = Number(p.price || 0);
      const quantity = Number(it.quantity || 1);
      const lineTotal = unitPrice * quantity;
      return {
        productId: String(p._id),
        productName: String(p.name || ''),
        unitPrice,
        quantity,
        lineTotal,
      };
    });

    const totalPrice = orderItems.reduce((sum, i) => sum + Number(i.lineTotal || 0), 0);
    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      return NextResponse.json({ error: 'Total inválido' }, { status: 400 });
    }

    // If the order is free, bypass PayPal and enqueue delivery immediately.
    if (totalPrice === 0) {
      const first = orderItems[0];
      const user = await getCurrentUser().catch(() => null);

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
        totalPrice,
        currency: String(process.env.SHOP_CURRENCY || 'EUR').toUpperCase(),
        status: 'PAID',
        provider: 'MANUAL',
        paidAt: new Date(),
        ip,
        userAgent,
      });

      await ensureDeliveryForOrder(String(order._id));

      return NextResponse.json({ free: true, orderId: String(order._id), status: 'PAID' });
    }

    const first = orderItems[0];
    const user = await getCurrentUser().catch(() => null);

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
      totalPrice,
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
