import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import Link from 'next/link';
import CookiePreferencesButton from '@/components/CookiePreferencesButton';
import { Badge, Card } from '@/components/ui';

export default function CookiesPage() {
  const updatedAt = '2026-02-27';

  return (
    <div className="min-h-screen">
      <PageHeader title="Política de Cookies" description="Qué cookies usamos y cómo gestionarlas" />

      <div className="container mx-auto px-4 py-12">
        <AnimatedSection>
          <div className="max-w-6xl mx-auto">
            <Card hover={false} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">Legal</Badge>
                    <Badge variant="default">Cookies</Badge>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                    Usamos cookies para que el sitio funcione, recordar tus preferencias y, si lo aceptas, medir uso (analytics).
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Última actualización: <span className="font-semibold">{updatedAt}</span>
                  </p>
                </div>

                <div className="shrink-0">
                  <CookiePreferencesButton />
                </div>
              </div>
            </Card>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4">
                <Card hover={false} className="p-5 sticky top-6">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Índice</div>
                  <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <a className="block hover:underline" href="#que-son">
                      1. ¿Qué son?
                    </a>
                    <a className="block hover:underline" href="#tipos">
                      2. Tipos de cookies
                    </a>
                    <a className="block hover:underline" href="#usamos">
                      3. Cookies que usamos
                    </a>
                    <a className="block hover:underline" href="#gestion">
                      4. Cómo gestionarlas
                    </a>
                    <a className="block hover:underline" href="#relacionadas">
                      5. Documentos relacionados
                    </a>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-8">
                <Card hover={false} className="p-5 sm:p-6">
                  <div className="prose max-w-none dark:prose-invert">
                    <h2 id="que-son">1. ¿Qué son las cookies?</h2>
                    <p>
                      Las cookies son pequeños archivos que el navegador guarda para recordar información entre visitas (por ejemplo, tu sesión o preferencias).
                    </p>

                    <h2 id="tipos">2. Tipos de cookies</h2>
                    <ul>
                      <li>
                        <strong>Esenciales</strong>: necesarias para el funcionamiento (por ejemplo, autenticación y seguridad).
                      </li>
                      <li>
                        <strong>Preferencias</strong>: recuerdan opciones como el idioma.
                      </li>
                      <li>
                        <strong>Analytics</strong>: miden uso del sitio. Solo se activan si aceptas.
                      </li>
                    </ul>

                    <h2 id="usamos">3. Cookies que usamos</h2>
                    <p>
                      Estas son las cookies más comunes en el sitio (los nombres pueden variar según el navegador y la configuración):
                    </p>
                    <ul>
                      <li>
                        <strong>cookie_consent</strong>: guarda tu elección (accepted/rejected).
                      </li>
                      <li>
                        <strong>lang</strong>: recuerda el idioma.
                      </li>
                      <li>
                        <strong>NextAuth (sesión)</strong>: cookies necesarias para mantener tu sesión si inicias sesión.
                      </li>
                    </ul>

                    <h2 id="gestion">4. Cómo gestionarlas</h2>
                    <p>
                      Puedes cambiar tu decisión cuando quieras usando el botón <strong>Cambiar preferencias de cookies</strong> en esta página.
                    </p>
                    <p>
                      También puedes borrar cookies desde la configuración de tu navegador.
                    </p>

                    <h2 id="relacionadas">5. Documentos relacionados</h2>
                    <ul>
                      <li>
                        <Link href="/privacidad" className="underline">
                          Política de Privacidad
                        </Link>
                      </li>
                      <li>
                        <Link href="/terminos" className="underline">
                          Términos y Condiciones
                        </Link>
                      </li>
                    </ul>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
