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
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
