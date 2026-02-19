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
            <div className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-white mb-4">1. Información que Recopilamos</h2>
              <p className="text-gray-400 mb-6">
                Recopilamos información necesaria para el funcionamiento del servidor:
              </p>
              <ul className="text-gray-400 mb-6 space-y-2 list-disc list-inside">
                <li>Nombre de usuario de Minecraft</li>
                <li>Dirección de correo electrónico (para registro en la web)</li>
                <li>Dirección IP (para seguridad y anti-cheats)</li>
                <li>Información de compras y transacciones</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mb-4">2. Uso de la Información</h2>
              <p className="text-gray-400 mb-6">
                Utilizamos tu información para:
              </p>
              <ul className="text-gray-400 mb-6 space-y-2 list-disc list-inside">
                <li>Proporcionar acceso al servidor y sus funcionalidades</li>
                <li>Procesar compras y transacciones</li>
                <li>Mejorar la experiencia de juego</li>
                <li>Prevenir fraude y mantener seguridad</li>
                <li>Comunicar actualizaciones y eventos</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mb-4">3. Compartir Información</h2>
              <p className="text-gray-400 mb-6">
                No vendemos ni compartimos tu información personal con terceros, excepto:
              </p>
              <ul className="text-gray-400 mb-6 space-y-2 list-disc list-inside">
                <li>Cuando sea requerido por ley</li>
                <li>Para procesar pagos (procesadores de pago)</li>
                <li>Para proteger nuestros derechos o seguridad</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mb-4">4. Seguridad</h2>
              <p className="text-gray-400 mb-6">
                Implementamos medidas de seguridad para proteger tu información, incluyendo encriptación de contraseñas y conexiones seguras.
              </p>

              <h2 className="text-2xl font-bold text-white mb-4">5. Cookies</h2>
              <p className="text-gray-400 mb-6">
                Utilizamos cookies para mantener tu sesión y mejorar la experiencia de usuario en el sitio web.
              </p>

              <h2 className="text-2xl font-bold text-white mb-4">6. Tus Derechos</h2>
              <p className="text-gray-400 mb-6">
                Tienes derecho a:
              </p>
              <ul className="text-gray-400 mb-6 space-y-2 list-disc list-inside">
                <li>Acceder a tu información personal</li>
                <li>Solicitar corrección de datos incorrectos</li>
                <li>Solicitar eliminación de tu cuenta</li>
                <li>Oponerte al procesamiento de tus datos</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mb-4">7. Menores de Edad</h2>
              <p className="text-gray-400 mb-6">
                Si eres menor de 13 años, necesitas el consentimiento de tus padres o tutores para usar nuestros servicios.
              </p>

              <h2 className="text-2xl font-bold text-white mb-4">8. Contacto</h2>
              <p className="text-gray-400">
                Para ejercer tus derechos o hacer consultas sobre privacidad, contacta con nosotros mediante el sistema de tickets.
              </p>

              <p className="text-gray-500 mt-8 text-sm">
                Última actualización: {new Date().toLocaleDateString('es-ES')}
              </p>
            </div>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
