import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidad — trade.ai',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-logo text-lg">
          <span className="text-on-surface">trade</span>
          <span className="text-primary">.ai</span>
        </Link>
        <Link href="/" className="font-body text-sm text-on-surface-variant hover:text-on-surface transition-colors">
          ← Volver al inicio
        </Link>
      </header>

      {/* Contenido */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="font-mono text-xs text-on-surface-variant/50 uppercase tracking-widest mb-3">Legal</p>
        <h1 className="font-body text-3xl font-bold text-on-surface mb-2">Política de Privacidad</h1>
        <p className="font-body text-sm text-on-surface-variant mb-12">Fecha de vigencia: 1 de abril de 2026</p>

        <div className="space-y-10 font-body text-sm text-on-surface-variant leading-relaxed">

          <Section title="1. Introducción">
            Esta Política de Privacidad describe cómo trade.ai, operado por Pablo Gastaldi, recopila, usa y protege tu información personal cuando utilizás nuestro servicio. Nos tomamos en serio la privacidad de tus datos.
          </Section>

          <Section title="2. Información que recopilamos">
            <SubSection label="Datos de registro">
              Al crear tu cuenta: dirección de correo electrónico, nombre y apellido, y contraseña (almacenada de forma encriptada).
            </SubSection>
            <SubSection label="Datos de uso del servicio">
              Consultas al asistente de IA, productos cargados en el catálogo, operaciones creadas, cálculos realizados en la calculadora y plan contratado. Estos datos son necesarios para brindarte el servicio y mejorar la calidad de las respuestas.
            </SubSection>
            <SubSection label="Datos técnicos">
              Dirección IP, tipo y versión de navegador, páginas visitadas dentro de la plataforma y tiempo de permanencia.
            </SubSection>
            <SubSection label="Datos de pago">
              Los pagos se procesan a través de MercadoPago. <strong className="text-on-surface">No almacenamos datos de tarjetas de crédito, CBU ni información financiera sensible.</strong>
            </SubSection>
            <SubSection label="Cookies">
              Utilizamos cookies esenciales para el funcionamiento del servicio (sesión de usuario, preferencias). No utilizamos cookies de publicidad ni de seguimiento de terceros.
            </SubSection>
          </Section>

          <Section title="3. Cómo usamos tu información">
            <ul className="space-y-2 list-none">
              {[
                'Proveer y mantener el servicio (autenticación, historial de consultas, gestión de operaciones).',
                'Procesar pagos y gestionar tu suscripción.',
                'Mejorar la calidad del servicio y de las respuestas de la IA.',
                'Comunicarte cambios en el servicio, actualizaciones de términos o novedades relevantes.',
                'Detectar y prevenir uso abusivo, fraude o problemas técnicos.',
                'Cumplir con obligaciones legales aplicables.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary mt-0.5 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Callout>
              <strong className="text-on-surface">No vendemos, alquilamos ni compartimos tus datos personales con terceros con fines publicitarios.</strong>
            </Callout>
          </Section>

          <Section title="4. Procesamiento por inteligencia artificial">
            <p>Las consultas que realizás en trade.ai son procesadas por modelos de inteligencia artificial provistos por Anthropic (Claude API). El texto de tus consultas es enviado a los servidores de Anthropic para generar la respuesta.</p>
            <p className="mt-2">Anthropic procesa estos datos según su propia política de privacidad. Las consultas enviadas a través de la API no son utilizadas por Anthropic para entrenar sus modelos. No enviamos a Anthropic tus datos personales de registro (nombre, email).</p>
          </Section>

          <Section title="5. Servicios de terceros">
            <p className="mb-3">Utilizamos los siguientes servicios para operar la plataforma:</p>
            <div className="space-y-2">
              {[
                ['Supabase', 'Base de datos y autenticación (servidores en EE.UU.)'],
                ['Vercel', 'Hosting y despliegue del servicio (servidores globales)'],
                ['Anthropic (Claude API)', 'Procesamiento de consultas de IA (servidores en EE.UU.)'],
                ['MercadoPago', 'Procesamiento de pagos (servidores en Argentina)'],
                ['Pinecone', 'Búsqueda vectorial para el sistema RAG (servidores en EE.UU.)'],
              ].map(([nombre, desc]) => (
                <div key={nombre} className="flex gap-3 px-3 py-2 bg-white/[0.02] rounded-lg">
                  <span className="font-semibold text-on-surface w-40 shrink-0">{nombre}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="6. Transferencia internacional de datos">
            Al utilizar trade.ai, tus datos pueden ser transferidos y almacenados en servidores ubicados fuera de Argentina (principalmente Estados Unidos) a través de los proveedores mencionados. Al usar el servicio, consentís esta transferencia. Nos aseguramos de que los proveedores mantengan estándares de seguridad adecuados.
          </Section>

          <Section title="7. Retención de datos">
            <div className="space-y-2">
              {[
                ['Datos de cuenta', 'Mientras la cuenta esté activa. Si solicitás la eliminación, los borraremos dentro de los 30 días.'],
                ['Historial de consultas', 'Mientras la cuenta esté activa, para brindarte el servicio de historial.'],
                ['Datos de facturación', 'Por el plazo que exija la normativa fiscal argentina (actualmente 10 años).'],
                ['Datos técnicos (logs)', 'Hasta 12 meses con fines de seguridad y diagnóstico.'],
              ].map(([label, desc]) => (
                <div key={label} className="flex gap-3 px-3 py-2 bg-white/[0.02] rounded-lg">
                  <span className="font-semibold text-on-surface w-48 shrink-0">{label}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="8. Seguridad">
            <p className="mb-3">Implementamos medidas de seguridad técnicas y organizativas:</p>
            <ul className="space-y-1.5 list-none">
              {[
                'Encriptación de contraseñas.',
                'Comunicaciones cifradas mediante HTTPS/TLS.',
                'Autenticación segura gestionada por Supabase Auth.',
                'Validación de webhooks de pago mediante HMAC.',
                'Rate limiting en endpoints sensibles.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary mt-0.5 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-on-surface-variant/60 text-xs">Ningún sistema es 100% seguro. Si bien tomamos precauciones razonables, no podemos garantizar la seguridad absoluta de tus datos.</p>
          </Section>

          <Section title="9. Tus derechos">
            <p className="mb-3">Tenés derecho a:</p>
            <ul className="space-y-2 list-none">
              {[
                ['Acceder', 'a tus datos personales y obtener una copia.'],
                ['Rectificar', 'datos inexactos o incompletos.'],
                ['Eliminar', 'tu cuenta y datos personales asociados.'],
                ['Oponerte', 'al procesamiento de tus datos para fines no esenciales.'],
              ].map(([accion, desc]) => (
                <li key={accion} className="flex gap-3">
                  <span className="text-primary mt-0.5 shrink-0">—</span>
                  <span><strong className="text-on-surface">{accion}</strong> {desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">Para ejercer cualquiera de estos derechos, escribinos a{' '}
              <a href="mailto:tradeaicomex@gmail.com" className="text-primary hover:underline">tradeaicomex@gmail.com</a>.
              {' '}Responderemos dentro de los 30 días hábiles.</p>
            <p className="mt-2 text-on-surface-variant/60 text-xs">En Argentina, la Ley 25.326 de Protección de Datos Personales y la Agencia de Acceso a la Información Pública (AAIP) regulan el tratamiento de datos personales.</p>
          </Section>

          <Section title="10. Menores de edad">
            trade.ai no está dirigido a menores de 13 años. No recopilamos intencionalmente datos de menores. Si tomamos conocimiento de que un menor nos proporcionó datos personales, los eliminaremos de nuestros sistemas.
          </Section>

          <Section title="11. Cambios a esta política">
            Podemos actualizar esta Política de Privacidad periódicamente. Los cambios serán notificados por correo electrónico y/o mediante aviso en la plataforma. El uso continuado del servicio después de la notificación constituye aceptación de la política modificada.
          </Section>

          <Section title="12. Contacto">
            <div className="space-y-1">
              <p>Email: <a href="mailto:tradeaicomex@gmail.com" className="text-primary hover:underline">tradeaicomex@gmail.com</a></p>
              <p>Teléfono: +54 342 515 7601</p>
              <p>Ubicación: Santa Fe, Argentina</p>
            </div>
          </Section>
        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-8 px-6 text-center">
        <p className="font-mono text-xs text-on-surface-variant/30">
          © 2026 trade.ai · Pablo Gastaldi ·{' '}
          <Link href="/terminos" className="hover:text-on-surface-variant transition-colors">Términos y Condiciones</Link>
        </p>
      </footer>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-body text-base font-semibold text-on-surface mb-3">{title}</h2>
      <div className="text-on-surface-variant">{children}</div>
    </section>
  )
}

function SubSection({ label, children }) {
  return (
    <div className="mb-4">
      <p className="font-semibold text-on-surface mb-1">{label}</p>
      <p>{children}</p>
    </div>
  )
}

function Callout({ children }) {
  return (
    <div className="mt-4 px-4 py-3 bg-white/[0.03] border-l-2 border-primary/40 rounded-r-xl">
      <p className="font-body text-sm text-on-surface-variant">{children}</p>
    </div>
  )
}
