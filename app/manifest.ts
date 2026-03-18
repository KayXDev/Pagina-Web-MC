import type { MetadataRoute } from 'next';
import { getSiteName } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: getSiteName(),
    short_name: '999Wrld',
    description: 'Servidor y comunidad de Minecraft con tienda, foro, noticias y soporte.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020814',
    theme_color: '#d4af37',
    categories: ['games', 'entertainment', 'social'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}