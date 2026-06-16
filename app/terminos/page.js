import Link from 'next/link'

export const metadata = {
  title: 'Términos y Condiciones — trade.ai',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="border-b border-hairline px-6 py-4 flex items-center justify-between">
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
        <p className="font-mono text-xs text-ink-subtle uppercase tracking-widest mb-3">Legal</p>
        <h1 className="font-body text-3xl font-bold text-on-surface mb-2">Términos y Condiciones</h1>
        <p className="font-body text-sm text-on-surface-variant mb-12">Última actualización: abril de 2026</p>

        <div className="space-y-10 font-body text-sm text-on-surface-variant leading-relaxed">

          <Section title="1. Aceptación de los términos">
            Al acceder o utilizar trade.ai, aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna de estas condiciones, no uses el servicio.
          </Section>

          <Section title="2. Descripción del servicio">
            <p>trade.ai es una plataforma de consulta y gestión de comercio exterior argentino asistida por inteligencia artificial. El servicio permite consultar aranceles, posiciones arancelarias (NCM), acuerdos comerciales, barreras no arancelarias, documentación aduanera y normativa vigente mediante lenguaje natural. Además, ofrece herramientas operativas como catálogo de productos, calculadora de costos, comparador por país y gestor de operaciones.</p>
            <Callout>
              <strong className="text-on-surface">trade.ai no es un servicio de despachante de aduana ni reemplaza el asesoramiento profesional.</strong> La información proporcionada es orientativa y está respaldada por fuentes oficiales. Para operaciones concretas, consultá con un despachante de aduana matriculado o un profesional de comercio exterior.
            </Callout>
          </Section>

          <Section title="3. Registro y cuenta">
            Para acceder al servicio es necesario crear una cuenta con correo electrónico y contraseña. Sos responsable de mantener la confidencialidad de tus credenciales y de todas las actividades que ocurran bajo tu cuenta.
            {' '}Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos, realicen uso abusivo del servicio o intenten eludir los límites establecidos para cada plan.
          </Section>

          <Section title="4. Planes y pagos">
            <p>trade.ai ofrece planes gratuitos y de pago. Los precios están expresados en pesos argentinos (ARS) e incluyen IVA cuando corresponde.</p>
            <p className="mt-2">Los planes de pago se facturan mensualmente mediante MercadoPago. Podés cancelar tu suscripción en cualquier momento desde tu cuenta; el acceso al plan contratado se mantiene hasta el fin del período ya abonado. No se realizan reembolsos por períodos parciales.</p>
            <p className="mt-2">Los precios pueden modificarse con previo aviso de 30 días por correo electrónico.</p>
          </Section>

          <Section title="5. Uso aceptable">
            <p className="mb-3">Queda prohibido:</p>
            <ul className="space-y-2 list-none">
              {[
                'Usar el servicio para fines ilegales o contrarios a la legislación argentina.',
                'Intentar acceder a sistemas, datos o funcionalidades no autorizadas.',
                'Revender, sublicenciar o redistribuir el servicio o sus resultados con fines comerciales sin autorización expresa.',
                'Realizar consultas automatizadas masivas (scraping, bots) que degraden el rendimiento del servicio.',
                'Presentar los resultados generados por trade.ai como asesoramiento aduanero profesional propio.',
                'Compartir credenciales de acceso con terceros o utilizar una misma cuenta desde múltiples organizaciones.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary mt-0.5 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="6. Inteligencia artificial y limitaciones">
            <p>trade.ai utiliza modelos de inteligencia artificial (Claude, Anthropic) para procesar consultas y generar respuestas. Los resultados son generados algorítmicamente a partir de bases de datos oficiales y documentación normativa, pero pueden contener errores, omisiones o información desactualizada.</p>
            <p className="mt-3">El usuario acepta que las respuestas de la IA son orientativas y no constituyen dictamen profesional; que la plataforma no garantiza la exactitud ni la actualización en tiempo real de los datos; y que es su responsabilidad contrastar la información con fuentes oficiales vigentes (AFIP, Aduana, SENASA, ANMAT, etc.) antes de tomar decisiones operativas.</p>
          </Section>

          <Section title="7. Propiedad intelectual">
            El código, diseño, identidad visual y marca trade.ai son propiedad de Pablo Gastaldi. Los datos arancelarios, normativos y de acuerdos comerciales provienen de fuentes públicas oficiales y pertenecen a sus respectivos organismos emisores. Los resultados generados por trade.ai pueden ser utilizados libremente por el usuario para sus fines profesionales.
          </Section>

          <Section title="8. Disponibilidad y cambios">
            trade.ai se provee "tal como está". No garantizamos disponibilidad ininterrumpida, libre de errores ni exactitud total de los resultados. Nos reservamos el derecho de modificar, suspender o discontinuar funcionalidades con previo aviso cuando sea posible. Las actualizaciones de bases de datos se realizan periódicamente pero puede existir un desfase entre la publicación oficial de una norma y su incorporación a la plataforma.
          </Section>

          <Section title="9. Limitación de responsabilidad">
            <p className="mb-3">En la máxima medida permitida por la ley argentina, trade.ai y su titular no serán responsables por daños derivados del uso o imposibilidad de uso del servicio, incluyendo:</p>
            <ul className="space-y-2 list-none">
              {[
                'Decisiones comerciales u operativas tomadas en base a la información proporcionada.',
                'Errores en el cálculo de aranceles, derechos, reintegros o preferencias arancelarias.',
                'Clasificación arancelaria incorrecta o incompleta.',
                'Intervenciones de organismos no identificadas por la plataforma.',
                'Pérdida de datos, lucro cesante o interrupción de actividad comercial.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary mt-0.5 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="10. Ley aplicable y jurisdicción">
            Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a la jurisdicción de los tribunales ordinarios de la ciudad de Santa Fe, provincia de Santa Fe, República Argentina.
          </Section>

          <Section title="11. Modificaciones">
            Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios serán notificados por correo electrónico y/o mediante aviso en la plataforma. El uso continuado del servicio constituye aceptación de los términos modificados.
          </Section>

          <Section title="12. Contacto">
            Para consultas sobre estos términos:{' '}
            <a href="mailto:tradeaicomex@gmail.com" className="text-primary hover:underline">tradeaicomex@gmail.com</a>
          </Section>
        </div>
      </main>

      <footer className="border-t border-hairline py-8 px-6 text-center">
        <p className="font-mono text-xs text-ink-tertiary">
          © 2026 trade.ai · Pablo Gastaldi ·{' '}
          <Link href="/privacidad" className="hover:text-on-surface-variant transition-colors">Política de Privacidad</Link>
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

function Callout({ children }) {
  return (
    <div className="mt-4 px-4 py-3 bg-surface-high border-l-2 border-primary/40 rounded-r-lg">
      <p className="font-body text-sm text-on-surface-variant">{children}</p>
    </div>
  )
}
