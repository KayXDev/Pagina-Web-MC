import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerStatus } from '@/lib/minecraft';
import { Rcon } from 'rcon-client';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

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
  debug?: {
    source: 'status' | 'rcon' | 'none';
    playerList: string[];
    playersOnlineReported: number;
    hasRcon: boolean;
    rconFailed: boolean;
    rconRawListUuids?: string;
    rconRawList?: string;
  };
};

function stripMinecraftFormatting(text: string) {
  return String(text || '').replace(/§./g, '');
}

function extractMinecraftUsername(text: string): string | null {
  const raw = stripMinecraftFormatting(String(text || '')).trim();
  if (!raw) return null;
  const matches = raw.match(/[A-Za-z0-9_]{3,16}/g);
  if (!matches || matches.length === 0) return null;
  return matches[matches.length - 1] || null;
}

function parsePlayersFromListUuidsCommand(text: string): string[] {
  const raw = stripMinecraftFormatting(String(text || '')).trim();
  if (!raw) return [];

  const afterColon = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : '';
  if (!afterColon) return [];

  return afterColon
    .split(',')
    .map((s) => s.trim())
    .map((entry) => {
      // Expected formats include: "Notch (uuid)" or "Notch(uuid)"
      const m = entry.match(/\b([A-Za-z0-9_]{3,16})\s*\(/);
      if (m?.[1]) return m[1];
      return extractMinecraftUsername(entry);
    })
    .filter((v): v is string => Boolean(v));
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
    .map((entry) => extractMinecraftUsername(entry))
    .filter((v): v is string => Boolean(v));
}

async function getOnlinePlayersViaRcon(
  debugEnabled = false
): Promise<{ players: string[]; rawListUuids?: string; rawList?: string } | null> {
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
    const uuidCommands = ['minecraft:list uuids', 'list uuids'] as const;
    const listCommands = ['minecraft:list', 'list'] as const;

    let rawListUuids = '';
    for (const cmd of uuidCommands) {
      const res = await rcon.send(cmd).catch(() => '');
      if (debugEnabled && !rawListUuids && res) rawListUuids = String(res);
      const parsed = parsePlayersFromListUuidsCommand(res);
      if (parsed.length > 0) {
        return {
          players: parsed,
          ...(debugEnabled ? { rawListUuids: String(res) } : {}),
        };
      }
    }

    let rawList = '';
    for (const cmd of listCommands) {
      const res = await rcon.send(cmd).catch(() => '');
      if (debugEnabled && !rawList && res) rawList = String(res);
      const parsed = parsePlayersFromListCommand(res);
      if (parsed.length > 0) {
        return {
          players: parsed,
          ...(debugEnabled ? { rawListUuids: rawListUuids || undefined, rawList: String(res) } : {}),
        };
      }
    }

    return {
      players: [],
      ...(debugEnabled
        ? {
            rawListUuids: rawListUuids || undefined,
            rawList: rawList || undefined,
          }
        : {}),
    };
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
    const debugEnabled = searchParams.get('debug') === '1';

    const status = await getServerStatus(host, port);
    let playerList = Array.isArray(status?.players?.list) ? status.players.list : [];

    const hasRcon = Boolean(String(process.env.RCON_HOST || '').trim()) && Boolean(String(process.env.RCON_PASSWORD || '').trim());

    let onlinePlayersFromRcon: string[] | null = null;
    let rconFailed = false;
    let usedRconPlayers = false;
    let rconRawListUuids: string | undefined;
    let rconRawList: string | undefined;

    // Use RCON only as a source of online player names when public status doesn't expose them.
    if (status?.online && hasRcon) {
      const rconRes = await getOnlinePlayersViaRcon(debugEnabled).catch(() => {
        rconFailed = true;
        return null;
      });

      if (rconRes) {
        onlinePlayersFromRcon = rconRes.players;
        rconRawListUuids = rconRes.rawListUuids;
        rconRawList = rconRes.rawList;
      }
    }

    // If the status provider doesn't expose names, optionally fallback to RCON.
    if ((!playerList || playerList.length === 0) && status?.online && (status?.players?.online || 0) > 0) {
      const viaRcon = Array.isArray(onlinePlayersFromRcon)
        ? onlinePlayersFromRcon
        : null;
      if (Array.isArray(viaRcon) && viaRcon.length > 0) {
        playerList = viaRcon;
        usedRconPlayers = true;
      }
    }

    const playerSet = new Set(playerList.map((p) => String(p || '').trim()).filter(Boolean));

    if (!status?.online) {
      const response: AdminOnlineResponse = {
        online: false,
        count: 0,
        staff: [],
        ...(debugEnabled
          ? {
              debug: {
                source: 'none',
                playerList: [],
                playersOnlineReported: Number(status?.players?.online || 0),
                hasRcon,
                rconFailed,
                ...(rconRawListUuids ? { rconRawListUuids: String(rconRawListUuids).slice(0, 500) } : {}),
                ...(rconRawList ? { rconRawList: String(rconRawList).slice(0, 500) } : {}),
              },
            }
          : {}),
      };
      return NextResponse.json(response);
    }

    if ((status?.players?.online || 0) > 0 && playerSet.size === 0) {
      const response: AdminOnlineResponse = {
        online: true,
        count: 0,
        staff: [],
        note: hasRcon
          ? rconFailed
            ? 'RCON está configurado pero no responde (host/puerto/firewall/clave).'
            : 'RCON respondió pero no se pudo obtener/parsear la lista de jugadores.'
          : 'El servidor no expone la lista de jugadores (solo el contador). Configura RCON para detectar admins online.',
        ...(debugEnabled
          ? {
              debug: {
                source: usedRconPlayers ? 'rcon' : 'status',
                playerList: playerList.slice(0, 50),
                playersOnlineReported: Number(status?.players?.online || 0),
                hasRcon,
                rconFailed,
                ...(rconRawListUuids ? { rconRawListUuids: String(rconRawListUuids).slice(0, 500) } : {}),
                ...(rconRawList ? { rconRawList: String(rconRawList).slice(0, 500) } : {}),
              },
            }
          : {}),
      };
      return NextResponse.json(response);
    }

    if (playerSet.size === 0) {
      const response: AdminOnlineResponse = {
        online: true,
        count: 0,
        staff: [],
        ...(debugEnabled
          ? {
              debug: {
                source: usedRconPlayers ? 'rcon' : 'status',
                playerList: playerList.slice(0, 50),
                playersOnlineReported: Number(status?.players?.online || 0),
                hasRcon,
                rconFailed,
                ...(rconRawListUuids ? { rconRawListUuids: String(rconRawListUuids).slice(0, 500) } : {}),
                ...(rconRawList ? { rconRawList: String(rconRawList).slice(0, 500) } : {}),
              },
            }
          : {}),
      };
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
      ...(debugEnabled
        ? {
            debug: {
              source: usedRconPlayers ? 'rcon' : 'status',
              playerList: playerList.slice(0, 50),
              playersOnlineReported: Number(status?.players?.online || 0),
              hasRcon,
              rconFailed,
              ...(rconRawListUuids ? { rconRawListUuids: String(rconRawListUuids).slice(0, 500) } : {}),
              ...(rconRawList ? { rconRawList: String(rconRawList).slice(0, 500) } : {}),
            },
          }
        : {}),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Staff online error:', error);
    return NextResponse.json({ error: 'Error al obtener admins online' }, { status: 500 });
  }
}
