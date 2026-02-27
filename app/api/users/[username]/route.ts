import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';
import { getCurrentUser } from '@/lib/session';

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      .select('_id username displayName role tags badges avatar banner verified createdAt followersCountOverride followingCountOverride')
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
    });
  } catch (error) {
    console.error('Error fetching public user profile:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}
