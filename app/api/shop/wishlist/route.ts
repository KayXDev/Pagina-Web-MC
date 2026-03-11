import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import Product from '@/models/Product';
import ShopWishlistItem from '@/models/ShopWishlistItem';
import User from '@/models/User';

async function resolveUserIdFromSessionUser(user: any) {
  const direct = typeof user?.id === 'string' && user.id ? user.id : '';
  if (direct) return direct;

  const alt = typeof user?._id === 'string' && user._id ? user._id : '';
  if (alt) return alt;

  const email = typeof user?.email === 'string' ? user.email.toLowerCase() : '';
  if (!email) throw new Error('Unauthorized');

  const found = await User.findOne({ email }, { _id: 1 }).lean();
  const id = found?._id ? String((found as any)._id) : '';
  if (!id) throw new Error('Unauthorized');
  return id;
}

export async function GET() {
  try {
    const sessionUser = await requireAuth();
    await dbConnect();
    const userId = await resolveUserIdFromSessionUser(sessionUser);

    const items = await ShopWishlistItem.find({ userId }).sort({ createdAt: -1 }).lean();
    const productIds = items.map((item) => String((item as any).productId || '')).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('_id name price image isUnlimited stock isActive category')
      .lean();
    const productById = new Map(products.map((product) => [String((product as any)._id), product]));

    return NextResponse.json({
      items: items.map((item) => {
        const product = productById.get(String((item as any).productId || ''));
        return {
          _id: String((item as any)._id || ''),
          productId: String((item as any).productId || ''),
          alertOnRestock: Boolean((item as any).alertOnRestock),
          alertOnPriceDrop: Boolean((item as any).alertOnPriceDrop),
          lastKnownPrice: Number((item as any).lastKnownPrice || 0),
          product: product
            ? {
                _id: String((product as any)._id || ''),
                name: String((product as any).name || ''),
                price: Number((product as any).price || 0),
                image: String((product as any).image || ''),
                isUnlimited: Boolean((product as any).isUnlimited),
                stock: Number((product as any).stock || 0),
                isActive: Boolean((product as any).isActive),
                category: String((product as any).category || ''),
              }
            : null,
        };
      }),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Error fetching wishlist:', error);
    return NextResponse.json({ error: 'Error al cargar wishlist' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json().catch(() => ({}));
    await dbConnect();
    const userId = await resolveUserIdFromSessionUser(sessionUser);

    const action = String((body as any).action || '').trim();

    if (action === 'sync') {
      const incomingItems = Array.isArray((body as any).items) ? ((body as any).items as any[]) : [];
      const ids = Array.from(
        new Set(
          incomingItems
            .map((item) => String(item?.productId || '').trim())
            .filter(Boolean)
        )
      );

      const products = await Product.find({ _id: { $in: ids } }).select('_id price').lean();
      const productById = new Map(products.map((product) => [String((product as any)._id || ''), product]));

      await Promise.all(
        ids.map((productId) => {
          const incoming = incomingItems.find((item) => String(item?.productId || '').trim() === productId) || {};
          const product = productById.get(productId);
          return ShopWishlistItem.findOneAndUpdate(
            { userId, productId },
            {
              $set: {
                alertOnRestock: incoming.alertOnRestock !== false,
                alertOnPriceDrop: incoming.alertOnPriceDrop !== false,
                lastKnownPrice: Number((product as any)?.price || 0),
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        })
      );

      return NextResponse.json({ ok: true });
    }

    const productId = String((body as any).productId || '').trim();
    if (!productId) {
      return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
    }

    const product = await Product.findById(productId).select('_id price').lean();
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (action === 'toggle') {
      const existing = await ShopWishlistItem.findOne({ userId, productId }).lean();
      if (existing) {
        await ShopWishlistItem.deleteOne({ userId, productId });
        return NextResponse.json({ ok: true, active: false });
      }

      await ShopWishlistItem.create({
        userId,
        productId,
        alertOnRestock: true,
        alertOnPriceDrop: true,
        lastKnownPrice: Number((product as any).price || 0),
      });
      return NextResponse.json({ ok: true, active: true });
    }

    if (action === 'update-alerts') {
      const alertOnRestock = Boolean((body as any).alertOnRestock);
      const alertOnPriceDrop = Boolean((body as any).alertOnPriceDrop);
      await ShopWishlistItem.findOneAndUpdate(
        { userId, productId },
        {
          $set: {
            alertOnRestock,
            alertOnPriceDrop,
            lastKnownPrice: Number((product as any).price || 0),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return NextResponse.json({ ok: true, active: true });
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Error updating wishlist:', error);
    return NextResponse.json({ error: 'Error al actualizar wishlist' }, { status: 500 });
  }
}