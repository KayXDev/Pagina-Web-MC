import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui';
import CookiePreferencesButton from '@/components/CookiePreferencesButton';

export default function PrivacyPage() {
  const updatedAt = '2026-02-27';

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Política de Privacidad"
        description="Cómo protegemos tu información"
      />

      <div className="container mx-auto px-4 py-12">
        <AnimatedSection>
          <div className="max-w-6xl mx-auto">
            <Card hover={false} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">Legal</Badge>
                    <Badge variant="default">Privacidad</Badge>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                    Esta política explica qué datos recopilamos, para qué los usamos y qué opciones tienes.
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
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Índice
                  </div>
                  <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <a className="block hover:underline" href="#info">1. Información que recopilamos</a>
                    <a className="block hover:underline" href="#uso">2. Uso de la información</a>
                    <a className="block hover:underline" href="#compartir">3. Compartir información</a>
                    <a className="block hover:underline" href="#seguridad">4. Seguridad</a>
                    <a className="block hover:underline" href="#cookies">5. Cookies</a>
                    <a className="block hover:underline" href="#derechos">6. Tus derechos</a>
                    <a className="block hover:underline" href="#menores">7. Menores de edad</a>
                    <a className="block hover:underline" href="#contacto">8. Contacto</a>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-8">
                <Card hover={false} className="p-5 sm:p-6">
                  <div className="prose max-w-none dark:prose-invert">
                    <h2 id="info">1. Información que Recopilamos</h2>
                    <p>Recopilamos información necesaria para el funcionamiento del servidor y de la web:</p>
                    <ul>
                      <li>Nombre de usuario de Minecraft</li>
                      <li>Dirección de correo electrónico (para registro en la web)</li>
                      <li>Dirección IP (seguridad y anti-cheats)</li>
                      <li>Información de compras y transacciones</li>
                    </ul>

                    <h2 id="uso">2. Uso de la Información</h2>
                    <p>Utilizamos tu información para:</p>
                    <ul>
                      <li>Proporcionar acceso al servidor y sus funcionalidades</li>
                      <li>Procesar compras y transacciones</li>
                      <li>Mejorar la experiencia de juego</li>
                      <li>Prevenir fraude y mantener seguridad</li>
                      <li>Comunicar actualizaciones y eventos</li>
                    </ul>

                    <h2 id="compartir">3. Compartir Información</h2>
                    <p>No vendemos tu información personal. Solo podríamos compartirla en estos casos:</p>
                    <ul>
                      <li>Cuando sea requerido por ley</li>
                      <li>Para procesar pagos (procesadores de pago)</li>
                      <li>Para proteger nuestros derechos o la seguridad del servicio</li>
                    </ul>

                    <h2 id="seguridad">4. Seguridad</h2>
                    <p>
                      Aplicamos medidas razonables de seguridad para proteger tu información, incluyendo encriptación de contraseñas y conexiones seguras.
                    </p>

                    <h2 id="cookies">5. Cookies</h2>
                    <p>
                      Usamos cookies para mantener la sesión, recordar ajustes (como idioma) y, si lo aceptas, analytics.
                      Puedes leer el detalle en{' '}
                      <Link href="/cookies" className="underline">Política de Cookies</Link>.
                    </p>

                    <h2 id="derechos">6. Tus Derechos</h2>
                    <p>Tienes derecho a:</p>
                    <ul>
                      <li>Acceder a tu información personal</li>
                      <li>Solicitar corrección de datos incorrectos</li>
                      <li>Solicitar eliminación de tu cuenta</li>
                      <li>Oponerte al procesamiento de tus datos</li>
                    </ul>

                    <h2 id="menores">7. Menores de Edad</h2>
                    <p>
                      Si eres menor de 13 años, necesitas el consentimiento de tus padres o tutores para usar nuestros servicios.
                    </p>

                    <h2 id="contacto">8. Contacto</h2>
                    <p>
                      Para ejercer tus derechos o hacer consultas sobre privacidad, contacta con nosotros mediante el sistema de tickets.
                    </p>
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
