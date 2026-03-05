import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/session';
import { buildPricingFromItems } from '@/lib/shopPricing';

const schema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(99),
    })
  ),
  couponCode: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();
    const user = await getCurrentUser().catch(() => null);

    const pricing = await buildPricingFromItems({
      rawItems: parsed.data.items,
      couponCode: parsed.data.couponCode,
      buyerUserId: user?.id || '',
    });

    return NextResponse.json({
      subtotal: pricing.subtotal,
      coupon: pricing.coupon,
      referral: pricing.referral,
      totalPrice: pricing.totalPrice,
    });
  } catch (err: any) {
    const msg = String(err?.message || 'Error');
    if (msg === 'Producto no encontrado') return NextResponse.json({ error: msg }, { status: 404 });
    if (msg === 'Sin stock suficiente') return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export const runtime = 'nodejs';
