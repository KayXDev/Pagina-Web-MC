import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Card } from '@/components/ui';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="Términos y Condiciones"
        description="Lee nuestros términos de servicio"
      />

      <div className="container mx-auto px-4 py-12">
        <AnimatedSection>
          <Card className="max-w-4xl mx-auto">
            <div className="prose max-w-none dark:prose-invert">
              <h2>1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar este servidor de Minecraft, aceptas estar sujeto a estos términos y condiciones.
              </p>

              <h2>2. Normas de Conducta</h2>
              <p>
                Los usuarios deben seguir las normas del servidor. El incumplimiento puede resultar en baneos temporales o permanentes.
              </p>

              <h2>3. Compras y Reembolsos</h2>
              <p>
                Todas las compras son finales. Los rangos y productos comprados no son reembolsables excepto en casos excepcionales determinados por la administración.
              </p>

              <h2>4. Privacidad</h2>
              <p>
                Respetamos tu privacidad. Los datos recopilados se utilizan únicamente para el funcionamiento del servidor.
              </p>

              <h2>5. Modificaciones</h2>
              <p>
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación.
              </p>

              <h2>6. Prohibiciones</h2>
              <ul>
                <li>Uso de hacks, mods no autorizados o exploits</li>
                <li>Comportamiento tóxico, acoso o discriminación</li>
                <li>Spam o publicidad no autorizada</li>
                <li>Intentos de acceso no autorizado al servidor</li>
              </ul>

              <h2>7. Contacto</h2>
              <p>
                Para preguntas sobre estos términos, contacta con la administración a través del sistema de tickets.
              </p>
            </div>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
