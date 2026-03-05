import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import AdminLog from '@/models/AdminLog';
import { sendReferralRewardWebhook } from '@/lib/shopIncentivesDiscord';

const REFERRAL_WEBHOOK_KEY = 'shop_referral_discord_webhook';

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

    const setting = await Settings.findOne({ key: REFERRAL_WEBHOOK_KEY }).lean();
    const webhookUrl = String(setting?.value || '').trim();
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Referral webhook is not configured' }, { status: 400 });
    }

    const referralCode = String((body as any)?.referralCode || 'PLAYER-AB12C').trim().toUpperCase();

    const siteName = String(process.env.SITE_NAME || '999Wrld Network').trim();
    const siteUrl = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();

    await sendReferralRewardWebhook({
      webhookUrl,
      siteName,
      siteUrl,
      orderId: `test-${Date.now()}`,
      referralCode,
      buyerDiscountAmount: 3.25,
      rewardAmount: 2,
      currency: String(process.env.SHOP_CURRENCY || 'EUR').toUpperCase(),
      referrerLabel: `**${admin.name}** (\`${admin.email || 'admin@example.com'}\`)`,
      referredLabel: '**NewPlayer123** (`newplayer@example.com`)',
      isTest: true,
    });

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'SEND_REFERRAL_WEBHOOK_TEST',
      targetType: 'DISCORD',
      targetId: REFERRAL_WEBHOOK_KEY,
      meta: {
        referralCode,
        path: '/api/admin/referrals/webhook-test',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ success: true, referralCode });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Referral webhook test error:', error);
    return NextResponse.json({ error: error?.message || 'Error sending referral test webhook' }, { status: 500 });
  }
}
