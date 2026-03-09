import dbConnect from '@/lib/mongodb';
import { applyOrderLoyalty } from '@/lib/loyalty';
import { applyOrderIncentives } from '@/lib/referrals';
import Notification from '@/models/Notification';
import ShopOrder from '@/models/ShopOrder';

async function notifyGiftRecipient(orderId: string) {
  await dbConnect();

  const order = await ShopOrder.findById(orderId);
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' as const };
  if (!(order as any).isGift) return { ok: true, skipped: 'NOT_GIFT' as const };

  const recipientUserId = String((order as any).giftRecipientUserId || '').trim();
  if (!recipientUserId) return { ok: true, skipped: 'NO_RECIPIENT' as const };

  const lock = await ShopOrder.updateOne(
    { _id: order._id, giftNotifiedAt: { $exists: false } },
    { $set: { giftNotifiedAt: new Date() } }
  );

  if (Number((lock as any).modifiedCount || 0) === 0) {
    return { ok: true, alreadyNotified: true };
  }

  const senderLabel = String((order as any).userId || '').trim() ? 'Un usuario de la tienda' : 'La tienda';
  const productNames = Array.isArray((order as any).items)
    ? ((order as any).items as Array<{ productName?: string; quantity?: number }>)
        .map((item) => {
          const name = String(item?.productName || '').trim() || 'Producto';
          const quantity = Math.max(1, Number(item?.quantity || 1));
          return quantity > 1 ? `${name} x${quantity}` : name;
        })
        .join(', ')
    : String((order as any).productName || 'Producto');

  const extra = String((order as any).giftMessage || '').trim();
  await Notification.create({
    userId: recipientUserId,
    title: 'Has recibido un regalo',
    message: extra
      ? `${senderLabel} te ha enviado: ${productNames}. Mensaje: ${extra}`
      : `${senderLabel} te ha enviado: ${productNames}.`,
    href: '/perfil',
    type: 'SUCCESS',
  }).catch(() => null);

  return { ok: true };
}

export async function runOrderPostPaymentEffects(orderId: string) {
  const [incentives, loyalty, gift] = await Promise.all([
    applyOrderIncentives(orderId),
    applyOrderLoyalty(orderId),
    notifyGiftRecipient(orderId),
  ]);

  return { incentives, loyalty, gift };
}