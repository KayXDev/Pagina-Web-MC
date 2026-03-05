import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import ReferralProfile from '@/models/ReferralProfile';
import Settings from '@/models/Settings';
import User from '@/models/User';
import { ensureReferralProfileForUser } from '@/lib/referrals';

const REFERRAL_DISCOUNT_SETTING_KEY = 'referral_discount_percent';
const REFERRAL_WEBHOOK_SETTING_KEY = 'shop_referral_discord_webhook';

const createSchema = z.object({
  userId: z.string().min(1).optional(),
  userQuery: z.string().min(1).optional(),
});

const patchSchema = z.object({
  id: z.string().min(1).optional(),
  active: z.boolean().optional(),
  referralDiscountPercent: z.number().min(0).max(100).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();

    const [profiles, discountSetting, referralWebhookSetting] = await Promise.all([
      ReferralProfile.find().sort({ updatedAt: -1 }).limit(200).lean(),
      Settings.findOne({ key: REFERRAL_DISCOUNT_SETTING_KEY }).lean(),
      Settings.findOne({ key: REFERRAL_WEBHOOK_SETTING_KEY }).lean(),
    ]);
    const userIds = profiles.map((p: any) => String(p.userId || '')).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }, { _id: 1, username: 1, email: 1, balance: 1 }).lean();
    const userById = new Map<string, any>(users.map((u: any) => [String(u._id), u]));

    const referralDiscountPercent = Math.max(
      0,
      Math.min(100, Number(discountSetting?.value || process.env.REFERRAL_DISCOUNT_PERCENT || 5))
    );

    return NextResponse.json({
      referralDiscountPercent,
      referralWebhook: String(referralWebhookSetting?.value || ''),
      profiles: profiles.map((p: any) => {
        const u = userById.get(String(p.userId || ''));
        return {
          ...p,
          user: u
            ? {
                id: String(u._id),
                username: String(u.username || ''),
                email: String(u.email || ''),
                balance: Number(u.balance || 0),
              }
            : null,
        };
      }),
    });
  } catch (error: any) {
    if (String(error?.message || '').includes('Forbidden') || String(error?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al obtener referidos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    const userId = String(parsed.data.userId || '').trim();
    const userQuery = String(parsed.data.userQuery || '').trim();

    let user: any = null;
    if (userId) {
      user = await User.findById(userId, { _id: 1, username: 1, email: 1 }).lean();
    } else if (userQuery) {
      const q = userQuery.toLowerCase();
      user = await User.findOne(
        {
          $or: [
            { email: q },
            { username: userQuery },
          ],
        },
        { _id: 1, username: 1, email: 1 }
      ).lean();
    }

    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const profile = await ensureReferralProfileForUser({
      id: String((user as any)._id),
      username: String((user as any).username || 'USER'),
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error: any) {
    if (String(error?.message || '').includes('Forbidden') || String(error?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al crear referido' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    if (typeof parsed.data.referralDiscountPercent === 'number') {
      const normalized = Math.max(0, Math.min(100, Number(parsed.data.referralDiscountPercent)));
      await Settings.findOneAndUpdate(
        { key: REFERRAL_DISCOUNT_SETTING_KEY },
        { key: REFERRAL_DISCOUNT_SETTING_KEY, value: String(normalized), updatedAt: new Date() },
        { upsert: true, returnDocument: 'after' }
      );
      return NextResponse.json({ ok: true, referralDiscountPercent: normalized });
    }

    if (!parsed.data.id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const updates: any = {};
    if (typeof parsed.data.active === 'boolean') updates.active = parsed.data.active;

    const updated = await ReferralProfile.findByIdAndUpdate(parsed.data.id, updates, { returnDocument: 'after' });
    if (!updated) return NextResponse.json({ error: 'Referido no encontrado' }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (String(error?.message || '').includes('Forbidden') || String(error?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al actualizar referido' }, { status: 500 });
  }
}
