import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import PendingUser from '@/models/PendingUser';
import { registerSchema } from '@/lib/validations';
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
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    
    await dbConnect();
    
    // Check if user already exists
    const existingUserByEmail = await User.findOne({ email: validatedData.email.toLowerCase() });
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }
    
    const existingUserByUsername = await User.findOne({ username: validatedData.username });
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está en uso' },
        { status: 400 }
      );
    }

    const requireOtp = isEmailConfigured() && String(process.env.REQUIRE_EMAIL_VERIFICATION || '').toLowerCase() !== 'false';
    if (!requireOtp) {
      return NextResponse.json(
        { error: 'La verificación por email está deshabilitada o SMTP no está configurado' },
        { status: 500 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const displayName =
      typeof (validatedData as any).displayName === 'string'
        ? String((validatedData as any).displayName).trim()
        : '';

    const emailLower = validatedData.email.toLowerCase();

    // Prevent reserving usernames/emails already in pending state (case-insensitive)
    const [pendingByEmail, pendingByUsername] = await Promise.all([
      PendingUser.findOne({ email: emailLower }).select('_id requestedAt expiresAt').lean(),
      PendingUser.findOne({ username: { $regex: new RegExp(`^${validatedData.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
        .select('_id')
        .lean(),
    ]);

    if (pendingByUsername) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está en uso' },
        { status: 400 }
      );
    }

    // Rate limit resend: 1 per 2 minutes for same email
    if (pendingByEmail) {
      const lastReq = pendingByEmail.requestedAt ? Date.parse(String(pendingByEmail.requestedAt)) : NaN;
      if (Number.isFinite(lastReq) && Date.now() - lastReq < 2 * 60_000) {
        return NextResponse.json({ verificationRequired: true, ok: true });
      }
    }

    const code = makeCode();
    const codeHash = sha256(`${emailLower}.${code}.${getPepper()}`);
    const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 min
    const requestedAt = new Date();

    const pending = await PendingUser.findOneAndUpdate(
      { email: emailLower },
      {
        $set: {
          username: validatedData.username,
          displayName,
          email: emailLower,
          passwordHash: hashedPassword,
          codeHash,
          expiresAt,
          requestedAt,
        },
      },
      { upsert: true, new: true }
    );

    try {
      await sendEmailVerificationCodeEmail({ to: emailLower, code });
    } catch (e) {
      await PendingUser.deleteOne({ _id: (pending as any)._id });
      throw e;
    }
    
    // Create user
    return NextResponse.json(
      { 
        message: 'Código enviado. Revisa tu correo para continuar.',
        verificationRequired: true,
        pending: {
          email: emailLower,
          username: validatedData.username,
          expiresAt: expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de registro inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
