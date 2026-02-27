import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui';

export default function TermsPage() {
  const updatedAt = '2026-02-27';

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Términos y Condiciones"
        description="Lee nuestros términos de servicio"
      />

      <div className="container mx-auto px-4 py-12">
        <AnimatedSection>
          <div className="max-w-6xl mx-auto">
            <Card hover={false} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">Legal</Badge>
                    <Badge variant="default">Términos</Badge>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                    Estos términos regulan el uso del servidor y del sitio web. Si no estás de acuerdo, por favor no uses el servicio.
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Última actualización: <span className="font-semibold">{updatedAt}</span>
                  </p>
                </div>

                <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  Ver también: <Link href="/privacidad" className="underline">Privacidad</Link>
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
                    <a className="block hover:underline" href="#aceptacion">1. Aceptación</a>
                    <a className="block hover:underline" href="#conducta">2. Conducta</a>
                    <a className="block hover:underline" href="#compras">3. Compras y reembolsos</a>
                    <a className="block hover:underline" href="#privacidad">4. Privacidad</a>
                    <a className="block hover:underline" href="#cambios">5. Cambios</a>
                    <a className="block hover:underline" href="#prohibiciones">6. Prohibiciones</a>
                    <a className="block hover:underline" href="#contacto">7. Contacto</a>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-8">
                <Card hover={false} className="p-5 sm:p-6">
                  <div className="prose max-w-none dark:prose-invert">
                    <h2 id="aceptacion">1. Aceptación de los Términos</h2>
                    <p>
                      Al acceder y utilizar este servidor de Minecraft y el sitio web, aceptas estos términos y condiciones.
                    </p>

                    <h2 id="conducta">2. Normas de Conducta</h2>
                    <p>
                      Debes respetar las normas del servidor. El incumplimiento puede resultar en sanciones, incluyendo suspensiones o baneos.
                    </p>

                    <h2 id="compras">3. Compras y Reembolsos</h2>
                    <p>
                      En general, las compras son finales. Los rangos y productos comprados no son reembolsables, salvo casos excepcionales determinados por la administración.
                    </p>

                    <h2 id="privacidad">4. Privacidad</h2>
                    <p>
                      Respetamos tu privacidad. Consulta la{' '}
                      <Link href="/privacidad" className="underline">Política de Privacidad</Link> para más detalles.
                    </p>

                    <h2 id="cambios">5. Modificaciones</h2>
                    <p>
                      Podemos modificar estos términos cuando sea necesario. Los cambios entran en vigor al publicarse en esta página.
                    </p>

                    <h2 id="prohibiciones">6. Prohibiciones</h2>
                    <ul>
                      <li>Uso de hacks, mods no autorizados o exploits</li>
                      <li>Comportamiento tóxico, acoso o discriminación</li>
                      <li>Spam o publicidad no autorizada</li>
                      <li>Intentos de acceso no autorizado al servidor o a la web</li>
                    </ul>

                    <h2 id="contacto">7. Contacto</h2>
                    <p>
                      Para preguntas sobre estos términos, contacta con la administración a través del sistema de tickets.
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
