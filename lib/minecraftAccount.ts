import crypto from 'crypto';

export type MinecraftAccountSource = 'mojang' | 'offline';

export function isValidMinecraftUsername(username: string) {
  return /^[a-zA-Z0-9_]{3,16}$/.test(username);
}

function withDashes(uuid32: string) {
  const hex = uuid32.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return '';
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function offlineUuidFromUsername(username: string) {
  // Matches Java's UUID.nameUUIDFromBytes("OfflinePlayer:" + username)
  const input = Buffer.from(`OfflinePlayer:${username}`, 'utf8');
  const md5 = crypto.createHash('md5').update(input).digest();

  // Per RFC 4122: set version (3) and variant (10xx)
  md5[6] = (md5[6] & 0x0f) | 0x30;
  md5[8] = (md5[8] & 0x3f) | 0x80;

  const hex = md5.toString('hex');
  return withDashes(hex);
}

export async function resolveMinecraftAccount(opts: {
  usernameRaw: string;
  onlineMode: boolean;
  timeoutMs?: number;
}): Promise<{ username: string; uuid: string; source: MinecraftAccountSource } | null> {
  const username = String(opts.usernameRaw || '').trim();
  if (!isValidMinecraftUsername(username)) return null;

  const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 5000;

  if (opts.onlineMode) {
    try {
      const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
          cache: 'no-store',
        }
      );

      if (res.status === 204 || res.status === 404) return null;
      if (!res.ok) return null;

      const data = (await res.json().catch(() => null)) as any;
      const mojangId = typeof data?.id === 'string' ? data.id : '';
      const name = typeof data?.name === 'string' ? data.name : username;
      const uuid = withDashes(mojangId);
      if (!uuid) return null;

      return { username: name, uuid, source: 'mojang' };
    } catch {
      return null;
    }
  }

  const uuid = offlineUuidFromUsername(username);
  if (!uuid) return null;
  return { username, uuid, source: 'offline' };
}
