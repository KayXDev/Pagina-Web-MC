import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import PendingUser from '@/models/PendingUser';

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
    const email = String((body as any)?.email || '').trim().toLowerCase();
    const code = String((body as any)?.code || '').trim();

    if (!email || !code) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
    }

    await dbConnect();

    const codeHash = sha256(`${email}.${code}.${getPepper()}`);

    const pending: any = await PendingUser.findOne({ email, expiresAt: { $gt: new Date() } }).lean();
    if (pending) {
      if (String(pending.codeHash || '') !== codeHash) {
        return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
      }

      // Final uniqueness check before creating account
      const [existingByEmail, existingByUsername] = await Promise.all([
        User.findOne({ email }).select('_id').lean(),
        User.findOne({ username: pending.username }).select('_id').lean(),
      ]);
      if (existingByEmail) {
        await PendingUser.deleteOne({ _id: pending._id });
        return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
      }
      if (existingByUsername) {
        await PendingUser.deleteOne({ _id: pending._id });
        return NextResponse.json({ error: 'El nombre de usuario ya está en uso' }, { status: 400 });
      }

      const user = await User.create({
        username: String(pending.username || ''),
        displayName: String(pending.displayName || ''),
        email,
        password: String(pending.passwordHash || ''),
        role: 'USER',
        emailVerifiedAt: new Date(),
      });

      await PendingUser.deleteOne({ _id: pending._id });

      return NextResponse.json({ ok: true, userId: String(user._id) });
    }

    // Backward-compat: verify existing unverified users using stored code hash fields
    const existing: any = await User.findOne({ email }).select('_id emailVerifiedAt emailVerificationTokenHash emailVerificationExpiresAt');
    if (!existing) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
    }

    if (existing.emailVerifiedAt) {
      return NextResponse.json({ ok: true });
    }

    const expires = existing.emailVerificationExpiresAt ? new Date(existing.emailVerificationExpiresAt) : null;
    if (!expires || Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 });
    }

    if (String(existing.emailVerificationTokenHash || '') !== codeHash) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
    }

    await User.updateOne(
      { _id: existing._id },
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
