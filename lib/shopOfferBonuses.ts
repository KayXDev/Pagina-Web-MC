import dbConnect from '@/lib/mongodb';
import ShopOrder from '@/models/ShopOrder';
import Product from '@/models/Product';
import User from '@/models/User';
import Notification from '@/models/Notification';

export async function applyOrderOfferBonuses(orderId: string) {
  await dbConnect();

  const order = await ShopOrder.findById(orderId);
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' as const };

  const userId = String((order as any).userId || '').trim();
  if (!userId) return { ok: true, skipped: 'NO_USER' as const };

  const lock = await ShopOrder.updateOne(
    { _id: order._id, bonusBalanceAppliedAt: { $exists: false } },
    { $set: { bonusBalanceAppliedAt: new Date() } }
  );

  if (Number((lock as any).modifiedCount || 0) === 0) {
    return { ok: true, alreadyApplied: true };
  }

  const items = Array.isArray((order as any).items) ? ((order as any).items as Array<{ productId?: string; quantity?: number }>) : [];
  if (!items.length) {
    return { ok: true, skipped: 'NO_ITEMS' as const };
  }

  const productIds = items.map((item) => String(item?.productId || '').trim()).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } }).select('_id name bonusBalanceAmount').lean();
  const productById = new Map(products.map((product) => [String((product as any)._id || ''), product]));

  let totalBonus = 0;
  const labels: string[] = [];

  for (const item of items) {
    const product = productById.get(String(item?.productId || '').trim());
    if (!product) continue;
    const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
    const bonus = Math.max(0, Number((product as any).bonusBalanceAmount || 0));
    if (bonus <= 0) continue;
    totalBonus += bonus * quantity;
    labels.push(`${String((product as any).name || 'Producto')} +${(bonus * quantity).toFixed(2)} EUR`);
  }

  totalBonus = Math.round((totalBonus + Number.EPSILON) * 100) / 100;

  if (totalBonus <= 0) {
    return { ok: true, skipped: 'NO_BONUS' as const };
  }

  await Promise.all([
    User.findByIdAndUpdate(userId, { $inc: { balance: totalBonus } }),
    ShopOrder.updateOne({ _id: order._id }, { $set: { bonusBalanceAwarded: totalBonus } }),
    Notification.create({
      userId,
      title: 'Bonus de recarga aplicado',
      message: `Has recibido ${totalBonus.toFixed(2)} EUR de saldo extra${labels.length ? ` por ${labels.join(', ')}` : ''}.`,
      href: '/perfil/recompensas',
      type: 'SUCCESS',
    }).catch(() => null),
  ]);

  return { ok: true, bonusBalanceAwarded: totalBonus };
}