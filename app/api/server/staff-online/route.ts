import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerStatus } from '@/lib/minecraft';
import { Rcon } from 'rcon-client';

export const revalidate = 0;

function parsePlayersFromListCommand(text: string): string[] {
  const raw = String(text || '').trim();
  if (!raw) return [];

  // Common formats:
  // - "There are 1 of a max of 20 players online: Notch"
  // - "There are 0 of a max of 20 players online"
  // - "Players online (1): Notch" (some servers)
  const afterColon = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : '';
  if (!afterColon) return [];
  return afterColon
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getOnlinePlayersViaRcon(): Promise<string[] | null> {
  const rconPassword = String(process.env.RCON_PASSWORD || '').trim();
  if (!rconPassword) return null;

  const rconHost = String(process.env.RCON_HOST || '').trim();
  const rconPort = Number.parseInt(String(process.env.RCON_PORT || '25575'), 10);

  if (!rconHost) return null;

  const rcon = await Rcon.connect({
    host: rconHost,
    port: Number.isFinite(rconPort) ? rconPort : 25575,
    password: rconPassword,
    timeout: 3000,
  });

  try {
    const res = await rcon.send('list');
    return parsePlayersFromListCommand(res);
  } finally {
    try {
      await rcon.end();
    } catch {
      // ignore
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host') || process.env.MINECRAFT_SERVER_IP || 'localhost';
    const port = parseInt(searchParams.get('port') || process.env.MINECRAFT_SERVER_PORT || '25565', 10);

    const status = await getServerStatus(host, port);
    let playerList = Array.isArray(status?.players?.list) ? status.players.list : [];

    // If the status provider doesn't expose names, optionally fallback to RCON.
    if ((!playerList || playerList.length === 0) && status?.online && (status?.players?.online || 0) > 0) {
      const viaRcon = await getOnlinePlayersViaRcon().catch(() => null);
      if (Array.isArray(viaRcon) && viaRcon.length > 0) {
        playerList = viaRcon;
      }
    }

    const playerSet = new Set(playerList.map((p) => String(p || '').trim()).filter(Boolean));

    if (!status?.online || playerSet.size === 0) {
      return NextResponse.json({
        online: Boolean(status?.online),
        count: 0,
        staff: [],
      });
    }

    await dbConnect();

    const adminUsers = await User.find({
      role: { $in: ['ADMIN', 'OWNER'] },
      isBanned: false,
      minecraftUsername: { $in: Array.from(playerSet) },
    })
      .select('username role minecraftUsername minecraftUuid')
      .lean();

    const byMc = new Map<string, any>();
    for (const u of adminUsers) {
      const mc = String((u as any).minecraftUsername || '').trim();
      if (mc) byMc.set(mc.toLowerCase(), u);
    }

    const ordered = playerList
      .map((p) => byMc.get(String(p || '').trim().toLowerCase()))
      .filter(Boolean);

    return NextResponse.json({
      online: true,
      count: ordered.length,
      staff: ordered.map((u: any) => ({
        username: String(u.username || ''),
        role: String(u.role || 'ADMIN'),
        minecraftUsername: String(u.minecraftUsername || ''),
        minecraftUuid: String(u.minecraftUuid || ''),
      })),
    });
  } catch (error) {
    console.error('Staff online error:', error);
    return NextResponse.json({ error: 'Error al obtener admins online' }, { status: 500 });
  }
}
