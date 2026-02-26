import dbConnect from '@/lib/mongodb';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import BlogPost from '@/models/BlogPost';
import { sendMail } from '@/lib/email';
import { createUnsubscribeToken } from '@/lib/newsletterTokens';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

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
  if (!Array.isArray(latestPosts) || latestPosts.length === 0) {
    return `
      <ul style="color:#cccccc; font-size:14px; line-height:22px; margin: 0; padding-left: 18px;">
        <li>✔ Esta semana no hay noticias nuevas</li>
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

function buildNewsletterHtml(params: {
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

  const resolvedEventUrl = eventUrl || shopUrl;
  const resolvedShopUrl = shopUrl || resolvedEventUrl;
  const resolvedBannerUrl = bannerUrl || '';

  const resolvedDiscordUrl = discordUrl || '';
  const resolvedYoutubeUrl = youtubeUrl || '';
  const resolvedThirdUrl = thirdSocialUrl || '';

  return `<!DOCTYPE html>
<html lang="es">
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
              <h1 style="color:#ffffff; margin:0; font-size:28px; letter-spacing:1px;">🔥 ${safeSiteName}</h1>
              <p style="color:#e0e0e0; margin-top:10px; font-size:14px;">La mejor experiencia Minecraft empieza aquí</p>
              <p style="color:#e0e0e0; margin:10px 0 0 0; font-size:12px; opacity:0.9;">${escapeHtml(nowIso)}</p>
            </td>
          </tr>

          <!-- HERO -->
          <tr>
            <td align="center">
              ${
                resolvedBannerUrl
                  ? `
                    <div style="padding: 22px; background-color:#0f0f0f;">
                      <img
                        src="${resolvedBannerUrl}"
                        width="120"
                        height="120"
                        style="display:block; width:120px; height:120px; border-radius:18px; border:1px solid #2a2a2a; background:#1a1a1a;"
                        alt="${safeSiteName} Icon"
                      />
                    </div>
                  `.trim()
                  : ''
              }
            </td>
          </tr>

          <!-- MENSAJE PRINCIPAL -->
          <tr>
            <td style="padding:30px; color:#ffffff;">
              <h2 style="color:#6a00ff; margin-top:0;">🚀 ¡Novedades del Servidor!</h2>

              <p style="font-size:14px; line-height:22px; color:#cccccc;">
                Hola <strong>${safeEmail}</strong> 👋<br />
                Tenemos nuevas actualizaciones y mejoras en <strong>${safeSiteName}</strong>.
                Aquí te contamos lo nuevo:
              </p>

              ${newsListHtml}
            </td>
          </tr>

          <!-- BLOQUE DESTACADO -->
          <tr>
            <td bgcolor="#121212" style="padding:25px;">
              <h3 style="color:#ffffff; margin-top:0;">🏆 Evento Especial del Mes</h3>

              <p style="color:#bbbbbb; font-size:14px; line-height:22px;">
                Participa en nuestro gran evento mensual y gana recompensas exclusivas,
                rangos temporales y premios sorpresa.
              </p>

              <div style="text-align:center; margin-top:20px;">
                <a href="${resolvedEventUrl || '#'}" style="background-color:#6a00ff; color:#ffffff; padding:12px 25px; text-decoration:none; border-radius:4px; font-weight:bold;">
                  Participar Ahora
                </a>
              </div>
            </td>
          </tr>

          <!-- TIENDA -->
          <tr>
            <td style="padding:30px;">
              <h2 style="color:#6a00ff;">🛒 Visita Nuestra Tienda</h2>

              <p style="color:#cccccc; font-size:14px; line-height:22px;">
                Apoya el servidor adquiriendo rangos, kits y beneficios exclusivos.
                Tu apoyo nos ayuda a seguir creciendo ❤️
              </p>

              <div style="text-align:center; margin-top:20px;">
                <a href="${resolvedShopUrl || '#'}" style="background-color:#ffffff; color:#6a00ff; padding:12px 25px; text-decoration:none; border-radius:4px; font-weight:bold;">
                  Ir a la Tienda
                </a>
              </div>
            </td>
          </tr>

          <!-- IP DEL SERVIDOR -->
          <tr>
            <td bgcolor="#6a00ff" style="padding:20px; text-align:center;">
              <p style="color:#ffffff; font-size:16px; margin:0;">🎮 IP DEL SERVIDOR:</p>
              <p style="color:#ffffff; font-size:20px; font-weight:bold; margin:5px 0 0 0; text-decoration:none;">${safeServerAddress}</p>
            </td>
          </tr>

          <!-- REDES SOCIALES -->
          <tr>
            <td style="padding:25px; text-align:center;">

              <p style="color:#999999; font-size:13px;">Síguenos en nuestras redes</p>

              <a href="${resolvedDiscordUrl || '#'}" style="color:#6a00ff; text-decoration:none; margin:0 10px;">Discord</a>
              <a href="${resolvedYoutubeUrl || '#'}" style="color:#6a00ff; text-decoration:none; margin:0 10px;">YouTube</a>
              <a href="${resolvedThirdUrl || '#'}" style="color:#6a00ff; text-decoration:none; margin:0 10px;">${escapeHtml(thirdSocialLabel || 'Twitter')}</a>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td bgcolor="#111111" style="padding:20px; text-align:center;">
              <p style="color:#666666; font-size:12px; margin:0;">© 2026 ${safeSiteName} - Todos los derechos reservados</p>

              <p style="color:#666666; font-size:12px; margin-top:8px;">
                Si no deseas recibir más correos,
                <a href="${unsubscribeUrl || '#'}" style="color:#6a00ff; text-decoration:none;">haz clic aquí</a>.
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

  const subscribers = await NewsletterSubscriber.find({ unsubscribedAt: null }).select('email').lean();

  const latestPosts = await BlogPost.find({ isPublished: true })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(3)
    .select('title slug excerpt publishedAt')
    .lean();

  const nowIso = new Date().toISOString();

  const postsText = buildPostsText(latestPosts as any[], baseUrl);
  const newsListHtml = buildPostsHtml(latestPosts as any[], baseUrl);

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

    const html = buildNewsletterHtml({
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
