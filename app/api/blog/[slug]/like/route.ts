import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BlogPost from '@/models/BlogPost';
import { requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const post = await BlogPost.findOne({ slug: params.slug, isPublished: true })
      .select('likesCount likedBy')
      .lean();

    if (!post) {
      return NextResponse.json({ error: 'Noticia no encontrada' }, { status: 404 });
    }

    const liked = Array.isArray((post as any).likedBy) ? (post as any).likedBy.includes(user.id) : false;
    return NextResponse.json({ likesCount: (post as any).likesCount || 0, liked });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error getting like status:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const exists = await BlogPost.findOne({ slug: params.slug, isPublished: true })
      .select('_id')
      .lean();
    if (!exists) {
      return NextResponse.json({ error: 'Noticia no encontrada' }, { status: 404 });
    }

    // Toggle like atomically.
    const likedBefore = await BlogPost.exists({ slug: params.slug, isPublished: true, likedBy: user.id });

    if (likedBefore) {
      await BlogPost.updateOne(
        { slug: params.slug, isPublished: true, likedBy: user.id },
        { $pull: { likedBy: user.id }, $inc: { likesCount: -1 } }
      );
    } else {
      await BlogPost.updateOne(
        { slug: params.slug, isPublished: true, likedBy: { $ne: user.id } },
        { $addToSet: { likedBy: user.id }, $inc: { likesCount: 1 } }
      );
    }

    // Return fresh counts.
    const post = await BlogPost.findOne({ slug: params.slug, isPublished: true })
      .select('likesCount likedBy')
      .lean();

    const liked = Array.isArray((post as any)?.likedBy) ? (post as any).likedBy.includes(user.id) : false;
    const likesCount = Math.max(0, Number((post as any)?.likesCount || 0));

    // Best-effort fix if count ever goes negative.
    if (Number((post as any)?.likesCount || 0) < 0) {
      await BlogPost.updateOne({ slug: params.slug, isPublished: true }, { $set: { likesCount } });
    }

    return NextResponse.json({ likesCount, liked });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
