import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireAdmin();

    return NextResponse.json({ error: 'La subida de imágenes de productos está deshabilitada.' }, { status: 410 });
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
  }
}
