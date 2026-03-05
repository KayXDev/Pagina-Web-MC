import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Coupon from '@/models/Coupon';

const createSchema = z.object({
  code: z.string().min(3).max(40),
  description: z.string().max(200).optional(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().min(0),
  active: z.boolean().optional(),
  minOrderTotal: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  appliesToCategories: z.array(z.string()).optional(),
  appliesToProductIds: z.array(z.string().min(1)).max(1).optional(),
});

const patchSchema = createSchema.partial().extend({ id: z.string().min(1) });

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();
    const coupons = await Coupon.find().sort({ updatedAt: -1 }).lean();
    return NextResponse.json(coupons);
  } catch (error: any) {
    if (String(error?.message || '').includes('Forbidden') || String(error?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al obtener cupones' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    const code = String(parsed.data.code || '').trim().toUpperCase();
    const exists = await Coupon.findOne({ code }).lean();
    if (exists) return NextResponse.json({ error: 'El cupón ya existe' }, { status: 409 });

    const doc = await Coupon.create({
      ...parsed.data,
      code,
      active: parsed.data.active ?? true,
      appliesToProductIds: Array.isArray(parsed.data.appliesToProductIds)
        ? parsed.data.appliesToProductIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 1)
        : [],
      createdBy: String(admin.id || ''),
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: any) {
    if (String(error?.message || '').includes('Forbidden') || String(error?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al crear cupón' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    const updates: any = { ...parsed.data };
    delete updates.id;
    if (typeof updates.code === 'string') updates.code = updates.code.trim().toUpperCase();
    if (typeof updates.startsAt === 'string') updates.startsAt = updates.startsAt ? new Date(updates.startsAt) : undefined;
    if (typeof updates.expiresAt === 'string') updates.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : undefined;
    if (Array.isArray(updates.appliesToProductIds)) {
      updates.appliesToProductIds = updates.appliesToProductIds
        .map((id: string) => String(id).trim())
        .filter(Boolean)
        .slice(0, 1);
    }

    const updated = await Coupon.findByIdAndUpdate(parsed.data.id, updates, { returnDocument: 'after' });
    if (!updated) return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (String(error?.message || '').includes('Forbidden') || String(error?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al actualizar cupón' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await dbConnect();
    const deleted = await Coupon.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (String(error?.message || '').includes('Forbidden') || String(error?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al eliminar cupón' }, { status: 500 });
  }
}
