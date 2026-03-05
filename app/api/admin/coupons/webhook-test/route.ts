import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';
import { sendCouponUsedWebhook } from '@/lib/shopIncentivesDiscord';

const COUPON_WEBHOOK_KEY = 'shop_coupon_discord_webhook';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));

    await dbConnect();

    const setting = await Settings.findOne({ key: COUPON_WEBHOOK_KEY }).lean();
    const webhookUrl = String(setting?.value || '').trim();
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Coupon webhook is not configured' }, { status: 400 });
    }

    const couponCode = String((body as any)?.couponCode || 'WELCOME10').trim().toUpperCase();

    const siteName = String(process.env.SITE_NAME || '999Wrld Network').trim();
    const siteUrl = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();

    await sendCouponUsedWebhook({
      webhookUrl,
      siteName,
      siteUrl,
      orderId: `test-${Date.now()}`,
      couponCode,
      discountAmount: 7.5,
      totalPrice: 22.49,
      currency: String(process.env.SHOP_CURRENCY || 'EUR').toUpperCase(),
      buyerLabel: `**${admin.name}** (\`${admin.email || 'admin@example.com'}\`)`,
      isTest: true,
    });

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'SEND_COUPON_WEBHOOK_TEST',
      targetType: 'DISCORD',
      targetId: COUPON_WEBHOOK_KEY,
      meta: {
        couponCode,
        path: '/api/admin/coupons/webhook-test',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true, couponCode });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Coupon webhook test error:', error);
    return NextResponse.json({ error: error?.message || 'Error sending coupon test webhook' }, { status: 500 });
  }
}
