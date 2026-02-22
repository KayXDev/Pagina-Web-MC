import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ShopDelivery from '@/models/ShopDelivery';
import ShopOrder from '@/models/ShopOrder';

function applyPlaceholders(
  template: string,
  vars: Record<string, string | number>
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

export async function ensureDeliveryForOrder(orderId: string): Promise<{ created: boolean }> {
  await dbConnect();

  const existing = await ShopDelivery.findOne({ orderId }).select('_id').lean();
  if (existing) return { created: false };

  const order = await ShopOrder.findById(orderId).lean();
  if (!order) return { created: false };

  const status = String((order as any).status || '');
  if (status !== 'PAID') return { created: false };

  const minecraftUsername = String((order as any).minecraftUsername || '').trim();
  const minecraftUuid = String((order as any).minecraftUuid || '').trim();
  if (!minecraftUsername || !minecraftUuid) return { created: false };

  const items = Array.isArray((order as any).items) && (order as any).items.length
    ? ((order as any).items as any[])
    : [
        {
          productId: String((order as any).productId || ''),
          productName: String((order as any).productName || ''),
          quantity: 1,
        },
      ].filter((it) => Boolean(it.productId));

  const productIds = Array.from(new Set(items.map((it) => String(it.productId || '')).filter(Boolean)));
  const products = await Product.find({ _id: { $in: productIds } })
    .select('_id deliveryCommands name')
    .lean();

  const commands: string[] = [];
  const productById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));

  for (const item of items) {
    const productId = String(item.productId || '');
    const productName = String(item.productName || productById.get(productId)?.name || '');
    const qty = Math.max(1, Math.floor(Number(item.quantity || 1)));

    const deliveryCommands = (productById.get(productId)?.deliveryCommands || []) as any;
    const lines = Array.isArray(deliveryCommands) ? deliveryCommands : [];

    for (const line of lines) {
      const template = String(line || '').trim();
      if (!template) continue;
      commands.push(
        applyPlaceholders(template, {
          player: minecraftUsername,
          uuid: minecraftUuid,
          qty,
          product: productName,
          orderId,
        })
      );
    }
  }

  if (!commands.length) {
    // Nothing to deliver. Consider it delivered.
    await ShopOrder.updateOne(
      { _id: orderId, status: 'PAID' },
      { $set: { status: 'DELIVERED' } }
    );
    return { created: false };
  }

  try {
    await ShopDelivery.create({
      orderId,
      userId: String((order as any).userId || ''),
      minecraftUsername,
      minecraftUuid,
      commands,
      status: 'PENDING',
      attempts: 0,
    });
  } catch (err: any) {
    // If it raced (unique index), ignore.
    if (String(err?.code) === '11000') return { created: false };
    throw err;
  }

  return { created: true };
}

export function requireDeliveryKey(request: Request): boolean {
  const expected = String(process.env.DELIVERY_API_KEY || '').trim();
  if (!expected) return false;

  const headerKey = String(request.headers.get('x-delivery-key') || '').trim();
  if (headerKey && headerKey === expected) return true;

  const auth = String(request.headers.get('authorization') || '').trim();
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token === expected) return true;
  }

  return false;
}

export function getMaxDeliveryAttempts(): number {
  const raw = Number(process.env.DELIVERY_MAX_ATTEMPTS || 10);
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  return Math.min(50, Math.max(1, Math.floor(raw)));
}
