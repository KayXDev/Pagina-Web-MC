import nodemailer from 'nodemailer';

type SendMailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || '');
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const from = String(process.env.SMTP_FROM || '').trim();

  const enabled = Boolean(host && Number.isFinite(port) && port > 0 && user && pass && from);

  return { enabled, host, port, user, pass, from };
}

export function isEmailConfigured() {
  return getSmtpConfig().enabled;
}

export async function sendMail(input: SendMailInput) {
  const cfg = getSmtpConfig();
  if (!cfg.enabled) {
    throw new Error('SMTP no configurado (define SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM)');
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  await transporter.sendMail({
    from: cfg.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendPasswordResetEmail(params: { to: string; resetUrl: string }) {
  const siteName = String(process.env.SITE_NAME || '999Wrld Network').trim();

  const subject = `${siteName} • Password reset`;
  const text = `We received a request to reset your password.\n\nReset link: ${params.resetUrl}\n\nIf you did not request this, you can ignore this email.`;

  const escapedUrl = params.resetUrl.replace(/"/g, '%22');
  const html = `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5; color: #111827;">
    <h2 style="margin: 0 0 12px 0;">Reset your password</h2>
    <p style="margin: 0 0 16px 0;">We received a request to reset your password for <b>${siteName}</b>.</p>
    <p style="margin: 0 0 16px 0;">
      <a href="${escapedUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#22c55e;color:#0b1220;text-decoration:none;font-weight:700;">Reset password</a>
    </p>
    <p style="margin: 0 0 16px 0;">Or copy and paste this link:</p>
    <p style="margin: 0 0 16px 0; word-break: break-all;"><a href="${escapedUrl}">${params.resetUrl}</a></p>
    <p style="margin: 0; color:#6b7280; font-size: 12px;">If you did not request this, you can ignore this email.</p>
  </div>
  `;

  await sendMail({ to: params.to, subject, text, html });
}
