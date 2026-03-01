import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ShopOrder from '@/models/ShopOrder';
import { resolveMinecraftAccount } from '@/lib/minecraftAccount';
import { getCurrentUser } from '@/lib/session';

const checkoutSchema = z.object({
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

    // Stock validation for limited products.
    for (const { it, p } of lineItems) {
      if (!p) continue;
      if (p.isUnlimited) continue;
      const currentStock = Number((p as any).stock);
      const safeStock = Number.isFinite(currentStock) ? currentStock : 0;
      const need = Math.max(1, Math.floor(Number(it.quantity || 1)));
      if (safeStock < need) {
        return NextResponse.json(
          {
            error: 'Sin stock suficiente',
            productId: String((p as any)._id || it.productId),
            stock: safeStock,
            requested: need,
          },
          { status: 409 }
        );
      }
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
