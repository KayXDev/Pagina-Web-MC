import { Rcon } from 'rcon-client';

function stripMinecraftFormatting(text: string) {
  // Remove any Minecraft formatting code, including modern hex sequences.
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
      const m = entry.match(/\b([A-Za-z0-9_]{3,16})\s*\(/);
      if (m?.[1]) return m[1];
      return extractMinecraftUsername(entry);
    })
    .filter((v): v is string => Boolean(v));
}

function parsePlayersFromListCommand(text: string): string[] {
  const raw = stripMinecraftFormatting(String(text || '')).trim();
  if (!raw) return [];

  const afterColon = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : '';
  if (!afterColon) return [];

  return afterColon
    .split(',')
    .map((s) => s.trim())
    .map((entry) => extractMinecraftUsername(entry))
    .filter((v): v is string => Boolean(v));
}

export function hasRconConfigured() {
  return Boolean(String(process.env.RCON_HOST || '').trim()) && Boolean(String(process.env.RCON_PASSWORD || '').trim());
}

export async function getOnlinePlayersViaRcon(): Promise<string[] | null> {
  const rconHost = String(process.env.RCON_HOST || '').trim();
  const rconPassword = String(process.env.RCON_PASSWORD || '').trim();
  const rconPort = Number.parseInt(String(process.env.RCON_PORT || '25575'), 10);

  if (!rconHost || !rconPassword) return null;

  const rcon = await Rcon.connect({
    host: rconHost,
    port: Number.isFinite(rconPort) ? rconPort : 25575,
    password: rconPassword,
    timeout: 3000,
  });

  try {
    const uuidCommands = ['minecraft:list uuids', 'list uuids'] as const;
    for (const cmd of uuidCommands) {
      const res = await rcon.send(cmd).catch(() => '');
      const parsed = parsePlayersFromListUuidsCommand(res);
      if (parsed.length > 0) return parsed;
    }

    const listCommands = ['minecraft:list', 'list'] as const;
    for (const cmd of listCommands) {
      const res = await rcon.send(cmd).catch(() => '');
      const parsed = parsePlayersFromListCommand(res);
      if (parsed.length > 0) return parsed;
    }

    return [];
  } finally {
    try {
      await rcon.end();
    } catch {
      // ignore
    }
  }
}
