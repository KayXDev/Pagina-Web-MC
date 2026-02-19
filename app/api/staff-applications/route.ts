import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';
import Settings from '@/models/Settings';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function isOpen() {
  try {
    await dbConnect();
    const setting = await Settings.findOne({ key: 'staff_applications_open' }).lean();
    if (setting) return setting.value === 'true';
  } catch {
    // ignore
  }

  return process.env.NEXT_PUBLIC_STAFF_APPLICATIONS_OPEN === 'true';
}

export async function POST(request: Request) {
  try {
    if (!(await isOpen())) {
      return NextResponse.json({ error: 'Postulaciones cerradas' }, { status: 403 });
    }

    const currentUser = await getCurrentUser();

    const body = await request.json().catch(() => ({}));
    const usernameRaw = typeof body.username === 'string' ? body.username.trim() : '';
    const username = currentUser?.name ? String(currentUser.name) : usernameRaw;
    const discord = typeof body.discord === 'string' ? body.discord.trim() : '';
    const about = typeof body.about === 'string' ? body.about.trim() : '';

    if (!username || username.length < 2 || username.length > 32) {
      return NextResponse.json({ error: 'Nombre de usuario inválido' }, { status: 400 });
    }
    if (!discord || discord.length < 2 || discord.length > 64) {
      return NextResponse.json({ error: 'Discord inválido' }, { status: 400 });
    }
    if (!about || about.length < 20 || about.length > 2000) {
      return NextResponse.json({ error: 'Descripción inválida' }, { status: 400 });
    }

    const created = await StaffApplication.create({
      userId: currentUser?.id,
      username,
      discord,
      about,
      status: 'NEW',
    });

    return NextResponse.json({ ok: true, id: created._id }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff application:', error);
    return NextResponse.json({ error: 'Error al enviar postulación' }, { status: 500 });
  }
}
