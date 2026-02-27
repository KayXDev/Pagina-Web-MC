import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getLangFromCookieStore } from '@/lib/i18n';
import { Badge, Card } from '@/components/ui';
import CookiePreferencesButton from '@/components/CookiePreferencesButton';

export default function PrivacyPage() {
  const updatedAt = '2026-02-27';
  const lang = getLangFromCookieStore(cookies());

  const copy =
    lang === 'en'
      ? {
          title: 'Privacy Policy',
          desc: 'How we protect your information',
          summary:
            'This policy explains what data we collect, why we collect it, and what choices you have.',
          sections: [
            {
              title: '1. Information We Collect',
              body: (
                <>
                  <p>We collect information required to operate the server and the website:</p>
                  <ul>
                    <li>Minecraft username</li>
                    <li>Email address (website account)</li>
                    <li>IP address (security and anti-cheat)</li>
                    <li>Purchases and transaction information</li>
                  </ul>
                </>
              ),
            },
            {
              title: '2. How We Use Your Data',
              body: (
                <>
                  <p>We use your information to:</p>
                  <ul>
                    <li>Provide access to the server and its features</li>
                    <li>Process purchases and transactions</li>
                    <li>Improve gameplay and website experience</li>
                    <li>Prevent fraud and keep the service secure</li>
                    <li>Communicate updates and events</li>
                  </ul>
                </>
              ),
            },
            {
              title: '3. Sharing Information',
              body: (
                <>
                  <p>We do not sell personal data. We may share it only when necessary:</p>
                  <ul>
                    <li>When required by law</li>
                    <li>To process payments (payment processors)</li>
                    <li>To protect our rights or the security of the service</li>
                  </ul>
                </>
              ),
            },
            {
              title: '4. Security',
              body: (
                <p>
                  We apply reasonable security measures, including password hashing and secure connections.
                </p>
              ),
            },
            {
              title: '5. Cookies',
              body: (
                <p>
                  We use cookies for sessions, preferences (like language) and, if you accept, analytics. See the{' '}
                  <Link href="/cookies" className="underline">
                    Cookies Policy
                  </Link>
                  .
                </p>
              ),
            },
            {
              title: '6. Your Rights',
              body: (
                <>
                  <p>You have the right to:</p>
                  <ul>
                    <li>Access your personal data</li>
                    <li>Request corrections</li>
                    <li>Request account deletion</li>
                    <li>Object to processing</li>
                  </ul>
                </>
              ),
            },
            {
              title: '7. Minors',
              body: <p>If you are under 13, you need parental/guardian consent to use our services.</p>,
            },
            {
              title: '8. Contact',
              body: <p>For privacy questions or requests, please contact us through the ticket system.</p>,
            },
          ],
        }
      : {
          title: 'Política de Privacidad',
          desc: 'Cómo protegemos tu información',
          summary:
            'Esta política explica qué datos recopilamos, por qué los recopilamos y qué opciones tienes.',
          sections: [
            {
              title: '1. Información que Recopilamos',
              body: (
                <>
                  <p>Recopilamos información necesaria para el funcionamiento del servidor y de la web:</p>
                  <ul>
                    <li>Nombre de usuario de Minecraft</li>
                    <li>Dirección de correo electrónico (cuenta web)</li>
                    <li>Dirección IP (seguridad y anti-cheats)</li>
                    <li>Información de compras y transacciones</li>
                  </ul>
                </>
              ),
            },
            {
              title: '2. Uso de la Información',
              body: (
                <>
                  <p>Utilizamos tu información para:</p>
                  <ul>
                    <li>Proporcionar acceso al servidor y sus funcionalidades</li>
                    <li>Procesar compras y transacciones</li>
                    <li>Mejorar la experiencia de juego y del sitio</li>
                    <li>Prevenir fraude y mantener la seguridad</li>
                    <li>Comunicar actualizaciones y eventos</li>
                  </ul>
                </>
              ),
            },
            {
              title: '3. Compartir Información',
              body: (
                <>
                  <p>No vendemos datos personales. Solo podríamos compartirlos cuando sea necesario:</p>
                  <ul>
                    <li>Cuando sea requerido por ley</li>
                    <li>Para procesar pagos (procesadores de pago)</li>
                    <li>Para proteger nuestros derechos o la seguridad del servicio</li>
                  </ul>
                </>
              ),
            },
            {
              title: '4. Seguridad',
              body: (
                <p>
                  Aplicamos medidas razonables de seguridad, incluyendo encriptación de contraseñas y conexiones seguras.
                </p>
              ),
            },
            {
              title: '5. Cookies',
              body: (
                <p>
                  Usamos cookies para sesión, preferencias (como idioma) y, si lo aceptas, analytics. Ver{' '}
                  <Link href="/cookies" className="underline">
                    Política de Cookies
                  </Link>
                  .
                </p>
              ),
            },
            {
              title: '6. Tus Derechos',
              body: (
                <>
                  <p>Tienes derecho a:</p>
                  <ul>
                    <li>Acceder a tu información personal</li>
                    <li>Solicitar corrección de datos incorrectos</li>
                    <li>Solicitar eliminación de tu cuenta</li>
                    <li>Oponerte al procesamiento</li>
                  </ul>
                </>
              ),
            },
            {
              title: '7. Menores de Edad',
              body: <p>Si eres menor de 13 años, necesitas el consentimiento de tus padres o tutores para usar nuestros servicios.</p>,
            },
            {
              title: '8. Contacto',
              body: <p>Para consultas de privacidad o ejercer tus derechos, contacta mediante el sistema de tickets.</p>,
            },
          ],
        };

  return (
    <div className="min-h-screen pt-24">
      <PageHeader
        title={copy.title}
        description={copy.desc}
      />

      <div className="container mx-auto px-4 py-12">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <Card hover={false} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">Legal</Badge>
                    <Badge variant="default">{lang === 'en' ? 'Privacy' : 'Privacidad'}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{copy.summary}</p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {lang === 'en' ? 'Last updated' : 'Última actualización'}:{' '}
                    <span className="font-semibold">{updatedAt}</span>
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
