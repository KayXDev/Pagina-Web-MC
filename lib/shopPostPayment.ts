import dbConnect from '@/lib/mongodb';
import { applyOrderLoyalty, applyOrderLoyaltyRedemption } from '@/lib/loyalty';
import { applyOrderIncentives } from '@/lib/referrals';
import { applyOrderOfferBonuses } from '@/lib/shopOfferBonuses';
import { applyOrderStoreBalance } from '@/lib/shopBalance';
import { isEmailConfigured, sendGiftReceivedEmail } from '@/lib/email';
import { sendGiftReceivedWebhook } from '@/lib/shopIncentivesDiscord';
import Notification from '@/models/Notification';
import ShopOrder from '@/models/ShopOrder';
import Settings from '@/models/Settings';
import User from '@/models/User';

const GIFT_WEBHOOK_KEY = 'shop_gift_discord_webhook';

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
  const [recipient, sender, webhookSetting] = await Promise.all([
    User.findById(recipientUserId, { _id: 1, username: 1, email: 1 }).lean().catch(() => null),
    String((order as any).userId || '').trim()
      ? User.findById(String((order as any).userId || ''), { _id: 1, username: 1, email: 1 }).lean().catch(() => null)
      : null,
    Settings.findOne({ key: GIFT_WEBHOOK_KEY }).lean().catch(() => null),
  ]);

  const recipientName = String((recipient as any)?.username || (order as any).giftRecipientUsername || 'Usuario');
  const senderName = String((sender as any)?.username || senderLabel);

  await Notification.create({
    userId: recipientUserId,
    title: 'Has recibido un regalo',
    message: extra
      ? `${senderName} te ha enviado: ${productNames}. Mensaje: ${extra}`
      : `${senderName} te ha enviado: ${productNames}.`,
    href: '/perfil',
    type: 'SUCCESS',
  }).catch(() => null);

  if (isEmailConfigured() && String((recipient as any)?.email || '').trim()) {
    await sendGiftReceivedEmail({
      to: String((recipient as any)?.email || '').trim(),
      recipientUsername: recipientName,
      senderUsername: senderName,
      itemsLabel: productNames,
      giftMessage: extra || undefined,
    }).catch(() => null);
  }

  const webhookUrl = String((webhookSetting as any)?.value || '').trim();
  if (webhookUrl) {
    await sendGiftReceivedWebhook({
      webhookUrl,
      siteName: String(process.env.SITE_NAME || 'Shop').trim(),
      siteUrl: String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim(),
      orderId: String((order as any)._id || ''),
      recipientLabel: `**${recipientName}**`,
      senderLabel: `**${senderName}**`,
      giftMessage: extra || undefined,
      itemsLabel: productNames,
    }).catch(() => null);
  }

  return { ok: true };
}

export async function runOrderPostPaymentEffects(orderId: string) {
  const [incentives, loyaltyRedemption, loyalty, storeBalance, offerBonuses, gift] = await Promise.all([
    applyOrderIncentives(orderId),
    applyOrderLoyaltyRedemption(orderId),
    applyOrderLoyalty(orderId),
    applyOrderStoreBalance(orderId),
    applyOrderOfferBonuses(orderId),
    notifyGiftRecipient(orderId),
  ]);

  return { incentives, loyaltyRedemption, loyalty, storeBalance, offerBonuses, gift };
}