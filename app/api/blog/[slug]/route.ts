import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BlogPost from '@/models/BlogPost';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    await dbConnect();

    const post = await BlogPost.findOneAndUpdate(
      { slug: params.slug, isPublished: true },
      { $inc: { views: 1 } },
      { new: true }
    ).select('-likedBy');
    
    if (!post) {
      return NextResponse.json(
        { error: 'Noticia no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: 'Error al obtener la noticia' },
      { status: 500 }
    );
  }
}

export const revalidate = 60;
