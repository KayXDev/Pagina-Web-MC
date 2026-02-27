import { NextResponse } from 'next/server';
import { requireAdmin, requireOwner } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AdminLog from '@/models/AdminLog';
import bcrypt from 'bcryptjs';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();
    
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    return NextResponse.json(users);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner();
    const body = await request.json().catch(() => ({}));

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const email = emailRaw.toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const role = typeof body.role === 'string' ? body.role : 'USER';

    if (!username || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Username inválido' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Contraseña inválida (mín. 6 caracteres)' }, { status: 400 });
    }

    if (!['USER', 'STAFF', 'ADMIN', 'OWNER'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    await dbConnect();

    const emailExists = await User.findOne({ email }).select('_id').lean();
    if (emailExists) {
      return NextResponse.json({ error: 'Ese email ya está en uso' }, { status: 409 });
    }

    const usernameExists = await User.findOne({ username }).select('_id').lean();
    if (usernameExists) {
      return NextResponse.json({ error: 'Ese username ya está en uso' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const created = await User.create({
      username,
      email,
      password: hashed,
      role,
      tags: [],
    });

    await AdminLog.create({
      adminId: owner.id,
      adminUsername: owner.name,
      action: 'CREATE_USER',
      targetType: 'USER',
      targetId: created._id.toString(),
      details: JSON.stringify({ username, email, role }),
      meta: {
        createdUser: { username, email, role },
        userAgent: request.headers.get('user-agent') || undefined,
        path: '/api/admin/users',
        method: 'POST',
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    const safeUser = await User.findById(created._id).select('-password');
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Owner access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const { userId, updates } = await request.json();
    
    await dbConnect();

    const existing = await User.findById(userId).select('role');
    if (!existing) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Proteger cuentas OWNER: solo un OWNER puede modificarlas
    if (existing.role === 'OWNER' && admin.role !== 'OWNER') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const allowedKeys = new Set(['role', 'isBanned', 'bannedReason', 'tags', 'verified']);
    const sanitizedUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates || {})) {
      if (allowedKeys.has(key)) {
        sanitizedUpdates[key] = value;
      }
    }

    // Tags: solo OWNER puede modificarlos
    if (typeof sanitizedUpdates.tags !== 'undefined') {
      if (admin.role !== 'OWNER') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const incoming = sanitizedUpdates.tags;
      const list = Array.isArray(incoming) ? incoming : [];
      const cleaned = list
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter(Boolean)
        .slice(0, 20)
        .map((t) => t.slice(0, 24));

      sanitizedUpdates.tags = Array.from(new Set(cleaned));
    }

    // Verified: solo OWNER puede cambiarlo
    if (typeof sanitizedUpdates.verified !== 'undefined') {
      if (admin.role !== 'OWNER') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      sanitizedUpdates.verified = Boolean(sanitizedUpdates.verified);
    }

    if (typeof sanitizedUpdates.role === 'string') {
      const role = sanitizedUpdates.role;
      if (!['USER', 'STAFF', 'ADMIN', 'OWNER'].includes(role)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
      }

      // Solo un OWNER puede asignar o quitar OWNER
      if ((role === 'OWNER' || existing.role === 'OWNER') && admin.role !== 'OWNER') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    if (typeof sanitizedUpdates.isBanned !== 'undefined') {
      sanitizedUpdates.isBanned = Boolean(sanitizedUpdates.isBanned);
    }
    
    const user = await User.findByIdAndUpdate(userId, sanitizedUpdates, { returnDocument: 'after', runValidators: true })
      .select('-password');

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    
    // Log action
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'UPDATE_USER',
      targetType: 'USER',
      targetId: userId,
      details: JSON.stringify(sanitizedUpdates),
      meta: {
        updates: sanitizedUpdates,
        userAgent: request.headers.get('user-agent') || undefined,
        path: '/api/admin/users',
        method: 'PATCH',
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json(user);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const { userId } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
    }

    if (admin.id === userId) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 });
    }

    await dbConnect();

    const existing = await User.findById(userId).select('role username email');
    if (!existing) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Proteger cuentas OWNER: solo un OWNER puede eliminarlas
    if (existing.role === 'OWNER' && admin.role !== 'OWNER') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await User.deleteOne({ _id: userId });

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'DELETE_USER',
      targetType: 'USER',
      targetId: userId,
      details: JSON.stringify({ deletedUser: { username: existing.username, email: existing.email, role: existing.role } }),
      meta: {
        deletedUser: { username: existing.username, email: existing.email, role: existing.role },
        userAgent: request.headers.get('user-agent') || undefined,
        path: '/api/admin/users',
        method: 'DELETE',
      },
      ipAddress: getRequestIp(request) || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
