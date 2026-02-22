import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { UploadError, uploadImageFromFormFile } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    const uploaded = await uploadImageFromFormFile({
      file,
      folder: 'blog',
      prefix: 'blog',
    });

    return NextResponse.json({ url: uploaded.url });
  } catch (error: any) {
    console.error('Blog image upload failed:', error);
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
  }
}
