export interface ServerStatus {
  online: boolean;
  players: {
    online: number;
    max: number;
    list?: string[];
  };
  version?: string;
  motd?: string;
  favicon?: string;
  ping?: number;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'user-agent': '999wrld-minecraft-status/1.0',
        accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function getServerStatus(host: string, port: number = 25565): Promise<ServerStatus> {
  try {
    // Using mcsrvstat API as a reliable fallback
    const data = await fetchJsonWithTimeout(`https://api.mcsrvstat.us/3/${host}:${port}`, 5000);

    if (!data.online) {
      return {
        online: false,
        players: {
          online: 0,
          max: 0,
        },
      };
    }

    return {
      online: true,
      players: {
        online: data.players?.online || 0,
        max: data.players?.max || 0,
        list: data.players?.list || [],
      },
      version: data.version || 'Unknown',
      motd: data.motd?.clean?.join('\n') || data.motd?.raw?.join('\n') || '',
      favicon: data.icon || '',
      ping: data.debug?.ping || 0,
    };
  } catch (error) {
    return {
      online: false,
      players: {
        online: 0,
        max: 0,
      },
    };
  }
}

export function getPlayerAvatar(username: string, size: number = 64): string {
  return `https://crafatar.com/avatars/${username}?size=${size}&overlay=true`;
}

export function getPlayerHead(username: string): string {
  return `https://crafatar.com/renders/head/${username}?scale=4&overlay=true`;
}
