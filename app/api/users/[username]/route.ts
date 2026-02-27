import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';
import { getCurrentUser } from '@/lib/session';

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isStaffRole(role?: string) {
  return role === 'ADMIN' || role === 'STAFF' || role === 'OWNER';
}

function computePublicPresence(params: {
  viewerId?: string;
  viewerRole?: string;
  userId: string;
  presenceStatus?: unknown;
  lastSeenAt?: unknown;
}) {
  const pref = String(params.presenceStatus || 'ONLINE').toUpperCase();
  const lastSeenMs = params.lastSeenAt ? Date.parse(String(params.lastSeenAt)) : NaN;
  const isSelf = Boolean(params.viewerId && params.viewerId === params.userId);
  const viewerIsStaff = isStaffRole(params.viewerRole);

  const ONLINE_WINDOW_MS = 90_000;
  const isRecentlyActive = Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs <= ONLINE_WINDOW_MS;

  // Invisible hides presence from others (including staff), but the owner can still see it.
  if (!isSelf && pref === 'INVISIBLE') {
    return { status: 'offline' as const, lastSeenAt: null };
  }

  if (!isRecentlyActive) {
    // If viewer is staff, we could still show lastSeenAt, but keep it simple.
    return { status: 'offline' as const, lastSeenAt: viewerIsStaff || isSelf ? (Number.isFinite(lastSeenMs) ? new Date(lastSeenMs).toISOString() : null) : null };
  }

  if (pref === 'BUSY') return { status: 'busy' as const, lastSeenAt: new Date(lastSeenMs).toISOString() };
  return { status: 'online' as const, lastSeenAt: new Date(lastSeenMs).toISOString() };
}

export async function GET(_request: Request, { params }: { params: { username: string } }) {
  try {
    const usernameParam = typeof params.username === 'string' ? params.username.trim() : '';
    if (!usernameParam || usernameParam.length < 3 || usernameParam.length > 20) {
      return NextResponse.json({ error: 'Username inválido' }, { status: 400 });
    }

    const viewer = await getCurrentUser();
    await dbConnect();

    const user = await User.findOne({
      username: { $regex: new RegExp(`^${escapeRegex(usernameParam)}$`, 'i') },
    })
      .select('_id username displayName role tags badges avatar banner verified createdAt followersCountOverride followingCountOverride presenceStatus lastSeenAt')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userId = user._id.toString();

    const [followersCount, followingCount, isFollowing] = await Promise.all([
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: userId }),
      viewer?.id
        ? Follow.exists({ followerId: viewer.id, followingId: userId }).then(Boolean)
        : Promise.resolve(false),
    ]);

    const followersOverride = (user as any).followersCountOverride;
    const followingOverride = (user as any).followingCountOverride;

    const extraFollowers = typeof followersOverride === 'number' && Number.isFinite(followersOverride) ? Math.max(0, Math.floor(followersOverride)) : 0;
    const extraFollowing = typeof followingOverride === 'number' && Number.isFinite(followingOverride) ? Math.max(0, Math.floor(followingOverride)) : 0;

    const finalFollowers = followersCount + extraFollowers;
    const finalFollowing = followingCount + extraFollowing;

    const presence = computePublicPresence({
      viewerId: viewer?.id,
      viewerRole: (viewer as any)?.role,
      userId,
      presenceStatus: (user as any).presenceStatus,
      lastSeenAt: (user as any).lastSeenAt,
    });

    return NextResponse.json({
      id: userId,
      username: user.username,
      displayName: String((user as any).displayName || ''),
      role: user.role,
      tags: Array.isArray((user as any).tags) ? ((user as any).tags as string[]) : [],
      badges: Array.isArray((user as any).badges) ? ((user as any).badges as string[]) : [],
      avatar: (user as any).avatar || '',
      banner: (user as any).banner || '',
      verified: Boolean((user as any).verified),
      createdAt: (user as any).createdAt,
      followersCount: finalFollowers,
      followingCount: finalFollowing,
      isFollowing,
      isSelf: viewer?.id ? viewer.id === userId : false,
      presence,
    });
  } catch (error) {
    console.error('Error fetching public user profile:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}
