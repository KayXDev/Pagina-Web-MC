import axios from 'axios';

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

export async function getServerStatus(host: string, port: number = 25565): Promise<ServerStatus> {
  try {
    // Using mcsrvstat API as a reliable fallback
    const response = await axios.get(`https://api.mcsrvstat.us/3/${host}:${port}`, {
      timeout: 5000,
    });

    const data = response.data;

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
      motd: data.motd?.clean?.join(' ') || data.motd?.raw?.join(' ') || '',
      favicon: data.icon || '',
      ping: data.debug?.ping || 0,
    };
  } catch (error) {
    console.error('Error fetching server status:', error);
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
