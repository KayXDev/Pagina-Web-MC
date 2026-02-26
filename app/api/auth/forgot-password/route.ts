import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isEmailConfigured, sendPasswordResetEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sha256(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function getPepper() {
  const p = String(process.env.NEXTAUTH_SECRET || '').trim();
  return p || 'no-pepper';
}

function getBaseUrl(request: Request) {
  const explicit = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ success: true });
    }

    await dbConnect();

    const user: any = await User.findOne({ email }).select('_id email passwordResetRequestedAt');

    // Always return success to avoid account enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Basic rate limit: one request per 2 minutes
    const lastReq = user.passwordResetRequestedAt ? Date.parse(String(user.passwordResetRequestedAt)) : NaN;
    if (Number.isFinite(lastReq) && Date.now() - lastReq < 2 * 60_000) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(`${token}.${getPepper()}`);

    const expiresAt = new Date(Date.now() + 60 * 60_000); // 60 min

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
          passwordResetRequestedAt: new Date(),
          passwordResetUsedAt: null,
        },
      }
    );

    const resetUrl = `${getBaseUrl(request)}/auth/reset-password?token=${encodeURIComponent(token)}`;

    if (isEmailConfigured()) {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    } else {
      // Dev fallback: do not leak to client, but help local debugging
      console.warn('[forgot-password] SMTP not configured. Reset URL:', resetUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    // Still return success to avoid leaking signal; log server-side
    return NextResponse.json({ success: true });
  }
}
