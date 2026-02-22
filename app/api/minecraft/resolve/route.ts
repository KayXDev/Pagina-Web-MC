import { NextResponse } from 'next/server';
import { resolveMinecraftAccount } from '@/lib/minecraftAccount';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const username = url.searchParams.get('username') || '';

  const onlineMode = (process.env.MC_ONLINE_MODE || 'true').toLowerCase() !== 'false';

  const resolved = await resolveMinecraftAccount({
    usernameRaw: username,
    onlineMode,
    timeoutMs: 5000,
  });

  if (!resolved) {
    return NextResponse.json(
      { error: 'Nombre de usuario de Minecraft inválido o no encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json(resolved);
}

export const runtime = 'nodejs';
