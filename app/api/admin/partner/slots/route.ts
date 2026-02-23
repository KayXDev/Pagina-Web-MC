import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner } from '@/lib/session';
import AdminLog from '@/models/AdminLog';
import { PARTNER_SLOTS } from '@/lib/partnerPricing';
import {
  getPartnerSlotOverrides,
  setPartnerSlotOverrides,
  validatePartnerOverrideAdIds,
} from '@/lib/partnerSlotOverridesStore';

export const dynamic = 'force-dynamic';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

const patchSchema = z.object({
  slots: z.array(z.union([z.string(), z.null(), z.undefined()])).length(PARTNER_SLOTS),
});

export async function GET() {
  try {
    await requireOwner();
    const overrides = await getPartnerSlotOverrides();
    return NextResponse.json({ overrides });
  } catch (error: any) {
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const owner = await requireOwner();
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    const slots = parsed.data.slots.map((v) => String(v ?? '').trim());

    const valid = await validatePartnerOverrideAdIds(slots);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

    const saved = await setPartnerSlotOverrides({ slots });

    await AdminLog.create({
      adminId: owner.id,
      adminUsername: owner.name,
      action: 'UPDATE_PARTNER_SLOT_OVERRIDES',
      targetType: 'SETTINGS',
      targetId: 'partnerSlotOverrides',
      details: JSON.stringify(saved),
      meta: {
        path: '/api/admin/partner/slots',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ ok: true, overrides: saved });
  } catch (error: any) {
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
