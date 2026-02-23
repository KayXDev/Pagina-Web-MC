import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/session';
import AdminLog from '@/models/AdminLog';
import { PARTNER_MAX_DAYS, PARTNER_SLOTS, type PartnerPricingConfig } from '@/lib/partnerPricing';
import { getPartnerPricingConfig, setPartnerPricingConfig } from '@/lib/partnerPricingStore';

export const dynamic = 'force-dynamic';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

const patchSchema = z.object({
  // EUR totals; allow 0
  slotTotalsEur: z.array(z.array(z.coerce.number().min(0)).length(PARTNER_MAX_DAYS)).length(PARTNER_SLOTS),
});

export async function GET() {
  try {
    await requireAdmin();
    const config = await getPartnerPricingConfig();
    return NextResponse.json({ config });
  } catch (error: any) {
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    const next: PartnerPricingConfig = {
      slotTotalsEur: parsed.data.slotTotalsEur.map((row) =>
        row.map((n) => Math.max(0, Math.round(Number(n) * 100) / 100))
      ),
    };

    await setPartnerPricingConfig(next);

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'UPDATE_PARTNER_PRICING',
      targetType: 'SETTINGS',
      targetId: 'partnerPricing',
      details: JSON.stringify({
        slotTotalsEur: next.slotTotalsEur,
      }),
      meta: {
        path: '/api/admin/partner/pricing',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ ok: true, config: next });
  } catch (error: any) {
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
