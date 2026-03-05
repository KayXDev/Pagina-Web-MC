type CouponWebhookInput = {
  webhookUrl: string;
  siteName: string;
  siteUrl?: string;
  orderId: string;
  couponCode: string;
  discountAmount: number;
  totalPrice: number;
  currency: string;
  buyerLabel: string;
  isTest?: boolean;
};

type ReferralWebhookInput = {
  webhookUrl: string;
  siteName: string;
  siteUrl?: string;
  orderId: string;
  referralCode: string;
  buyerDiscountAmount: number;
  rewardAmount: number;
  currency: string;
  referrerLabel: string;
  referredLabel: string;
  isTest?: boolean;
};

function isDiscordWebhookUrl(url: string) {
  return /^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\//.test(url);
}

async function sendDiscordWebhook(webhookUrl: string, payload: Record<string, unknown>) {
  const url = String(webhookUrl || '').trim();
  if (!url) throw new Error('Discord webhook not configured');
  if (!isDiscordWebhookUrl(url)) throw new Error('Invalid Discord webhook URL');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord webhook ${res.status}: ${text || res.statusText}`);
  }
}

function money(amount: number, currency: string) {
  return `${Number(amount || 0).toFixed(2)} ${String(currency || 'EUR').toUpperCase()}`;
}

export async function sendCouponUsedWebhook(input: CouponWebhookInput) {
  const adminUrl = input.siteUrl ? `${String(input.siteUrl).replace(/\/$/, '')}/admin/coupons` : '';

  const description = [
    input.isTest
      ? '**This is a test coupon-notification embed from Admin Panel.**'
      : '**A coupon has been used successfully on checkout.**',
    '',
    `> **Coupon:** \`${String(input.couponCode || '-')}\``,
    `> **Order ID:** \`${String(input.orderId || '-')}\``,
    `> **Discount Applied:** **${money(input.discountAmount, input.currency)}**`,
    `> **Order Total:** **${money(input.totalPrice, input.currency)}**`,
    '',
    '**Buyer Snapshot**',
    `> ${String(input.buyerLabel || 'Unknown buyer')}`,
  ]
    .join('\n')
    .slice(0, 4096);

  await sendDiscordWebhook(input.webhookUrl, {
    username: `${input.siteName} Coupons`,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: input.isTest ? 'Coupon Webhook Test' : 'Coupon Used',
        url: adminUrl || undefined,
        color: 0x22c55e,
        description,
        timestamp: new Date().toISOString(),
        footer: { text: `${input.siteName} | Discounts` },
        fields: [
          { name: 'Code', value: `\`${String(input.couponCode || '-')}\``, inline: true },
          { name: 'Discount', value: `**${money(input.discountAmount, input.currency)}**`, inline: true },
          { name: 'Total', value: `**${money(input.totalPrice, input.currency)}**`, inline: true },
          {
            name: 'Quick Action',
            value: adminUrl ? `[Open Coupons Admin](${adminUrl})` : 'Admin URL not configured.',
            inline: false,
          },
        ],
      },
    ],
  });
}

export async function sendReferralRewardWebhook(input: ReferralWebhookInput) {
  const adminUrl = input.siteUrl ? `${String(input.siteUrl).replace(/\/$/, '')}/admin/referrals` : '';

  const description = [
    input.isTest
      ? '**This is a test referral-notification embed from Admin Panel.**'
      : '**A referral reward event has been applied successfully.**',
    '',
    `> **Referral Code:** \`${String(input.referralCode || '-')}\``,
    `> **Order ID:** \`${String(input.orderId || '-')}\``,
    `> **Buyer Discount:** **${money(input.buyerDiscountAmount, input.currency)}**`,
    `> **Referrer Reward:** **${Number(input.rewardAmount || 0).toFixed(2)} balance**`,
    '',
    '**Participants**',
    `> **Referrer:** ${String(input.referrerLabel || '-')}`,
    `> **Referred:** ${String(input.referredLabel || '-')}`,
  ]
    .join('\n')
    .slice(0, 4096);

  await sendDiscordWebhook(input.webhookUrl, {
    username: `${input.siteName} Referrals`,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: input.isTest ? 'Referral Webhook Test' : 'Referral Reward Applied',
        url: adminUrl || undefined,
        color: 0x3b82f6,
        description,
        timestamp: new Date().toISOString(),
        footer: { text: `${input.siteName} | Referrals` },
        fields: [
          { name: 'Code', value: `\`${String(input.referralCode || '-')}\``, inline: true },
          { name: 'Buyer Discount', value: `**${money(input.buyerDiscountAmount, input.currency)}**`, inline: true },
          { name: 'Reward', value: `**${Number(input.rewardAmount || 0).toFixed(2)} balance**`, inline: true },
          {
            name: 'Quick Action',
            value: adminUrl ? `[Open Referrals Admin](${adminUrl})` : 'Admin URL not configured.',
            inline: false,
          },
        ],
      },
    ],
  });
}
