import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import PartnerAd from '@/models/PartnerAd';
import { PARTNER_SLOTS, PARTNER_VIP_SLOT } from '@/lib/partnerPricing';

const SETTINGS_KEY = 'partnerSlotOverrides';

export type PartnerSlotOverrides = {
  // slots[0] => slot #1; value is PartnerAd _id or '' for automatic
  slots: string[];

  // VIP pinned slot (slot=0). PartnerAd _id or '' for automatic
  vipAdId: string;
};

function normalize(raw: any): PartnerSlotOverrides {
  const rawSlots = raw?.slots;
  const slots = Array.isArray(rawSlots) ? rawSlots : [];
  const out = Array.from({ length: PARTNER_SLOTS }, (_, i) => {
    const v = String(slots[i] ?? '').trim();
    return v;
  });

  const vipAdId = String(raw?.vipAdId ?? '').trim();
  return { slots: out, vipAdId };
}

export async function getPartnerSlotOverrides(): Promise<PartnerSlotOverrides> {
  await dbConnect();
  const row = await Settings.findOne({ key: SETTINGS_KEY }).select('value').lean();
  if (!row?.value) return { slots: Array(PARTNER_SLOTS).fill(''), vipAdId: '' };
  try {
    const parsed = JSON.parse(String((row as any).value || ''));
    return normalize(parsed);
  } catch {
    return { slots: Array(PARTNER_SLOTS).fill(''), vipAdId: '' };
  }
}

export async function setPartnerSlotOverrides(next: PartnerSlotOverrides): Promise<PartnerSlotOverrides> {
  await dbConnect();
  const normalized = normalize(next);
  await Settings.updateOne(
    { key: SETTINGS_KEY },
    {
      $set: {
        key: SETTINGS_KEY,
        value: JSON.stringify(normalized),
        description: 'Partner slot overrides (manual OWNER placement)',
      },
    },
    { upsert: true }
  );
  return normalized;
}

export async function validatePartnerOverrideAdIds(slots: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = Array.from(new Set(slots.map((s) => String(s || '').trim()).filter(Boolean)));
  if (!ids.length) return { ok: true };

  const found = await PartnerAd.find({ _id: { $in: ids }, status: 'APPROVED' }).select('_id').lean();
  const foundSet = new Set(found.map((a: any) => String(a._id)));

  for (const id of ids) {
    if (!foundSet.has(String(id))) {
      return { ok: false, error: 'Uno o más anuncios no existen o no están aprobados.' };
    }
  }
  return { ok: true };
}

export async function validatePartnerVipOverrideAdId(vipAdId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = String(vipAdId || '').trim();
  if (!id) return { ok: true };
  const found = await PartnerAd.findOne({ _id: id, status: 'APPROVED' }).select('_id').lean();
  if (!found) return { ok: false, error: 'El anuncio para VIP no existe o no está aprobado.' };
  return { ok: true };
}

export function isVipOverrideEnabled(overrides: PartnerSlotOverrides): boolean {
  return Number(PARTNER_VIP_SLOT) === 0 && Boolean(String(overrides?.vipAdId || '').trim());
}
