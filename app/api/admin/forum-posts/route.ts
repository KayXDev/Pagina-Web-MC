import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';
import ForumReply from '@/models/ForumReply';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || 'all').trim();
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)));

    const filter: any = {
      parentId: null,
      repostOf: null,
    };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { authorUsername: { $regex: q, $options: 'i' } },
      ];
    }

    const posts = await ForumPost.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id title content category authorId authorUsername createdAt repliesCount views likesCount')
      .lean();

    return NextResponse.json({ posts });
  } catch (err: any) {
    if (err?.message === 'Unauthorized' || err?.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: err?.message || 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const postId = typeof body.postId === 'string' ? body.postId : '';

    if (!postId) {
      return NextResponse.json({ error: 'postId requerido' }, { status: 400 });
    }

    await dbConnect();

    // Delete root post
    const deleted = await ForumPost.findOneAndDelete({ _id: postId, parentId: null }).select('_id').lean();
    if (!deleted) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
    }

    // Delete thread replies (new system)
    await ForumPost.deleteMany({ $or: [{ rootId: postId }, { parentId: postId }] });

    // Delete legacy replies
    await ForumReply.deleteMany({ postId });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === 'Unauthorized' || err?.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: err?.message || 'Error' }, { status: 500 });
  }
}
