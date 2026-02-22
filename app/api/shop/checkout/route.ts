import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ShopOrder from '@/models/ShopOrder';
import { resolveMinecraftAccount } from '@/lib/minecraftAccount';
import { getCurrentUser } from '@/lib/session';

const checkoutSchema = z.object({
  productId: z.string().min(1),
  minecraftUsername: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
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

    const product = await Product.findById(parsed.data.productId).lean();
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    if (!(product as any).isActive) return NextResponse.json({ error: 'Producto no disponible' }, { status: 400 });

    const user = await getCurrentUser().catch(() => null);

    const headers = new Headers(request.headers);
    const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '';
    const userAgent = headers.get('user-agent') || '';

    const order = await ShopOrder.create({
      userId: user?.id || '',
      minecraftUsername: resolved.username,
      minecraftUuid: resolved.uuid,
      productId: String((product as any)._id),
      productName: String((product as any).name || ''),
      productPrice: Number((product as any).price || 0),
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
      product: {
        id: order.productId,
        name: order.productName,
        price: order.productPrice,
        currency: order.currency,
      },
    });
  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
