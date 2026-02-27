import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import ShopCart from '@/models/ShopCart';
import { requireAuth } from '@/lib/session';

const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

const putSchema = z.object({
  items: z.array(cartItemSchema),
});

export async function GET() {
  try {
    const user = await requireAuth();
    await dbConnect();

    const cart = await ShopCart.findOne({ userId: user.id }).lean();
    return NextResponse.json({ items: (cart as any)?.items || [] });
  } catch (error: any) {
    const message = String(error?.message || 'Unauthorized');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const deduped = new Map<string, number>();
    for (const item of parsed.data.items) {
      const prev = deduped.get(item.productId) || 0;
      deduped.set(item.productId, Math.min(99, prev + item.quantity));
    }

    const items = Array.from(deduped.entries()).map(([productId, quantity]) => ({ productId, quantity }));

    await dbConnect();
    await ShopCart.findOneAndUpdate(
      { userId: user.id },
      { $set: { userId: user.id, items } },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
