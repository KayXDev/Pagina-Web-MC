import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { UploadError, uploadImageFromFormFile } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireAuth();

    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    const uploaded = await uploadImageFromFormFile({
      file,
      folder: 'forum',
      prefix: 'forum',
    });

    return NextResponse.json({ url: uploaded.url });
  } catch (error: any) {
    console.error('Forum image upload failed:', error);
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
  }
}
