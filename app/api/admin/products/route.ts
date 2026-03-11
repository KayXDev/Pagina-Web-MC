import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import AdminLog from '@/models/AdminLog';
import Notification from '@/models/Notification';
import ShopWishlistItem from '@/models/ShopWishlistItem';
import { productSchema } from '@/lib/validations';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

function normalizeProductPayload(input: Record<string, any>) {
  const next = { ...input };

  next.salePrice = typeof next.salePrice === 'number' && Number.isFinite(next.salePrice) && next.salePrice > 0
    ? next.salePrice
    : undefined;
  next.compareAtPrice = typeof next.compareAtPrice === 'number' && Number.isFinite(next.compareAtPrice) && next.compareAtPrice > 0
    ? next.compareAtPrice
    : undefined;
  next.offerLabel = String(next.offerLabel || '').trim();
  if (!next.offerLabel) next.offerLabel = '';
  next.bonusBalanceAmount = typeof next.bonusBalanceAmount === 'number' && Number.isFinite(next.bonusBalanceAmount) && next.bonusBalanceAmount > 0
    ? next.bonusBalanceAmount
    : 0;

  next.saleStartsAt = typeof next.saleStartsAt === 'string' && next.saleStartsAt.trim()
    ? new Date(next.saleStartsAt)
    : undefined;
  next.saleEndsAt = typeof next.saleEndsAt === 'string' && next.saleEndsAt.trim()
    ? new Date(next.saleEndsAt)
    : undefined;

  if (next.saleStartsAt && Number.isNaN(next.saleStartsAt.getTime())) next.saleStartsAt = undefined;
  if (next.saleEndsAt && Number.isNaN(next.saleEndsAt.getTime())) next.saleEndsAt = undefined;

  if (!(typeof next.salePrice === 'number' && next.salePrice > 0 && next.salePrice < Number(next.price || 0))) {
    next.salePrice = undefined;
    next.saleStartsAt = undefined;
    next.saleEndsAt = undefined;
    next.offerLabel = next.offerLabel || '';
  }

  return next;
}

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();
    
    const products = await Product.find().sort({ order: 1, createdAt: -1 });
    
    return NextResponse.json(products);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    
    const validatedData = productSchema.parse(body);
    
    await dbConnect();
    
    const product = await Product.create(normalizeProductPayload(validatedData as any));
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'CREATE_PRODUCT',
      targetType: 'PRODUCT',
      targetId: product._id.toString(),
      meta: {
        name: product.name,
        price: product.price,
        category: product.category,
        path: '/api/admin/products',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const { productId, updates } = await request.json();
    
    await dbConnect();

    const previousProduct = await Product.findById(productId).lean();
    
    const normalizedUpdates = normalizeProductPayload((updates || {}) as any);
    const product = await Product.findByIdAndUpdate(productId, normalizedUpdates, { returnDocument: 'after' });
    
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'UPDATE_PRODUCT',
      targetType: 'PRODUCT',
      targetId: productId,
      details: JSON.stringify(updates),
      meta: {
        updates: normalizedUpdates,
        path: '/api/admin/products',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    const previousPrice = Number((previousProduct as any)?.price || 0);
    const nextPrice = Number((product as any)?.price || 0);
    const previousStock = Number((previousProduct as any)?.stock || 0);
    const nextStock = Number((product as any)?.stock || 0);
    const wasUnlimited = Boolean((previousProduct as any)?.isUnlimited);
    const isUnlimited = Boolean((product as any)?.isUnlimited);

    const restocked = (!wasUnlimited && previousStock <= 0) && (isUnlimited || nextStock > 0);
    const priceDropped = previousPrice > 0 && nextPrice > 0 && nextPrice < previousPrice;

    if (restocked || priceDropped) {
      const watchers = await ShopWishlistItem.find({ productId }).lean();
      const notificationsByUserId = new Map<string, { userId: string; title: string; message: string; href: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' }>();

      for (const watcher of Array.isArray(watchers) ? watchers : []) {
        const userId = String((watcher as any).userId || '').trim();
        if (!userId) continue;

        const wantsRestock = Boolean((watcher as any).alertOnRestock);
        const wantsPriceDrop = Boolean((watcher as any).alertOnPriceDrop);
        const lastKnownPrice = Number((watcher as any).lastKnownPrice || 0);
        const shouldNotifyRestock = restocked && wantsRestock;
        const shouldNotifyPriceDrop = priceDropped && wantsPriceDrop && (lastKnownPrice <= 0 || nextPrice < lastKnownPrice);

        if (!shouldNotifyRestock && !shouldNotifyPriceDrop) continue;

        let title = 'Actualización en tu wishlist';
        let message = `Hay cambios en ${product.name}.`;

        if (shouldNotifyRestock && shouldNotifyPriceDrop) {
          title = 'Producto disponible y rebajado';
          message = `${product.name} ha vuelto al stock y ahora cuesta menos.`;
        } else if (shouldNotifyRestock) {
          title = 'Producto de nuevo en stock';
          message = `${product.name} vuelve a estar disponible.`;
        } else if (shouldNotifyPriceDrop) {
          title = 'Bajada de precio';
          message = `${product.name} ha bajado a ${nextPrice.toFixed(2)} EUR.`;
        }

        notificationsByUserId.set(userId, {
          userId,
          title,
          message,
          href: '/tienda',
          type: shouldNotifyPriceDrop ? 'SUCCESS' : 'INFO',
        });
      }

      if (notificationsByUserId.size > 0) {
        await Notification.insertMany(Array.from(notificationsByUserId.values()), { ordered: false }).catch(() => undefined);
      }

      if (priceDropped) {
        await ShopWishlistItem.updateMany(
          { productId, alertOnPriceDrop: true },
          { $set: { lastKnownPrice: nextPrice } }
        ).catch(() => undefined);
      }
    }
    
    return NextResponse.json(product);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    
    if (!productId) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }
    
    await dbConnect();
    
    const product = await Product.findByIdAndDelete(productId);
    
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'DELETE_PRODUCT',
      targetType: 'PRODUCT',
      targetId: productId,
      meta: {
        name: product.name,
        path: '/api/admin/products',
        method: 'DELETE',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json({ message: 'Producto eliminado' });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}
