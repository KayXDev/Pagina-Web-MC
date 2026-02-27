import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sha256(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function getPepper() {
  const p = String(process.env.NEXTAUTH_SECRET || '').trim();
  return p || 'no-pepper';
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String((body as any)?.token || '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    await dbConnect();

    const tokenHash = sha256(`${token}.${getPepper()}`);

    const user: any = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
      $or: [{ emailVerifiedAt: { $exists: false } }, { emailVerifiedAt: null }],
    }).select('_id');

    if (!user) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { emailVerifiedAt: new Date() },
        $unset: {
          emailVerificationTokenHash: '',
          emailVerificationExpiresAt: '',
          emailVerificationRequestedAt: '',
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Error al verificar email' }, { status: 500 });
  }
}
