import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';
import ForumReply from '@/models/ForumReply';
import { requireAdmin } from '@/lib/session';
import User from '@/models/User';

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    const post = await ForumPost.findById(params.id).select('-likedBy').lean();
    if (!post) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
    }

    const authorUsername = typeof (post as any)?.authorUsername === 'string' ? (post as any).authorUsername.trim() : '';
    const author = authorUsername
      ? await User.findOne({ username: { $regex: new RegExp(`^${escapeRegex(authorUsername)}$`, 'i') } })
          .select('username avatar verified')
          .lean()
      : null;

    return NextResponse.json({
      ...(post as any),
      authorAvatar: typeof (author as any)?.avatar === 'string' ? (author as any).avatar : null,
      authorVerified: Boolean((author as any)?.verified),
    });
  } catch (error) {
    console.error('Error fetching forum post:', error);
    return NextResponse.json({ error: 'Error al obtener publicación' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await dbConnect();

    const post = await ForumPost.findByIdAndDelete(params.id);
    if (!post) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
    }

    await ForumReply.deleteMany({ postId: params.id });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Error deleting forum post:', error);
    return NextResponse.json({ error: 'Error al eliminar publicación' }, { status: 500 });
  }
}
