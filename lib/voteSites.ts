export type VoteSite = {
  name: string;
  url: string;
  description?: string;
};

// Añade aquí las webs donde se puede votar el servidor.
// Ejemplo:
// { name: 'Minecraft-MP', url: 'https://minecraft-mp.com/server/XXXXX/', description: 'Top servers' }
export const VOTE_SITES: VoteSite[] = [
  {
    name: 'MinecraftServers.org',
    url: 'https://minecraftservers.org/vote/684433',
  },
];
