import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Card } from '@/components/ui';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="Política de Privacidad"
        description="Cómo protegemos tu información"
      />

      <div className="container mx-auto px-4 py-12">
        <AnimatedSection>
          <Card className="max-w-4xl mx-auto">
            <div className="prose max-w-none dark:prose-invert">
              <h2>1. Información que Recopilamos</h2>
              <p>
                Recopilamos información necesaria para el funcionamiento del servidor:
              </p>
              <ul>
                <li>Nombre de usuario de Minecraft</li>
                <li>Dirección de correo electrónico (para registro en la web)</li>
                <li>Dirección IP (para seguridad y anti-cheats)</li>
                <li>Información de compras y transacciones</li>
              </ul>

              <h2>2. Uso de la Información</h2>
              <p>
                Utilizamos tu información para:
              </p>
              <ul>
                <li>Proporcionar acceso al servidor y sus funcionalidades</li>
                <li>Procesar compras y transacciones</li>
                <li>Mejorar la experiencia de juego</li>
                <li>Prevenir fraude y mantener seguridad</li>
                <li>Comunicar actualizaciones y eventos</li>
              </ul>

              <h2>3. Compartir Información</h2>
              <p>
                No vendemos ni compartimos tu información personal con terceros, excepto:
              </p>
              <ul>
                <li>Cuando sea requerido por ley</li>
                <li>Para procesar pagos (procesadores de pago)</li>
                <li>Para proteger nuestros derechos o seguridad</li>
              </ul>

              <h2>4. Seguridad</h2>
              <p>
                Implementamos medidas de seguridad para proteger tu información, incluyendo encriptación de contraseñas y conexiones seguras.
              </p>

              <h2>5. Cookies</h2>
              <p>
                Utilizamos cookies para mantener tu sesión y mejorar la experiencia de usuario en el sitio web.
              </p>

              <h2>6. Tus Derechos</h2>
              <p>
                Tienes derecho a:
              </p>
              <ul>
                <li>Acceder a tu información personal</li>
                <li>Solicitar corrección de datos incorrectos</li>
                <li>Solicitar eliminación de tu cuenta</li>
                <li>Oponerte al procesamiento de tus datos</li>
              </ul>

              <h2>7. Menores de Edad</h2>
              <p>
                Si eres menor de 13 años, necesitas el consentimiento de tus padres o tutores para usar nuestros servicios.
              </p>

              <h2>8. Contacto</h2>
              <p>
                Para ejercer tus derechos o hacer consultas sobre privacidad, contacta con nosotros mediante el sistema de tickets.
              </p>

              <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                Última actualización: {new Date().toLocaleDateString('es-ES')}
              </p>
            </div>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
