import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import PendingUser from '@/models/PendingUser';
import { isEmailConfigured, sendEmailVerificationCodeEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sha256(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function getPepper() {
  const p = String(process.env.NEXTAUTH_SECRET || '').trim();
  return p || 'no-pepper';
}

function makeCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
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

    const code = makeCode();
    const codeHash = sha256(`${email}.${code}.${getPepper()}`);
    const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 min

    const pending: any = await PendingUser.findOne({ email }).select('_id requestedAt expiresAt').lean();
    if (pending) {
      const lastReq = pending.requestedAt ? Date.parse(String(pending.requestedAt)) : NaN;
      if (Number.isFinite(lastReq) && Date.now() - lastReq < 2 * 60_000) {
        return NextResponse.json({ ok: true });
      }

      await PendingUser.updateOne(
        { _id: pending._id },
        { $set: { codeHash, expiresAt, requestedAt: new Date() } }
      );
      await sendEmailVerificationCodeEmail({ to: email, code });
      return NextResponse.json({ ok: true });
    }

    const user: any = await User.findOne({ email }).select('_id emailVerifiedAt emailVerificationRequestedAt');
    if (!user || user.emailVerifiedAt) {
      return NextResponse.json({ ok: true });
    }

    const lastReq = user.emailVerificationRequestedAt ? Date.parse(String(user.emailVerificationRequestedAt)) : NaN;
    if (Number.isFinite(lastReq) && Date.now() - lastReq < 2 * 60_000) {
      return NextResponse.json({ ok: true });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationTokenHash: codeHash,
          emailVerificationExpiresAt: expiresAt,
          emailVerificationRequestedAt: new Date(),
        },
      }
    );

    await sendEmailVerificationCodeEmail({ to: email, code });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    // generic response
    return NextResponse.json({ ok: true });
  }
}
