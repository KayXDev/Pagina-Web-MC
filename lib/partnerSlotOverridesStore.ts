import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import PartnerAd from '@/models/PartnerAd';
import { PARTNER_SLOTS } from '@/lib/partnerPricing';

const SETTINGS_KEY = 'partnerSlotOverrides';

export type PartnerSlotOverrides = {
  // slots[0] => slot #1; value is PartnerAd _id or '' for automatic
  slots: string[];
};

function normalize(raw: any): PartnerSlotOverrides {
  const rawSlots = raw?.slots;
  const slots = Array.isArray(rawSlots) ? rawSlots : [];
  const out = Array.from({ length: PARTNER_SLOTS }, (_, i) => {
    const v = String(slots[i] ?? '').trim();
    return v;
  });
  return { slots: out };
}

export async function getPartnerSlotOverrides(): Promise<PartnerSlotOverrides> {
  await dbConnect();
  const row = await Settings.findOne({ key: SETTINGS_KEY }).select('value').lean();
  if (!row?.value) return { slots: Array(PARTNER_SLOTS).fill('') };
  try {
    const parsed = JSON.parse(String((row as any).value || ''));
    return normalize(parsed);
  } catch {
    return { slots: Array(PARTNER_SLOTS).fill('') };
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
