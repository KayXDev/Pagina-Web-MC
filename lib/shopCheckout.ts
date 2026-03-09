import User from '@/models/User';
import { resolveMinecraftAccount } from '@/lib/minecraftAccount';

type Buyer = {
  id?: string;
  name?: string;
};

type GiftInput = {
  recipientUsername?: string;
  message?: string;
};

type ResolveCheckoutTargetInput = {
  minecraftUsername: string;
  gift?: GiftInput;
  buyer?: Buyer | null;
};

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeGiftMessage(value: string) {
  return String(value || '').trim().slice(0, 240);
}

export async function resolveCheckoutTarget(input: ResolveCheckoutTargetInput) {
  const recipientUsername = String(input.gift?.recipientUsername || '').trim().replace(/^@+/, '');

  if (recipientUsername) {
    const buyerId = String(input.buyer?.id || '').trim();
    if (!buyerId) {
      throw new Error('Debes iniciar sesión para enviar regalos');
    }

    const recipient = await User.findOne({
      username: { $regex: new RegExp(`^${escapeRegex(recipientUsername)}$`, 'i') },
    })
      .select('_id username minecraftUsername minecraftUuid')
      .lean();

    if (!recipient) {
      throw new Error('El destinatario no existe');
    }

    if (String((recipient as any)._id || '') === buyerId) {
      throw new Error('No puedes regalarte a ti mismo');
    }

    const recipientMinecraftUsername = String((recipient as any).minecraftUsername || '').trim();
    const recipientMinecraftUuid = String((recipient as any).minecraftUuid || '').trim();
    if (!recipientMinecraftUsername || !recipientMinecraftUuid) {
      throw new Error('El destinatario debe tener su cuenta de Minecraft vinculada');
    }

    return {
      minecraftUsername: recipientMinecraftUsername,
      minecraftUuid: recipientMinecraftUuid,
      gift: {
        isGift: true,
        giftRecipientUserId: String((recipient as any)._id || ''),
        giftRecipientUsername: String((recipient as any).username || recipientUsername),
        giftRecipientMinecraftUsername: recipientMinecraftUsername,
        giftMessage: normalizeGiftMessage(String(input.gift?.message || '')),
      },
    };
  }

  const onlineMode = (process.env.MC_ONLINE_MODE || 'true').toLowerCase() !== 'false';
  const resolved = await resolveMinecraftAccount({
    usernameRaw: input.minecraftUsername,
    onlineMode,
    timeoutMs: 5000,
  });

  if (!resolved) {
    throw new Error('Usuario de Minecraft inválido o no encontrado');
  }

  return {
    minecraftUsername: resolved.username,
    minecraftUuid: resolved.uuid,
    gift: {
      isGift: false,
      giftRecipientUserId: '',
      giftRecipientUsername: '',
      giftRecipientMinecraftUsername: '',
      giftMessage: '',
    },
  };
}