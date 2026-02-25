import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerStatus } from '@/lib/minecraft';
import { Rcon } from 'rcon-client';

export const revalidate = 0;

type AdminOnlineResponse = {
  online: boolean;
  count: number;
  staff: Array<{
    username: string;
    role: string;
    minecraftUsername: string;
    minecraftUuid: string;
  }>;
  note?: string;
};

let cache: { at: number; key: string; value: AdminOnlineResponse } | null = null;

function stripMinecraftFormatting(text: string) {
  return String(text || '').replace(/§[0-9A-FK-OR]/gi, '');
}

function parsePlayersFromListCommand(text: string): string[] {
  const raw = stripMinecraftFormatting(String(text || '')).trim();
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

function parsePlayersFromOpsCommand(text: string): string[] {
  // Common formats:
  // - "There are 1 ops: Notch"
  // - "There are 0 ops"
  const raw = stripMinecraftFormatting(String(text || '')).trim();
  if (!raw) return [];
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

async function getOpsViaRcon(): Promise<string[] | null> {
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
    const res = await rcon.send('ops');
    return parsePlayersFromOpsCommand(res);
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

    const cacheKey = `${host}:${port}`;
    if (cache && cache.key === cacheKey && Date.now() - cache.at < 10_000) {
      return NextResponse.json(cache.value);
    }

    const status = await getServerStatus(host, port);
    let playerList = Array.isArray(status?.players?.list) ? status.players.list : [];

    const hasRcon = Boolean(String(process.env.RCON_HOST || '').trim()) && Boolean(String(process.env.RCON_PASSWORD || '').trim());

    // Prefer RCON for "admins inside the server" (ops), because public status can't tell who is op.
    if (status?.online && hasRcon) {
      const [onlinePlayers, ops] = await Promise.all([
        getOnlinePlayersViaRcon().catch(() => null),
        getOpsViaRcon().catch(() => null),
      ]);

      const onlineSet = new Set((onlinePlayers || []).map((p) => String(p || '').trim().toLowerCase()).filter(Boolean));
      const opsSet = new Set((ops || []).map((p) => String(p || '').trim().toLowerCase()).filter(Boolean));

      const onlineOps = Array.from(onlineSet).filter((p) => opsSet.has(p));
      const response: AdminOnlineResponse = {
        online: true,
        count: onlineOps.length,
        staff: onlineOps.map((mc) => ({
          username: mc,
          role: 'ADMIN',
          minecraftUsername: mc,
          minecraftUuid: '',
        })),
      };

      cache = { at: Date.now(), key: cacheKey, value: response };
      return NextResponse.json(response);
    }

    // If the status provider doesn't expose names, optionally fallback to RCON.
    if ((!playerList || playerList.length === 0) && status?.online && (status?.players?.online || 0) > 0) {
      const viaRcon = await getOnlinePlayersViaRcon().catch(() => null);
      if (Array.isArray(viaRcon) && viaRcon.length > 0) {
        playerList = viaRcon;
      }
    }

    const playerSet = new Set(playerList.map((p) => String(p || '').trim()).filter(Boolean));

    if (!status?.online) {
      const response: AdminOnlineResponse = { online: false, count: 0, staff: [] };
      cache = { at: Date.now(), key: cacheKey, value: response };
      return NextResponse.json(response);
    }

    if ((status?.players?.online || 0) > 0 && playerSet.size === 0) {
      const response: AdminOnlineResponse = {
        online: true,
        count: 0,
        staff: [],
        note: hasRcon
          ? 'No se pudo obtener lista de jugadores por RCON.'
          : 'El servidor no expone la lista de jugadores (solo el contador). Configura RCON para detectar admins online.',
      };
      cache = { at: Date.now(), key: cacheKey, value: response };
      return NextResponse.json(response);
    }

    if (playerSet.size === 0) {
      const response: AdminOnlineResponse = { online: true, count: 0, staff: [] };
      cache = { at: Date.now(), key: cacheKey, value: response };
      return NextResponse.json(response);
    }

    await dbConnect();

    // Fallback: if no RCON, we can only match linked website admins against the online name list.
    // NOTE: do not query by $in (case-sensitive); match in JS by lowercasing.
    const admins = await User.find({
      role: { $in: ['ADMIN', 'OWNER'] },
      isBanned: false,
      minecraftUsername: { $ne: '' },
    })
      .select('username role minecraftUsername minecraftUuid')
      .lean();

    const playerLower = new Set(Array.from(playerSet).map((p) => p.toLowerCase()));
    const adminUsers = admins.filter((u: any) => {
      const mc = String(u.minecraftUsername || '').trim().toLowerCase();
      return mc && playerLower.has(mc);
    });

    const byMc = new Map<string, any>();
    for (const u of adminUsers) {
      const mc = String((u as any).minecraftUsername || '').trim();
      if (mc) byMc.set(mc.toLowerCase(), u);
    }

    const ordered = playerList
      .map((p) => byMc.get(String(p || '').trim().toLowerCase()))
      .filter(Boolean);

    const response: AdminOnlineResponse = {
      online: true,
      count: ordered.length,
      staff: ordered.map((u: any) => ({
        username: String(u.username || ''),
        role: String(u.role || 'ADMIN'),
        minecraftUsername: String(u.minecraftUsername || ''),
        minecraftUuid: String(u.minecraftUuid || ''),
      })),
      note: ordered.length === 0 ? 'Ningún admin (web) coincide con los jugadores online.' : undefined,
    };

    cache = { at: Date.now(), key: cacheKey, value: response };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Staff online error:', error);
    return NextResponse.json({ error: 'Error al obtener admins online' }, { status: 500 });
  }
}
