import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ShopOrder from '@/models/ShopOrder';

export class StockError extends Error {
  code: 'OUT_OF_STOCK' | 'ORDER_NOT_FOUND';
  details?: any;

  constructor(code: StockError['code'], message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function getOrderItems(order: any): Array<{ productId: string; productName: string; quantity: number }> {
  const items = Array.isArray(order?.items) && order.items.length
    ? order.items
    : [
        {
          productId: String(order?.productId || ''),
          productName: String(order?.productName || ''),
          quantity: 1,
        },
      ].filter((it) => Boolean(it.productId));

  return items.map((it: any) => ({
    productId: String(it.productId || ''),
    productName: String(it.productName || ''),
    quantity: Math.max(1, Math.floor(Number(it.quantity || 1))),
  }));
}

async function deductStockTx(orderId: string): Promise<{ ok: true } | { ok: false; error: StockError }> {
  const session = await mongoose.startSession();

  try {
    let result: { ok: true } | { ok: false; error: StockError } = { ok: true };

    await session.withTransaction(async () => {
      const order = await ShopOrder.findById(orderId).session(session);
      if (!order) {
        result = { ok: false, error: new StockError('ORDER_NOT_FOUND', 'Pedido no encontrado') };
        return;
      }

      if ((order as any).stockDeductedAt) {
        // Idempotent: already deducted.
        result = { ok: true };
        return;
      }

      const items = getOrderItems(order);
      const productIds = Array.from(new Set(items.map((i) => i.productId).filter(Boolean)));
      const products = await Product.find({ _id: { $in: productIds } })
        .select('_id isUnlimited stock name')
        .lean()
        .session(session);

      const productById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));

      const missing: any[] = [];
      const insufficient: any[] = [];

      for (const it of items) {
        const p = productById.get(it.productId);
        if (!p) {
          missing.push({ productId: it.productId, name: it.productName });
          continue;
        }

        if (p.isUnlimited) continue;

        const currentStock = Number(p.stock);
        const safeStock = Number.isFinite(currentStock) ? currentStock : 0;
        if (safeStock < it.quantity) {
          insufficient.push({ productId: it.productId, name: String(p.name || it.productName), stock: safeStock, need: it.quantity });
        }
      }

      if (missing.length || insufficient.length) {
        const err = new StockError(
          'OUT_OF_STOCK',
          'Sin stock suficiente para completar el pedido',
          { missing, insufficient }
        );
        result = { ok: false, error: err };
        // Throw to abort tx.
        throw err;
      }

      for (const it of items) {
        const p = productById.get(it.productId);
        if (!p || p.isUnlimited) continue;

        const updateRes = await Product.updateOne(
          { _id: it.productId, isUnlimited: false, stock: { $gte: it.quantity } },
          { $inc: { stock: -it.quantity } }
        ).session(session);

        if (!updateRes.modifiedCount) {
          const err = new StockError(
            'OUT_OF_STOCK',
            'Sin stock suficiente para completar el pedido',
            { productId: it.productId, need: it.quantity }
          );
          result = { ok: false, error: err };
          throw err;
        }
      }

      await ShopOrder.updateOne(
        { _id: orderId },
        { $set: { stockDeductedAt: new Date(), stockDeductionError: '' } }
      ).session(session);

      result = { ok: true };
    });

    return result;
  } catch (err: any) {
    if (err instanceof StockError) {
      return { ok: false, error: err };
    }

    return {
      ok: false,
      error: new StockError('OUT_OF_STOCK', String(err?.message || err || 'Stock error')),
    };
  } finally {
    await session.endSession();
  }
}

async function deductStockFallback(orderId: string): Promise<{ ok: true } | { ok: false; error: StockError }> {
  const order = await ShopOrder.findById(orderId).lean();
  if (!order) return { ok: false, error: new StockError('ORDER_NOT_FOUND', 'Pedido no encontrado') };
  if ((order as any).stockDeductedAt) return { ok: true };

  const items = getOrderItems(order);
  const productIds = Array.from(new Set(items.map((i) => i.productId).filter(Boolean)));
  const products = await Product.find({ _id: { $in: productIds } }).select('_id isUnlimited stock name').lean();
  const productById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));

  for (const it of items) {
    const p = productById.get(it.productId);
    if (!p) return { ok: false, error: new StockError('OUT_OF_STOCK', 'Producto no encontrado', { productId: it.productId }) };
    if (p.isUnlimited) continue;
    const safeStock = Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0;
    if (safeStock < it.quantity) {
      return { ok: false, error: new StockError('OUT_OF_STOCK', 'Sin stock suficiente para completar el pedido', { productId: it.productId, stock: safeStock, need: it.quantity }) };
    }
  }

  for (const it of items) {
    const p = productById.get(it.productId);
    if (!p || p.isUnlimited) continue;

    const updateRes = await Product.updateOne(
      { _id: it.productId, isUnlimited: false, stock: { $gte: it.quantity } },
      { $inc: { stock: -it.quantity } }
    );

    if (!updateRes.modifiedCount) {
      return { ok: false, error: new StockError('OUT_OF_STOCK', 'Sin stock suficiente para completar el pedido', { productId: it.productId, need: it.quantity }) };
    }
  }

  await ShopOrder.updateOne(
    { _id: orderId, stockDeductedAt: { $exists: false } },
    { $set: { stockDeductedAt: new Date(), stockDeductionError: '' } }
  );

  return { ok: true };
}

export async function ensureStockDeductedForOrder(orderId: string): Promise<{ ok: true } | { ok: false; error: StockError }> {
  await dbConnect();

  try {
    return await deductStockTx(orderId);
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    // Transactions not supported on standalone mongod.
    if (msg.includes('Transaction numbers are only allowed') || msg.includes('replica set')) {
      return await deductStockFallback(orderId);
    }
    return { ok: false, error: new StockError('OUT_OF_STOCK', msg) };
  }
}
