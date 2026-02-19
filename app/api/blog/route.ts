import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BlogPost from '@/models/BlogPost';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const posts = await BlogPost.find({ isPublished: true })
      .select('-likedBy')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit);
    
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: 'Error al obtener noticias' },
      { status: 500 }
    );
  }
}

export const revalidate = 60;
