import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isEmailConfigured, sendEmailVerificationEmail } from '@/lib/email';

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
    const email = String((body as any)?.email || '').trim().toLowerCase();

    // Always generic response to avoid enumeration
    if (!email) {
      return NextResponse.json({ ok: true });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({ ok: true });
    }

    await dbConnect();

    const user: any = await User.findOne({ email }).select(
      '_id email emailVerifiedAt emailVerificationRequestedAt'
    );

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ ok: true });
    }

    const lastReq = user.emailVerificationRequestedAt
      ? Date.parse(String(user.emailVerificationRequestedAt))
      : NaN;
    if (Number.isFinite(lastReq) && Date.now() - lastReq < 2 * 60_000) {
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(`${token}.${getPepper()}`);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationTokenHash: tokenHash,
          emailVerificationExpiresAt: expiresAt,
          emailVerificationRequestedAt: new Date(),
        },
      }
    );

    const verifyUrl = `${getBaseUrl(request)}/auth/verify-email?token=${encodeURIComponent(token)}`;
    await sendEmailVerificationEmail({ to: email, verifyUrl });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    // generic response
    return NextResponse.json({ ok: true });
  }
}
