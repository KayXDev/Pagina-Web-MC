import crypto from 'crypto';

function base64UrlEncode(text: string) {
  return Buffer.from(text, 'utf8').toString('base64url');
}

function base64UrlDecode(text: string) {
  return Buffer.from(text, 'base64url').toString('utf8');
}

function getKey() {
  const key = String(process.env.NEXTAUTH_SECRET || '').trim();
  return key || 'newsletter-secret-not-configured';
}

function sign(data: string) {
  return crypto.createHmac('sha256', getKey()).update(data).digest('base64url');
}

export function createUnsubscribeToken(email: string) {
  const normalized = String(email || '').trim().toLowerCase();
  const payload = base64UrlEncode(normalized);
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const raw = String(token || '').trim();
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;

  const expected = sign(payload);
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return null;
  } catch {
    return null;
  }

  const email = base64UrlDecode(payload).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
