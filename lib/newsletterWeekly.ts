import dbConnect from '@/lib/mongodb';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import BlogPost from '@/models/BlogPost';
import { sendMail } from '@/lib/email';
import { createUnsubscribeToken } from '@/lib/newsletterTokens';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeLang, type Lang } from '@/lib/i18n';

function safe(text: string, maxLen: number) {
  const t = String(text || '');
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}

function escapeHtml(input: string) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeHtmlAndBreakAutolink(input: string) {
  // Many email clients auto-link domains/IPs. Adding zero-width spaces usually prevents detection.
  return escapeHtml(input).replace(/\./g, '.&#8203;').replace(/:/g, ':&#8203;');
}

async function getNewsletterIconAttachment() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'icon.png');
    const content = await readFile(filePath);
    return {
      filename: 'icon.png',
      content,
      cid: 'site-icon@999wrld',
      contentType: 'image/png',
    };
  } catch {
    return null;
  }
}

function baseUrlFromEnv() {
  const base = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();
  return base ? base.replace(/\/$/, '') : '';
}

function getServerAddress() {
  const serverHost = String(process.env.NEXT_PUBLIC_MINECRAFT_SERVER_IP || process.env.MINECRAFT_SERVER_IP || 'play.999wrldnetwork.es').trim();
  const serverPortRaw = String(process.env.NEXT_PUBLIC_MINECRAFT_SERVER_PORT || process.env.MINECRAFT_SERVER_PORT || '').trim();
  const serverPort = serverPortRaw ? Number(serverPortRaw) : NaN;

  if (!serverHost) return 'play.999wrldnetwork.es';
  if (Number.isFinite(serverPort) && serverPort !== 25565) return `${serverHost}:${serverPort}`;
  return serverHost;
}

function pickThirdSocial() {
  const twitterUrl = String((process.env.NEXT_PUBLIC_TWITTER_URL as any) || '').trim();
  const xUrl = String((process.env.NEXT_PUBLIC_X_URL as any) || '').trim();
  const tiktokUrl = String(process.env.NEXT_PUBLIC_TIKTOK_URL || '').trim();

  const resolvedTwitter = twitterUrl || xUrl;
  if (resolvedTwitter) return { label: 'Twitter', url: resolvedTwitter };
  if (tiktokUrl) return { label: 'TikTok', url: tiktokUrl };
  return { label: 'Twitter', url: '' };
}

function buildPostsText(latestPosts: any[], baseUrl: string) {
  if (!Array.isArray(latestPosts) || latestPosts.length === 0) return '';
  return latestPosts
    .map((p: any) => {
      const href = baseUrl && p.slug ? `${baseUrl}/noticias/${p.slug}` : '';
      return `- ${String(p.title || '')}${href ? `: ${href}` : ''}`;
    })
    .join('\n');
}

function buildPostsHtml(latestPosts: any[], baseUrl: string) {
  return buildPostsHtmlForLang('es', latestPosts, baseUrl);
}

function buildPostsHtmlForLang(lang: Lang, latestPosts: any[], baseUrl: string) {
  if (!Array.isArray(latestPosts) || latestPosts.length === 0) {
    return `
      <ul style="color:#cccccc; font-size:14px; line-height:22px; margin: 0; padding-left: 18px;">
        <li>✔ ${lang === 'en' ? 'No news this week' : 'Esta semana no hay noticias nuevas'}</li>
      </ul>
    `;
  }

  const items = latestPosts
    .map((p: any) => {
      const href = baseUrl && p.slug ? `${baseUrl}/noticias/${p.slug}` : '';
      const title = escapeHtml(safe(p.title, 120));
      const excerpt = escapeHtml(safe(p.excerpt || '', 140));
      const titleHtml = href ? `<a href="${href}" style="color:#cccccc; text-decoration:none;"><strong>${title}</strong></a>` : `<strong>${title}</strong>`;

      return `
        <li style="margin-bottom: 10px;">
          ✔ ${titleHtml}${excerpt ? `<div style="margin-top: 2px; color:#9a9a9a; font-size: 12px; line-height: 18px;">${excerpt}</div>` : ''}
        </li>
      `;
    })
    .join('');

  return `
    <ul style="color:#cccccc; font-size:14px; line-height:22px; margin: 0; padding-left: 18px;">
      ${items}
    </ul>
  `;
}

