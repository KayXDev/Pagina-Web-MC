import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import BlogPost from '@/models/BlogPost';
import AdminLog from '@/models/AdminLog';
import { blogPostSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';
import { broadcastNotification } from '@/lib/notifications';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();
    
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    
    return NextResponse.json(posts);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Error al obtener posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    
    const validatedData = blogPostSchema.parse(body);
    
    await dbConnect();
    
    const slug = slugify(validatedData.title);
    
    const post = await BlogPost.create({
      ...validatedData,
      slug,
      author: admin.name,
      authorId: admin.id,
      publishedAt: validatedData.isPublished ? new Date() : undefined,
    });

    // Notify everyone only when it's actually published (news visible in /noticias).
    if (post.isPublished) {
      await broadcastNotification({
        title: 'Nueva noticia',
        message: post.title,
        href: `/noticias/${post.slug}`,
        type: 'INFO',
      });
    }
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'CREATE_BLOG_POST',
      targetType: 'BLOG_POST',
      targetId: post._id.toString(),
      meta: {
        title: post.title,
        slug: post.slug,
        isPublished: post.isPublished,
        path: '/api/admin/blog',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al crear post' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const { postId, updates } = await request.json();
    
    await dbConnect();

    const before = await BlogPost.findById(postId).select('isPublished slug title').lean();
    const wasPublished = Boolean((before as any)?.isPublished);
    
    const post = await BlogPost.findByIdAndUpdate(postId, updates, { new: true });
    
    if (!post) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }

    // If it just became published, broadcast a notification.
    if (!wasPublished && post.isPublished) {
      await broadcastNotification({
        title: 'Nueva noticia',
        message: post.title,
        href: `/noticias/${post.slug}`,
        type: 'INFO',
      });
    }
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'UPDATE_BLOG_POST',
      targetType: 'BLOG_POST',
      targetId: postId,
      details: JSON.stringify(updates),
      meta: {
        updates,
        path: '/api/admin/blog',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json(post);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Error al actualizar post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');
    
    if (!postId) {
      return NextResponse.json({ error: 'ID de post requerido' }, { status: 400 });
    }
    
    await dbConnect();
    
    const post = await BlogPost.findByIdAndDelete(postId);
    
    if (!post) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'DELETE_BLOG_POST',
      targetType: 'BLOG_POST',
      targetId: postId,
      meta: {
        title: post.title,
        slug: post.slug,
        path: '/api/admin/blog',
        method: 'DELETE',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json({ message: 'Post eliminado' });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Error al eliminar post' },
      { status: 500 }
    );
  }
}
