import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    const updated = await ForumPost.findByIdAndUpdate(
      params.id,
      { $inc: { views: 1 } },
      { returnDocument: 'after' }
    ).select('views');

    if (!updated) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ views: updated.views });
  } catch (error) {
    console.error('Error incrementing forum post views:', error);
    return NextResponse.json({ error: 'Error al actualizar vistas' }, { status: 500 });
  }
}
