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

function buildPostsText(latestPosts: any[], baseUrl: string) {
  if (!Array.isArray(latestPosts) || latestPosts.length === 0) return '';
  return latestPosts
    .map((p: any) => {
      const href = baseUrl && p.slug ? `${baseUrl}/noticias/${p.slug}` : '';
      return `- ${p.title}${href ? `: ${href}` : ''}`;
    })
    .join('\n');
}

function buildPostsHtml(latestPosts: any[], baseUrl: string) {
  if (!Array.isArray(latestPosts) || latestPosts.length === 0) {
    return `
      <div style="padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 14px; background: #ffffff;">
        <div style="font-weight: 800; color:#111827;">Esta semana no hay noticias nuevas</div>
        <div style="margin-top: 4px; color:#6b7280; font-size: 13px;">En cuanto publiquemos algo, te lo mandamos por aquí.</div>
      </div>
    `;
  }

  const items = latestPosts
    .map((p: any) => {
      const href = baseUrl && p.slug ? `${baseUrl}/noticias/${p.slug}` : '';
      const title = safe(p.title, 120);
      const excerpt = safe(p.excerpt || '', 180);

      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 14px; background: #ffffff; padding: 14px 16px; margin: 0 0 12px 0;">
          <div style="font-size: 16px; font-weight: 800; color:#111827;">${
            href ? `<a href="${href}" style="color:#16a34a; text-decoration:none;">${title}</a>` : title
          }</div>
          ${excerpt ? `<div style="margin-top: 6px; color:#6b7280; font-size: 13px;">${excerpt}</div>` : ''}
          ${
            href
              ? `<div style="margin-top: 10px;"><a href="${href}" style="display:inline-block; background:#16a34a; color:#ffffff; text-decoration:none; padding: 8px 12px; border-radius: 10px; font-weight: 800; font-size: 13px;">Leer noticia</a></div>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  return `
    <div style="margin-top: 14px;">
      <div style="font-weight: 900; font-size: 14px; color:#111827; margin: 0 0 10px 0;">Novedades</div>
      ${items}
    </div>
  `;
}

function buildNewsletterHtml(params: {
  siteName: string;
  email: string;
  nowIso: string;
  postsHtml: string;
  unsubscribeUrl: string;
}) {
  const { siteName, email, nowIso, postsHtml, unsubscribeUrl } = params;

  const unsubscribeBlock = unsubscribeUrl
    ? `<p style="margin: 10px 0 0 0; color:#6b7280; font-size: 12px;"><a href="${unsubscribeUrl}" style="color:#6b7280;">Darme de baja</a></p>`
    : '';

  return `
  <div style="margin:0; padding: 0; background:#f8fafc;">
    <div style="max-width: 680px; margin: 0 auto; padding: 22px 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5;">
      <div style="border-radius: 18px; overflow: hidden; border: 1px solid #e5e7eb; background: #ffffff;">
        <div style="padding: 18px 18px 14px 18px; background: linear-gradient(90deg, #16a34a, #22c55e); color: #07110a;">
          <div style="font-size: 12px; opacity: 0.95; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">${siteName}</div>
          <div style="font-size: 22px; font-weight: 900; margin-top: 2px;">Newsletter semanal</div>
          <div style="font-size: 12px; opacity: 0.95; margin-top: 4px;">${nowIso}</div>
        </div>

        <div style="padding: 18px;">
          <div style="color:#374151; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">Hola <b>${email}</b> 👋</p>
            <p style="margin: 0;">Aquí tienes un resumen rápido de lo último en <b>${siteName}</b>.</p>
          </div>

          <div style="margin-top: 14px;">${postsHtml}</div>

          <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color:#6b7280; font-size: 12px;">Recibes este email porque estás suscrito a ${siteName}.</p>
            ${unsubscribeBlock}
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
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

  const postsText = buildPostsText(latestPosts as any[], baseUrl);
  const postsHtml = buildPostsHtml(latestPosts as any[], baseUrl);

  // Send sequentially to avoid SMTP/provider throttling
  let sent = 0;
  for (const sub of subscribers) {
    const to = String((sub as any).email || '').trim();
    if (!to) continue;

    const token = createUnsubscribeToken(to);
    const unsubscribeUrl = baseUrl ? `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}` : '';

    const subject = `${siteName} • Newsletter semanal`;
    const text = [
      `Hola ${to}!`,
      '',
      `Aquí tienes las novedades de ${siteName}.`,
      '',
      postsText || (latestPosts.length ? '' : 'Esta semana no hay noticias nuevas.'),
      '',
      unsubscribeUrl ? `Darte de baja: ${unsubscribeUrl}` : '',
      '',
      `Enviado: ${nowIso}`,
    ]
      .filter(Boolean)
      .join('\n');

    const html = buildNewsletterHtml({ siteName, email: to, nowIso, postsHtml, unsubscribeUrl });

    await sendMail({ to, subject, text, html });
    sent += 1;
  }

  return { sent, subscribers: subscribers.length, nowIso };
}
