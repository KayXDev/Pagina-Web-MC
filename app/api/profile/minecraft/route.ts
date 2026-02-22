import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import User from '@/models/User';
import { resolveMinecraftAccount, isValidMinecraftUsername } from '@/lib/minecraftAccount';

export async function GET() {
  try {
    const currentUser = await requireAuth();
    await dbConnect();

    const user = await User.findById(currentUser.id)
      .select('_id minecraftUsername minecraftUuid minecraftLinkedAt')
      .lean();

    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    return NextResponse.json({
      minecraftUsername: String((user as any).minecraftUsername || ''),
      minecraftUuid: String((user as any).minecraftUuid || ''),
      minecraftLinkedAt: (user as any).minecraftLinkedAt || null,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('Error fetching minecraft link:', error);
    return NextResponse.json({ error: 'Error al cargar vínculo' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json().catch(() => ({}));

    const unlink = Boolean((body as any)?.unlink);
    const usernameRaw = typeof (body as any)?.username === 'string' ? (body as any).username : '';
    const username = String(usernameRaw).trim();

    await dbConnect();

    if (unlink) {
      const updated = await User.findByIdAndUpdate(
        currentUser.id,
        { $set: { minecraftUsername: '', minecraftUuid: '', minecraftLinkedAt: null } },
        { new: true }
      ).select('_id minecraftUsername minecraftUuid minecraftLinkedAt');

      return NextResponse.json({
        minecraftUsername: String((updated as any)?.minecraftUsername || ''),
        minecraftUuid: String((updated as any)?.minecraftUuid || ''),
        minecraftLinkedAt: (updated as any)?.minecraftLinkedAt || null,
      });
    }

    if (!isValidMinecraftUsername(username)) {
      return NextResponse.json({ error: 'Nombre de usuario de Minecraft inválido' }, { status: 400 });
    }

    const onlineMode = (process.env.MC_ONLINE_MODE || 'true').toLowerCase() !== 'false';
    const resolved = await resolveMinecraftAccount({ usernameRaw: username, onlineMode, timeoutMs: 5000 });
    if (!resolved) {
      return NextResponse.json({ error: 'No se pudo encontrar ese usuario de Minecraft' }, { status: 404 });
    }

    const existing = await User.findOne({
      _id: { $ne: currentUser.id },
      minecraftUuid: resolved.uuid,
    }).select('_id username');

    if (existing) {
      return NextResponse.json(
        { error: 'Ese usuario de Minecraft ya está vinculado a otra cuenta' },
        { status: 409 }
      );
    }

    const updated = await User.findByIdAndUpdate(
      currentUser.id,
      {
        $set: {
          minecraftUsername: resolved.username,
          minecraftUuid: resolved.uuid,
          minecraftLinkedAt: new Date(),
        },
      },
      { new: true }
    ).select('_id minecraftUsername minecraftUuid minecraftLinkedAt');

    if (!updated) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    return NextResponse.json({
      minecraftUsername: String((updated as any).minecraftUsername || ''),
      minecraftUuid: String((updated as any).minecraftUuid || ''),
      minecraftLinkedAt: (updated as any).minecraftLinkedAt || null,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error updating minecraft link:', error);
    return NextResponse.json({ error: 'Error al vincular Minecraft' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