function copyForNewsletter(lang: Lang) {
  if (lang === 'en') {
    return {
      headerSubtitle: 'The best Minecraft experience starts here',
      newsTitle: '🚀 Server Updates!',
      helloLine: 'Hello',
      newsIntroA: 'We have new updates and improvements in',
      newsIntroB: "Here's what's new:",
      eventTitle: '🏆 Special Event',
      eventBody: 'Join our featured event and win exclusive rewards, temporary ranks, and surprise prizes.',
      eventCta: 'Join now',
      shopTitle: '🛒 Visit our Store',
      shopBody: 'Support the server with ranks, kits, and exclusive perks. Your support helps us grow ❤️',
      shopCta: 'Go to the Store',
      ipLabel: '🎮 SERVER IP:',
      socials: 'Follow us on our socials',
      unsubscribeLead: "If you don't want to receive more emails,",
      unsubscribeCta: 'click here',
      rights: 'All rights reserved',
      subject: (siteName: string) => `${siteName} • Weekly newsletter`,
      textIntro: (siteName: string) => `Here are the latest updates from ${siteName}.`,
      textNoNews: 'No news this week.',
      textUnsub: 'Unsubscribe:',
      textSent: 'Sent:',
    };
  }

  return {
    headerSubtitle: 'La mejor experiencia Minecraft empieza aquí',
    newsTitle: '🚀 ¡Novedades del Servidor!',
    helloLine: 'Hola',
    newsIntroA: 'Tenemos nuevas actualizaciones y mejoras en',
    newsIntroB: 'Aquí te contamos lo nuevo:',
    eventTitle: '🏆 Evento Especial del Mes',
    eventBody: 'Participa en nuestro evento destacado y gana recompensas exclusivas, rangos temporales y premios sorpresa.',
    eventCta: 'Participar Ahora',
    shopTitle: '🛒 Visita Nuestra Tienda',
    shopBody: 'Apoya el servidor adquiriendo rangos, kits y beneficios exclusivos. Tu apoyo nos ayuda a seguir creciendo ❤️',
    shopCta: 'Ir a la Tienda',
    ipLabel: '🎮 IP DEL SERVIDOR:',
    socials: 'Síguenos en nuestras redes',
    unsubscribeLead: 'Si no deseas recibir más correos,',
    unsubscribeCta: 'haz clic aquí',
    rights: 'Todos los derechos reservados',
    subject: (siteName: string) => `${siteName} • Newsletter semanal`,
    textIntro: (siteName: string) => `Aquí tienes las novedades de ${siteName}.`,
    textNoNews: 'Esta semana no hay noticias nuevas.',
    textUnsub: 'Darte de baja:',
    textSent: 'Enviado:',
  };
}

