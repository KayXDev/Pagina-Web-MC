import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getLangFromCookieStore } from '@/lib/i18n';
import CookiePreferencesButton from '@/components/CookiePreferencesButton';
import { Badge, Card } from '@/components/ui';

export default function CookiesPage() {
  const updatedAt = '2026-02-27';
  const lang = getLangFromCookieStore(cookies());

  const copy =
    lang === 'en'
      ? {
          title: 'Cookies Policy',
          desc: 'What cookies we use and how to manage them',
          summary:
            'We use cookies to keep the site working, remember preferences, and (if you accept) measure usage with analytics.',
          sections: [
            {
              title: '1. What are cookies?',
              body: (
                <p>
                  Cookies are small pieces of data stored by your browser to remember information between visits (for example, your session or preferences).
                </p>
              ),
            },
            {
              title: '2. Types of cookies',
              body: (
                <ul>
                  <li>
                    <strong>Essential</strong>: required for core functionality (authentication and security).
                  </li>
                  <li>
                    <strong>Preferences</strong>: remember choices like language.
                  </li>
                  <li>
                    <strong>Analytics</strong>: help us understand usage. Only enabled after you accept.
                  </li>
                </ul>
              ),
            },
            {
              title: '3. Cookies we use',
              body: (
                <>
                  <p>Common cookies you may see (names can vary by configuration):</p>
                  <ul>
                    <li>
                      <strong>cookie_consent</strong>: stores your choice (accepted/rejected).
                    </li>
                    <li>
                      <strong>lang</strong>: remembers your language.
                    </li>
                    <li>
                      <strong>NextAuth (session)</strong>: required to keep you signed in.
                    </li>
                  </ul>
                </>
              ),
            },
            {
              title: '4. How to manage cookies',
              body: (
                <>
                  <p>
                    You can change your choice anytime using the <strong>Change cookie preferences</strong> button on this page.
                  </p>
                  <p>You can also delete cookies from your browser settings.</p>
                </>
              ),
            },
            {
              title: '5. Related documents',
              body: (
                <ul>
                  <li>
                    <Link href="/privacidad" className="underline">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terminos" className="underline">
                      Terms & Conditions
                    </Link>
                  </li>
                </ul>
              ),
            },
          ],
        }
      : {
          title: 'Política de Cookies',
          desc: 'Qué cookies usamos y cómo gestionarlas',
          summary:
            'Usamos cookies para que el sitio funcione, recordar preferencias y (si aceptas) medir uso con analytics.',
          sections: [
            {
              title: '1. ¿Qué son las cookies?',
              body: (
                <p>
                  Las cookies son pequeños datos que el navegador guarda para recordar información entre visitas (por ejemplo, tu sesión o preferencias).
                </p>
              ),
            },
            {
              title: '2. Tipos de cookies',
              body: (
                <ul>
                  <li>
                    <strong>Esenciales</strong>: necesarias para el funcionamiento (autenticación y seguridad).
                  </li>
                  <li>
                    <strong>Preferencias</strong>: recuerdan opciones como el idioma.
                  </li>
                  <li>
                    <strong>Analytics</strong>: miden uso del sitio. Solo se activan si aceptas.
                  </li>
                </ul>
              ),
            },
            {
              title: '3. Cookies que usamos',
              body: (
                <>
                  <p>Cookies comunes que puedes ver (los nombres pueden variar según configuración):</p>
                  <ul>
                    <li>
                      <strong>cookie_consent</strong>: guarda tu elección (accepted/rejected).
                    </li>
                    <li>
                      <strong>lang</strong>: recuerda el idioma.
                    </li>
                    <li>
                      <strong>NextAuth (sesión)</strong>: necesarias para mantener tu sesión si inicias sesión.
                    </li>
                  </ul>
                </>
              ),
            },
            {
              title: '4. Cómo gestionarlas',
              body: (
                <>
                  <p>
                    Puedes cambiar tu decisión cuando quieras usando el botón <strong>Cambiar preferencias de cookies</strong> en esta página.
                  </p>
                  <p>También puedes borrar cookies desde la configuración de tu navegador.</p>
                </>
              ),
            },
            {
              title: '5. Documentos relacionados',
              body: (
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
              ),
            },
          ],
        };

  return (
    <div className="min-h-screen pt-24">
      <PageHeader title={copy.title} description={copy.desc} />

      <div className="container mx-auto px-4 py-12">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <Card hover={false} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">Legal</Badge>
                    <Badge variant="default">Cookies</Badge>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                    {copy.summary}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {lang === 'en' ? 'Last updated' : 'Última actualización'}: <span className="font-semibold">{updatedAt}</span>
                  </p>
                </div>

                <div className="shrink-0">
                  <CookiePreferencesButton />
                </div>
              </div>
            </Card>

            <div className="mt-6 space-y-4">
              {copy.sections.map((section) => (
                <Card key={section.title} hover={false} className="p-5 sm:p-6">
                  <div className="prose max-w-none dark:prose-invert">
                    <h2 className="mt-0">{section.title}</h2>
                    {section.body}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
