import dbConnect from '@/lib/mongodb';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import BlogPost from '@/models/BlogPost';
import { sendMail } from '@/lib/email';
import { createUnsubscribeToken } from '@/lib/newsletterTokens';

function safe(text: string, maxLen: number) {
  const t = String(text || '');
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}

function baseUrlFromEnv() {
  const base = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();
  return base ? base.replace(/\/$/, '') : '';
}

export async function sendWeeklyNewsletter() {
  await dbConnect();

  const siteName = String(process.env.SITE_NAME || '999Wrld Network').trim();
  const baseUrl = baseUrlFromEnv();

  const subscribers = await NewsletterSubscriber.find({ unsubscribedAt: null }).select('email').lean();

  const latestPosts = await BlogPost.find({ isPublished: true })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(3)
    .select('title slug excerpt publishedAt')
    .lean();

  const nowIso = new Date().toISOString();
  const subject = `${siteName} • Weekly newsletter`;

  let postsText = '';
  let postsHtml = '';

  if (latestPosts.length > 0) {
    postsText = latestPosts
      .map((p: any) => `- ${p.title}${baseUrl && p.slug ? `: ${baseUrl}/noticias/${p.slug}` : ''}`)
      .join('\n');

    postsHtml = `
      <div style="margin: 16px 0 0 0;">
        <h3 style="margin: 0 0 8px 0;">Latest news</h3>
        <ul style="margin: 0; padding-left: 18px;">
          ${latestPosts
            .map((p: any) => {
              const href = baseUrl && p.slug ? `${baseUrl}/noticias/${p.slug}` : '';
              const title = safe(p.title, 120);
              const excerpt = safe(p.excerpt || '', 180);
              return `
                <li style="margin: 0 0 10px 0;">
                  ${href ? `<a href="${href}" style="color:#22c55e; text-decoration:none; font-weight:700;">${title}</a>` : `<b>${title}</b>`}
                  ${excerpt ? `<div style="color:#6b7280; font-size: 12px; margin-top: 2px;">${excerpt}</div>` : ''}
                </li>
              `;
            })
            .join('')}
        </ul>
      </div>
    `;
  }

  // Send sequentially to avoid SMTP/provider throttling
  let sent = 0;
  for (const sub of subscribers) {
    const to = String((sub as any).email || '').trim();
    if (!to) continue;

    const token = createUnsubscribeToken(to);
    const unsubscribeUrl = baseUrl ? `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}` : '';

    const text = `Hello!\n\nHere is your weekly update from ${siteName}.\n\n${postsText || ''}\n\n${unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : ''}`.trim();

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px 0;">Weekly update</h2>
        <p style="margin: 0 0 12px 0; color:#374151;">Your weekly update from <b>${siteName}</b>.</p>
        ${postsHtml}
        <p style="margin: 18px 0 0 0; color:#6b7280; font-size: 12px;">Sent at ${nowIso}</p>
        ${unsubscribeUrl ? `<p style="margin: 12px 0 0 0; color:#6b7280; font-size: 12px;"><a href="${unsubscribeUrl}" style="color:#6b7280;">Unsubscribe</a></p>` : ''}
      </div>
    `;

    await sendMail({ to, subject, text, html });
    sent += 1;
  }

  return { sent, subscribers: subscribers.length, nowIso };
}
