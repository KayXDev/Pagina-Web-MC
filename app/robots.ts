import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
          '/carrito/',
          '/notificaciones/',
          '/mantenimiento',
          // Perfil privado (mantener indexable el perfil público /perfil/[username])
          '/perfil/ajustes',
          '/perfil/actividad',
        ],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'],
        allow: ['/', '/llms.txt', '/noticias/rss.xml'],
        disallow: ['/admin/', '/auth/', '/api/', '/carrito/', '/notificaciones/'],
      },
    ],
    host: baseUrl,
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