function buildNewsletterHtml(params: {
  lang: Lang;
  siteName: string;
  email: string;
  nowIso: string;
  newsListHtml: string;
  bannerUrl: string;
  eventUrl: string;
  shopUrl: string;
  serverAddress: string;
  discordUrl: string;
  youtubeUrl: string;
  thirdSocialLabel: string;
  thirdSocialUrl: string;
  unsubscribeUrl: string;
}) {
  const {
    lang,
    siteName,
    email,
    nowIso,
    newsListHtml,
    bannerUrl,
    eventUrl,
    shopUrl,
    serverAddress,
    discordUrl,
    youtubeUrl,
    thirdSocialLabel,
    thirdSocialUrl,
    unsubscribeUrl,
  } = params;

  const safeSiteName = escapeHtml(siteName);
  const safeEmail = escapeHtml(email);
  const safeServerAddress = escapeHtmlAndBreakAutolink(serverAddress);
  const c = copyForNewsletter(lang);

  const resolvedEventUrl = eventUrl || shopUrl;
  const resolvedShopUrl = shopUrl || resolvedEventUrl;
  const resolvedBannerUrl = bannerUrl || '';

  const resolvedDiscordUrl = discordUrl || '';
  const resolvedYoutubeUrl = youtubeUrl || '';
  const resolvedThirdUrl = thirdSocialUrl || '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSiteName} Newsletter</title>
</head>

<body style="margin:0; padding:0; background-color:#0e0e0e; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0e0e0e">
    <tr>
      <td align="center">

        <!-- CONTENEDOR PRINCIPAL -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#1a1a1a" style="margin:20px 0; border-radius:8px; overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td align="center" bgcolor="#6a00ff" style="padding:30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin:0 auto;">
                <tr>
                  ${
                    resolvedBannerUrl
                      ? `
                        <td style="padding-right:12px; vertical-align:middle;">
                          <img
                            src="${resolvedBannerUrl}"
                            width="40"
                            height="40"
                            style="display:block; width:40px; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,0.25); background:#1a1a1a;"
                            alt="${safeSiteName} Icon"
                          />
                        </td>
                      `.trim()
                      : ''
                  }
                  <td style="vertical-align:middle;">
                    <h1 style="color:#ffffff; margin:0; font-size:28px; letter-spacing:1px;">🔥 ${safeSiteName}</h1>
                  </td>
                </tr>
              </table>
              <p style="color:#e0e0e0; margin-top:10px; font-size:14px;">${escapeHtml(c.headerSubtitle)}</p>
              <p style="color:#e0e0e0; margin:10px 0 0 0; font-size:12px; opacity:0.9;">${escapeHtml(nowIso)}</p>
            </td>
          </tr>

          <!-- MENSAJE PRINCIPAL -->
          <tr>
            <td style="padding:30px; color:#ffffff;">
              <h2 style="color:#6a00ff; margin-top:0;">${escapeHtml(c.newsTitle)}</h2>

              <p style="font-size:14px; line-height:22px; color:#cccccc;">
                ${escapeHtml(c.helloLine)} <strong>${safeEmail}</strong> 👋<br />
                ${escapeHtml(c.newsIntroA)} <strong>${safeSiteName}</strong>.<br />
                ${escapeHtml(c.newsIntroB)}
              </p>

              ${newsListHtml}
            </td>
          </tr>

          <!-- BLOQUE DESTACADO -->
          <tr>
            <td bgcolor="#121212" style="padding:25px;">
              <h3 style="color:#ffffff; margin-top:0;">${escapeHtml(c.eventTitle)}</h3>

              <p style="color:#bbbbbb; font-size:14px; line-height:22px;">
                ${escapeHtml(c.eventBody)}
              </p>

              <div style="text-align:center; margin-top:20px;">
                <a href="${resolvedEventUrl || '#'}" style="background-color:#6a00ff; color:#ffffff; padding:12px 25px; text-decoration:none; border-radius:4px; font-weight:bold;">
                  ${escapeHtml(c.eventCta)}
                </a>
              </div>
            </td>
          </tr>

          <!-- TIENDA -->
          <tr>
            <td style="padding:30px;">
              <h2 style="color:#6a00ff;">${escapeHtml(c.shopTitle)}</h2>

              <p style="color:#cccccc; font-size:14px; line-height:22px;">
                ${escapeHtml(c.shopBody)}
              </p>

              <div style="text-align:center; margin-top:20px;">
                <a href="${resolvedShopUrl || '#'}" style="background-color:#ffffff; color:#6a00ff; padding:12px 25px; text-decoration:none; border-radius:4px; font-weight:bold;">
                  ${escapeHtml(c.shopCta)}
                </a>
              </div>
            </td>
          </tr>

          <!-- IP DEL SERVIDOR -->
          <tr>
            <td bgcolor="#6a00ff" style="padding:20px; text-align:center;">
              <p style="color:#ffffff; font-size:16px; margin:0;">${escapeHtml(c.ipLabel)}</p>
              <p style="color:#ffffff; font-size:20px; font-weight:bold; margin:5px 0 0 0; text-decoration:none;">${safeServerAddress}</p>
            </td>
          </tr>

          <!-- REDES SOCIALES -->
          <tr>
            <td style="padding:25px; text-align:center;">

              <p style="color:#999999; font-size:13px;">${escapeHtml(c.socials)}</p>

              <a href="${resolvedDiscordUrl || '#'}" style="color:#6a00ff; text-decoration:none; margin:0 10px;">Discord</a>
              <a href="${resolvedYoutubeUrl || '#'}" style="color:#6a00ff; text-decoration:none; margin:0 10px;">YouTube</a>
              <a href="${resolvedThirdUrl || '#'}" style="color:#6a00ff; text-decoration:none; margin:0 10px;">${escapeHtml(thirdSocialLabel || 'Twitter')}</a>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td bgcolor="#111111" style="padding:20px; text-align:center;">
              <p style="color:#666666; font-size:12px; margin:0;">© 2026 ${safeSiteName} - ${escapeHtml(c.rights)}</p>

              <p style="color:#666666; font-size:12px; margin-top:8px;">
                ${escapeHtml(c.unsubscribeLead)}
                <a href="${unsubscribeUrl || '#'}" style="color:#6a00ff; text-decoration:none;">${escapeHtml(c.unsubscribeCta)}</a>.
              </p>
            </td>
          </tr>

        </table>
        <!-- FIN CONTENEDOR -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export async function sendWeeklyNewsletter() {
  await dbConnect();

  const siteName = String(process.env.SITE_NAME || '999Wrld Network').trim();
  const baseUrl = baseUrlFromEnv();
  const serverAddress = getServerAddress();

  const iconAttachment = await getNewsletterIconAttachment();
  const bannerUrl = iconAttachment ? `cid:${iconAttachment.cid}` : (baseUrl ? `${baseUrl}/icon.png` : '');

  const eventUrl = String(process.env.NEWSLETTER_EVENT_URL || '').trim() || (baseUrl ? `${baseUrl}/noticias` : '');
  const shopUrl = baseUrl ? `${baseUrl}/tienda` : '';

  const discordUrl = String(process.env.NEXT_PUBLIC_DISCORD_URL || '').trim();
  const youtubeUrl = String(process.env.NEXT_PUBLIC_YOUTUBE_URL || '').trim();
  const third = pickThirdSocial();

  const subscribers = await NewsletterSubscriber.find({ unsubscribedAt: null }).select('email lang').lean();

  const latestPosts = await BlogPost.find({ isPublished: true })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(3)
    .select('title slug excerpt publishedAt')
    .lean();

  const nowIso = new Date().toISOString();

  const postsText = buildPostsText(latestPosts as any[], baseUrl);

  // Send sequentially to avoid SMTP/provider throttling
  let sent = 0;
  for (const sub of subscribers) {
    const to = String((sub as any).email || '').trim();
    if (!to) continue;

    const subLang = normalizeLang(String((sub as any).lang || ''));
    const c = copyForNewsletter(subLang);
    const newsListHtml = buildPostsHtmlForLang(subLang, latestPosts as any[], baseUrl);

    const token = createUnsubscribeToken(to);
    const unsubscribeUrl = baseUrl ? `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}` : '';

    const subject = c.subject(siteName);
    const text = [
      subLang === 'en' ? `Hello ${to}!` : `Hola ${to}!`,
      '',
      c.textIntro(siteName),
      '',
      postsText || (latestPosts.length ? '' : c.textNoNews),
      '',
      unsubscribeUrl ? `${c.textUnsub} ${unsubscribeUrl}` : '',
      '',
      `${c.textSent} ${nowIso}`,
    ]
      .filter(Boolean)
      .join('\n');

    const html = buildNewsletterHtml({
      lang: subLang,
      siteName,
      email: to,
      nowIso,
      newsListHtml,
      bannerUrl,
      eventUrl,
      shopUrl,
      serverAddress,
      discordUrl,
      youtubeUrl,
      thirdSocialLabel: third.label,
      thirdSocialUrl: third.url,
      unsubscribeUrl,
    });

    await sendMail({ to, subject, text, html, attachments: iconAttachment ? [iconAttachment] : undefined });
    sent += 1;
  }

  return { sent, subscribers: subscribers.length, nowIso };
}
