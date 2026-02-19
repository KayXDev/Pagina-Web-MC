import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAllowedImageUrl(url: string, kind: 'avatar' | 'banner') {
  if (!url) return true;
  if (url.startsWith('/uploads/profile/avatar/')) return kind === 'avatar';
  if (url.startsWith('/uploads/profile/banner/')) return kind === 'banner';

  // Cloudinary (recommended for Vercel deployment)
  if (url.startsWith('https://res.cloudinary.com/')) return true;

  return false;
}

export async function GET() {
  try {
    const currentUser = await requireAuth();
    await dbConnect();

    const user = await User.findById(currentUser.id).select(
      '_id username email role tags avatar banner verified isBanned bannedReason createdAt updatedAt lastLogin'
    );

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userId = user._id.toString();
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: userId }),
    ]);

    return NextResponse.json({
      id: userId,
      username: user.username,
      email: user.email,
      role: user.role,
      tags: Array.isArray((user as any).tags) ? (user as any).tags : [],
      avatar: user.avatar || '',
      banner: (user as any).banner || '',
      verified: Boolean((user as any).verified),
      isBanned: Boolean((user as any).isBanned),
      bannedReason: (user as any).bannedReason || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: (user as any).lastLogin || null,
      followersCount,
      followingCount,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Error al cargar perfil' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();

    const nextUsernameRaw = typeof body?.username === 'string' ? body.username : undefined;
    const nextUsername = typeof nextUsernameRaw === 'string' ? nextUsernameRaw.trim() : undefined;

    const nextAvatarRaw = typeof body?.avatar === 'string' ? body.avatar : undefined;
    const nextAvatar = typeof nextAvatarRaw === 'string' ? nextAvatarRaw.trim() : undefined;

    const nextBannerRaw = typeof body?.banner === 'string' ? body.banner : undefined;
    const nextBanner = typeof nextBannerRaw === 'string' ? nextBannerRaw.trim() : undefined;

    const updates: Record<string, any> = {};

    if (typeof nextUsername !== 'undefined') {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(nextUsername)) {
        return NextResponse.json(
          { error: 'Username inválido (3-20, letras/números/_)' },
          { status: 400 }
        );
      }
      updates.username = nextUsername;
    }

    if (typeof nextAvatar !== 'undefined') {
      if (nextAvatar !== '' && !isAllowedImageUrl(nextAvatar, 'avatar')) {
        return NextResponse.json({ error: 'Avatar inválido' }, { status: 400 });
      }
      if (nextAvatar.length > 500) {
        return NextResponse.json({ error: 'Avatar inválido' }, { status: 400 });
      }
      updates.avatar = nextAvatar;
    }

    if (typeof nextBanner !== 'undefined') {
      if (nextBanner !== '' && !isAllowedImageUrl(nextBanner, 'banner')) {
        return NextResponse.json({ error: 'Banner inválido' }, { status: 400 });
      }
      if (nextBanner.length > 500) {
        return NextResponse.json({ error: 'Banner inválido' }, { status: 400 });
      }
      updates.banner = nextBanner;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
    }

    await dbConnect();

    if (typeof updates.username === 'string') {
      const existing = await User.findOne({
        _id: { $ne: currentUser.id },
        username: { $regex: new RegExp(`^${escapeRegex(updates.username)}$`, 'i') },
      }).select('_id');

      if (existing) {
        return NextResponse.json({ error: 'Ese username ya está en uso' }, { status: 400 });
      }
    }

    const updated = await User.findByIdAndUpdate(currentUser.id, updates, { new: true, runValidators: true }).select(
      '_id username avatar banner verified'
    );

    if (!updated) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      username: updated.username,
      avatar: (updated as any).avatar || '',
      banner: (updated as any).banner || '',
      verified: Boolean((updated as any).verified),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Error al actualizar perfil' },
      { status: 500 }
    );
  }
}
