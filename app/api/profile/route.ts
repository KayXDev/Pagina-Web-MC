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

  // Vercel Blob public URLs
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' && (u.hostname === 'blob.vercel-storage.com' || u.hostname.endsWith('.blob.vercel-storage.com'))) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export async function GET() {
  try {
    const currentUser = await requireAuth();
    await dbConnect();

    const user = await User.findById(currentUser.id).select(
      '_id username displayName email role tags badges balance followersCountOverride followingCountOverride avatar banner verified minecraftUsername minecraftUuid minecraftLinkedAt isBanned bannedReason createdAt updatedAt lastLogin presenceStatus lastSeenAt'
    );

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userId = user._id.toString();
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: userId }),
    ]);

    const followersOverride = (user as any).followersCountOverride;
    const followingOverride = (user as any).followingCountOverride;

    const extraFollowers = typeof followersOverride === 'number' && Number.isFinite(followersOverride) ? Math.max(0, Math.floor(followersOverride)) : 0;
    const extraFollowing = typeof followingOverride === 'number' && Number.isFinite(followingOverride) ? Math.max(0, Math.floor(followingOverride)) : 0;

    const finalFollowers = followersCount + extraFollowers;
    const finalFollowing = followingCount + extraFollowing;

    return NextResponse.json({
      id: userId,
      username: user.username,
      displayName: String((user as any).displayName || ''),
      email: user.email,
      role: user.role,
      tags: Array.isArray((user as any).tags) ? (user as any).tags : [],
      badges: Array.isArray((user as any).badges) ? (user as any).badges : [],
      balance: Number((user as any).balance || 0),
      followersCountOverride: typeof followersOverride === 'number' ? followersOverride : null,
      followingCountOverride: typeof followingOverride === 'number' ? followingOverride : null,
      avatar: user.avatar || '',
      banner: (user as any).banner || '',
      verified: Boolean((user as any).verified),
      minecraftUsername: String((user as any).minecraftUsername || ''),
      minecraftUuid: String((user as any).minecraftUuid || ''),
      minecraftLinkedAt: (user as any).minecraftLinkedAt || null,
      isBanned: Boolean((user as any).isBanned),
      bannedReason: (user as any).bannedReason || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: (user as any).lastLogin || null,
      presenceStatus: String((user as any).presenceStatus || 'ONLINE'),
      lastSeenAt: (user as any).lastSeenAt || null,
      followersCount: finalFollowers,
      followingCount: finalFollowing,
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
    const nextUsername = typeof nextUsernameRaw === 'string' ? nextUsernameRaw.trim().replace(/^@+/, '') : undefined;

    const nextAvatarRaw = typeof body?.avatar === 'string' ? body.avatar : undefined;
    const nextAvatar = typeof nextAvatarRaw === 'string' ? nextAvatarRaw.trim() : undefined;

    const nextBannerRaw = typeof body?.banner === 'string' ? body.banner : undefined;
    const nextBanner = typeof nextBannerRaw === 'string' ? nextBannerRaw.trim() : undefined;

    const nextDisplayNameRaw = typeof body?.displayName === 'string' ? body.displayName : undefined;
    const nextDisplayName = typeof nextDisplayNameRaw === 'string' ? nextDisplayNameRaw.trim() : undefined;

    const nextPresenceStatusRaw = typeof body?.presenceStatus === 'string' ? body.presenceStatus : undefined;
    const nextPresenceStatus = typeof nextPresenceStatusRaw === 'string' ? nextPresenceStatusRaw.trim().toUpperCase() : undefined;


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

    if (typeof nextDisplayName !== 'undefined') {
      if (nextDisplayName.length > 40) {
        return NextResponse.json({ error: 'Nombre demasiado largo (máx. 40)' }, { status: 400 });
      }
      updates.displayName = nextDisplayName;
    }

    if (typeof nextPresenceStatus !== 'undefined') {
      const allowed = new Set(['ONLINE', 'BUSY', 'INVISIBLE']);
      if (!allowed.has(nextPresenceStatus)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
      updates.presenceStatus = nextPresenceStatus;
    }


    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
    }

    await dbConnect();

    if (typeof updates.username === 'string') {
      const current = await User.findById(currentUser.id).select('username role usernameLastChangedAt');
      if (!current) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }

      const currentUsername = String((current as any).username || '');
      const nextUsername = String(updates.username || '');

      // Si no cambia realmente, no lo tratamos como cambio de username
      if (currentUsername.toLowerCase() === nextUsername.toLowerCase()) {
        delete updates.username;
      } else {
        // Solo 1 cambio cada 30 días (excepto OWNER)
        const role = String((current as any).role || 'USER');
        if (role !== 'OWNER') {
          const last = (current as any).usernameLastChangedAt ? new Date((current as any).usernameLastChangedAt) : null;
          if (last && !Number.isNaN(last.getTime())) {
            const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
            const elapsed = Date.now() - last.getTime();
            if (elapsed < COOLDOWN_MS) {
              const remainingDays = Math.max(1, Math.ceil((COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000)));
              return NextResponse.json(
                {
                  error: `Solo puedes cambiar tu username una vez cada 30 días. Intenta de nuevo en ${remainingDays} día(s).`,
                  retryAfterDays: remainingDays,
                },
                { status: 429 }
              );
            }
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
      }

      // Si sigue habiendo username, aquí sí es un cambio real: check de unicidad + timestamp.
      if (typeof updates.username === 'string') {
        const existing = await User.findOne({
          _id: { $ne: currentUser.id },
          username: { $regex: new RegExp(`^${escapeRegex(updates.username)}$`, 'i') },
        }).select('_id');

        if (existing) {
          return NextResponse.json({ error: 'Ese username ya está en uso' }, { status: 400 });
        }

        updates.usernameLastChangedAt = new Date();
      }
    }

    const updated = await User.findByIdAndUpdate(currentUser.id, updates, { returnDocument: 'after', runValidators: true }).select(
      '_id username displayName avatar banner verified presenceStatus'
    );

    if (!updated) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      username: updated.username,
      displayName: String((updated as any).displayName || ''),
      avatar: (updated as any).avatar || '',
      banner: (updated as any).banner || '',
      verified: Boolean((updated as any).verified),
      presenceStatus: String((updated as any).presenceStatus || 'ONLINE'),
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
