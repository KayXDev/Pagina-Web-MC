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
      folder: 'partners/banners',
      prefix: 'partner_banner',
    });

    return NextResponse.json({ url: uploaded.url });
  } catch (error: any) {
    const message = String(error?.message || 'Error al subir imagen');

    if (message.includes('Unauthorized') || message.includes('Forbidden')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Partner banner upload failed:', error);
    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
