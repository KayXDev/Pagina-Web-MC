import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { requireAdmin } from '@/lib/session';
import { isCloudinaryEnabled, uploadImageBuffer } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function safeExtFromType(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return '';
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Tipo de imagen no permitido' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen excede 5MB' }, { status: 400 });
    }

    const ext = safeExtFromType(file.type);
    if (!ext) {
      return NextResponse.json({ error: 'Tipo de imagen inválido' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (isCloudinaryEnabled()) {
      const uploaded = await uploadImageBuffer({
        buffer,
        folder: 'blog',
        publicId: `blog_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      });
      return NextResponse.json({ url: uploaded.url });
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            'En Vercel no se pueden guardar imágenes en el disco del servidor. Configura Cloudinary (CLOUDINARY_URL o CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET) y vuelve a intentar.',
        },
        { status: 500 }
      );
    }

    const dir = path.join(process.cwd(), 'public', 'uploads', 'blog');
    await fs.mkdir(dir, { recursive: true });

    const filename = `blog_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
    const fullPath = path.join(dir, filename);

    await fs.writeFile(fullPath, buffer);

    return NextResponse.json({ url: `/uploads/blog/${filename}` });
  } catch (error: any) {
    console.error('Blog image upload failed:', error);
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
  }
}
