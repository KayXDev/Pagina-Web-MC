import { absoluteUrl, getSiteName, getSiteUrl } from '@/lib/seo';

export async function GET() {
  const body = [
    `# ${getSiteName()}`,
    '',
    '> Comunidad y servidor de Minecraft con tienda oficial, foro, noticias, soporte y sistema de partners.',
    '',
    '## Resumen',
    `${getSiteName()} es una web pública para descubrir el servidor, comprar rangos y bundles, leer noticias, participar en el foro y contactar con soporte.`,
    '',
    '## URLs clave',
    `- Home: ${getSiteUrl()}`,
    `- Tienda: ${absoluteUrl('/tienda')}`,
    `- Foro: ${absoluteUrl('/foro')}`,
    `- Noticias: ${absoluteUrl('/noticias')}`,
    `- Vote: ${absoluteUrl('/vote')}`,
    `- Staff: ${absoluteUrl('/staff')}`,
    `- Partners: ${absoluteUrl('/partner')}`,
    `- Soporte: ${absoluteUrl('/soporte')}`,
    `- Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    `- RSS: ${absoluteUrl('/noticias/rss.xml')}`,
    '',
    '## Contenido público útil para asistentes',
    '- Noticias y actualizaciones del servidor.',
    '- Hilos públicos del foro.',
    '- Perfiles públicos de usuario.',
    '- Información de tienda, vote, staff, normas y partners.',
    '',
    '## Restricciones',
    '- No usar áreas privadas como admin, auth, carrito o notificaciones.',
    '- No asumir precios, disponibilidad ni promociones sin leer la página pública o la API pública correspondiente.',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}