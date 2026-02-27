import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations';
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
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const displayName =
      typeof (validatedData as any).displayName === 'string'
        ? String((validatedData as any).displayName).trim()
        : '';
    
    // Create user
    const emailLower = validatedData.email.toLowerCase();
    const requireEmailVerification = isEmailConfigured() && String(process.env.REQUIRE_EMAIL_VERIFICATION || '').toLowerCase() !== 'false';

    const verificationToken = requireEmailVerification ? crypto.randomBytes(32).toString('hex') : '';
    const verificationTokenHash = requireEmailVerification ? sha256(`${verificationToken}.${getPepper()}`) : '';
    const verificationExpiresAt = requireEmailVerification ? new Date(Date.now() + 24 * 60 * 60_000) : undefined; // 24h

    const user = await User.create({
      username: validatedData.username,
      displayName,
      email: emailLower,
      password: hashedPassword,
      role: 'USER',
      emailVerifiedAt: requireEmailVerification ? null : new Date(),
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpiresAt: verificationExpiresAt,
      emailVerificationRequestedAt: requireEmailVerification ? new Date() : undefined,
    });

    if (requireEmailVerification) {
      const verifyUrl = `${getBaseUrl(request)}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;
      try {
        await sendEmailVerificationEmail({ to: emailLower, verifyUrl });
      } catch (e) {
        // Avoid creating accounts that cannot be verified.
        await User.deleteOne({ _id: user._id });
        throw e;
      }
    }
    
    return NextResponse.json(
      { 
        message: requireEmailVerification
          ? 'Cuenta creada. Revisa tu correo para verificarla.'
          : 'Usuario registrado exitosamente',
        verificationRequired: requireEmailVerification,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        }
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
