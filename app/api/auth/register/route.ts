import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations';

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
    
    // Create user
    const user = await User.create({
      username: validatedData.username,
      email: validatedData.email.toLowerCase(),
      password: hashedPassword,
      role: 'USER',
    });
    
    return NextResponse.json(
      { 
        message: 'Usuario registrado exitosamente',
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
