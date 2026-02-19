import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';
import { requireAuth } from '@/lib/session';
import Follow from '@/models/Follow';
import Notification from '@/models/Notification';
import User from '@/models/User';

const ALLOWED_CATEGORIES = new Set(['GENERAL', 'HELP', 'REPORTS', 'TRADES']);

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || '').toUpperCase();
    const author = (searchParams.get('author') || '').trim();
    const sort = (searchParams.get('sort') || 'recent').toLowerCase();
    const feed = (searchParams.get('feed') || '').toLowerCase();
    const limitRaw = searchParams.get('limit');
    const limitParsed = limitRaw ? Number(limitRaw) : NaN;
    const limit = Number.isFinite(limitParsed) ? Math.min(Math.max(1, Math.floor(limitParsed)), 200) : 200;

    const filter: Record<string, any> = {};
    // Timeline: por defecto mostramos posts (no replies).
    filter.parentId = null;
    // Se elimina repost: no mostrar reposts en el feed.
    filter.repostOf = null;
    if (ALLOWED_CATEGORIES.has(category)) {
      filter.category = category;
    }

    if (author && author.length >= 3 && author.length <= 20) {
      filter.authorUsername = { $regex: new RegExp(`^${escapeRegex(author)}$`, 'i') };
    }

    if (feed === 'following') {
      // Feed personalizado: solo usuarios seguidos
      let user: any;
      try {
        user = await requireAuth();
      } catch (e: any) {
        if (e?.message === 'Unauthorized') {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        throw e;
      }
      const followingDocs = await Follow.find({ followerId: user.id }).select('followingId -_id').lean();
      const followingIds = Array.isArray(followingDocs)
        ? followingDocs.map((d: any) => String(d.followingId || '')).filter(Boolean)
        : [];

      // Si no sigue a nadie, devolvemos vacío.
      if (!followingIds.length) {
        return NextResponse.json([]);
      }

      filter.authorId = { $in: followingIds };
    }

    let sortQuery: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'views') sortQuery = { views: -1, createdAt: -1 };
    if (sort === 'likes') sortQuery = { likesCount: -1, createdAt: -1 };

    const posts = await ForumPost.find(filter).select('-likedBy').sort(sortQuery).limit(limit).lean();

    const authorUsernames = Array.from(
      new Set(
        posts
          .map((p: any) => (typeof p?.authorUsername === 'string' ? p.authorUsername.trim() : ''))
          .filter(Boolean)
      )
    );

    const authorQueries = authorUsernames.map((u) => ({
      username: { $regex: new RegExp(`^${escapeRegex(u)}$`, 'i') },
    }));

    const authors = authorQueries.length
      ? await User.find({ $or: authorQueries }).select('username avatar verified').lean()
      : [];

    const authorByUsernameLower = new Map<string, { avatar: string | null; verified: boolean }>();
    for (const a of authors as any[]) {
      const uname = typeof a?.username === 'string' ? a.username : '';
      if (!uname) continue;
      authorByUsernameLower.set(uname.toLowerCase(), {
        avatar: typeof a?.avatar === 'string' ? a.avatar : null,
        verified: Boolean(a?.verified),
      });
    }

    const enriched = posts.map((p: any) => {
      const uname = typeof p?.authorUsername === 'string' ? p.authorUsername : '';
      const meta = uname ? authorByUsernameLower.get(uname.toLowerCase()) : undefined;
      return {
        ...p,
        authorAvatar: meta?.avatar || null,
        authorVerified: Boolean(meta?.verified),
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return NextResponse.json({ error: 'Error al obtener publicaciones' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const categoryRaw = typeof body.category === 'string' ? body.category.toUpperCase() : '';
    const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : '';
    const mediaRaw = Array.isArray((body as any).media) ? (body as any).media : [];
    const media = mediaRaw
      .filter((u: any) => typeof u === 'string')
      .map((u: string) => u.trim())
      .filter((u: string) => u.length > 0)
      .slice(0, 4);

    if (!title || title.length < 3 || title.length > 80) {
      return NextResponse.json({ error: 'Título inválido' }, { status: 400 });
    }

    if (!content || content.length < 1 || content.length > 280) {
      return NextResponse.json({ error: 'Contenido inválido' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
    }

    await dbConnect();

    const created = await ForumPost.create({
      title,
      content,
      category,
      authorId: user.id,
      authorUsername: user.name,
      media,
      parentId: null,
      repostOf: null,
      repliesCount: 0,
    });

    // Notificar solo a seguidores del autor (si los hay).
    // Importante: si falla, no bloqueamos la creación del post.
    try {
      const cursor = Follow.find({ followingId: user.id }).select('followerId -_id').lean().cursor();
      let ops: any[] = [];
      for await (const doc of cursor as any) {
        const followerId = typeof doc?.followerId === 'string' ? doc.followerId : '';
        if (!followerId || followerId === user.id) continue;

        ops.push({
          insertOne: {
            document: {
              userId: followerId,
              title: 'Nuevo post en el foro',
              message: `${user.name} publicó: ${title}`,
              href: `/foro/${created._id.toString()}`,
              type: 'INFO',
            },
          },
        });

        if (ops.length >= 500) {
          await Notification.bulkWrite(ops, { ordered: false });
          ops = [];
        }
      }
      if (ops.length) {
        await Notification.bulkWrite(ops, { ordered: false });
      }
    } catch (err) {
      console.error('Error notifying followers about forum post:', err);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error creating forum post:', error);
    return NextResponse.json({ error: 'Error al crear publicación' }, { status: 500 });
  }
}
