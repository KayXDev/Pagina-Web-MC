import dbConnect from '@/lib/mongodb';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import BlogPost from '@/models/BlogPost';
import Settings from '@/models/Settings';
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

const DEFAULT_SUBJECT_TEMPLATE = '{{siteName}} • Weekly newsletter';

const DEFAULT_TEXT_TEMPLATE = `Hello {{email}}!

Here is your weekly update from {{siteName}}.

{{postsText}}

Unsubscribe: {{unsubscribeUrl}}

Sent at {{nowIso}}`;

const DEFAULT_HTML_TEMPLATE = `
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5; color: #111827;">
  <div style="max-width: 640px; margin: 0 auto; padding: 18px;">
    <div style="border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background: #ffffff;">
      <div style="padding: 18px 18px 14px 18px; background: linear-gradient(90deg, #16a34a, #22c55e); color: #0b1220;">
        <div style="font-size: 12px; opacity: 0.9;">{{siteName}}</div>
        <div style="font-size: 20px; font-weight: 800;">Weekly update</div>
        <div style="font-size: 12px; opacity: 0.9;">{{nowIso}}</div>
      </div>

      <div style="padding: 18px;">
        <p style="margin: 0 0 12px 0; color:#374151;">Hey <b>{{email}}</b> — here are the latest updates.</p>

        {{postsHtml}}

        <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color:#6b7280; font-size: 12px;">You received this email because you subscribed to {{siteName}}.</p>
          <p style="margin: 8px 0 0 0; color:#6b7280; font-size: 12px;"><a href="{{unsubscribeUrl}}" style="color:#6b7280;">Unsubscribe</a></p>
        </div>
      </div>
    </div>
  </div>
</div>
`;

function renderTemplate(template: string, vars: Record<string, string>) {
  return String(template || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const v = vars[key];
    return typeof v === 'string' ? v : '';
  });
}

async function getNewsletterTemplates() {
  const keys = ['newsletter_subject_template', 'newsletter_html_template', 'newsletter_text_template'];
  const rows = await Settings.find({ key: { $in: keys } }).select('key value').lean();
  const map: Record<string, string> = {};
  for (const r of rows as any[]) map[String(r.key)] = String(r.value ?? '');

  const subjectTemplate = map.newsletter_subject_template?.trim() || DEFAULT_SUBJECT_TEMPLATE;
  const htmlTemplate = map.newsletter_html_template?.trim() || DEFAULT_HTML_TEMPLATE;
  const textTemplate = map.newsletter_text_template?.trim() || DEFAULT_TEXT_TEMPLATE;

  return { subjectTemplate, htmlTemplate, textTemplate };
}

export async function sendWeeklyNewsletter() {
  await dbConnect();

  const siteName = String(process.env.SITE_NAME || '999Wrld Network').trim();
  const baseUrl = baseUrlFromEnv();

  const templates = await getNewsletterTemplates();

  const subscribers = await NewsletterSubscriber.find({ unsubscribedAt: null }).select('email').lean();

  const latestPosts = await BlogPost.find({ isPublished: true })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(3)
    .select('title slug excerpt publishedAt')
    .lean();

  const nowIso = new Date().toISOString();
  const globalVars = {
    siteName,
    baseUrl,
    nowIso,
  };

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

    const vars = {
      ...globalVars,
      email: to,
      postsText: postsText || '',
      postsHtml: postsHtml || '',
      unsubscribeUrl,
    };

    const subject = renderTemplate(templates.subjectTemplate, vars).trim() || `${siteName} • Weekly newsletter`;
    const text = renderTemplate(templates.textTemplate, vars).trim();
    const html = renderTemplate(templates.htmlTemplate, vars);

    await sendMail({ to, subject, text, html });
    sent += 1;
  }

  return { sent, subscribers: subscribers.length, nowIso };
}
