import styles from './home.module.css'

const PASOS = [
  {
    num: '01',
    titulo: 'Preguntá en lenguaje natural',
    desc: 'Escribí tu consulta como si le hablaras a un experto. No hace falta saber de NCM ni normativa.',
  },
  {
    num: '02',
    titulo: 'Procesamos fuentes oficiales',
    desc: 'Analizamos más de 100 fuentes oficiales: AFIP, SENASA, ANMAT, BCRA, acuerdos Mercosur y más.',
  },
  {
    num: '03',
    titulo: 'Recibís una respuesta precisa',
    desc: 'Respuesta clara con referencias a la normativa aplicable. Todo trazable a documentos oficiales.',
  },
]

const CATEGORIAS = [
  { titulo: 'Aranceles NCM', desc: 'Posiciones arancelarias, derechos de importación y exportación por mercado.' },
  { titulo: 'Documentación aduanera', desc: 'Qué documentos necesitás para cada operación de comercio exterior.' },
  { titulo: 'Requisitos SENASA y ANMAT', desc: 'Registros y habilitaciones sanitarias requeridas por SENASA y ANMAT para comercio exterior de productos regulados.' },
  { titulo: 'BCRA y divisas', desc: 'Liquidación de exportaciones, acceso al mercado de cambios, SIMI.' },
  { titulo: 'Incoterms', desc: 'Términos de comercio internacional: FOB, CIF, EXW y todos los demás.' },
  { titulo: 'Acuerdos comerciales', desc: 'Preferencias arancelarias en Mercosur, ALADI y acuerdos bilaterales.' },
  { titulo: 'Clasificación arancelaria', desc: 'Cómo clasificar correctamente un producto en el sistema NCM.' },
  { titulo: 'Normativa aduanera', desc: 'Código Aduanero, resoluciones AFIP y procedimientos de aduana.' },
]

const PLANES = [
  {
    id: 'free',
    nombre: 'Gratuito',
    precio: '$0',
    periodo: 'para siempre',
    destacado: false,
    features: [
      '15 consultas por mes',
      'Respuestas con fuentes',
      'Acceso a base NCM completa',
      'Historial de 7 días',
    ],
    cta: 'Empezar gratis',
    href: '/registro',
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: '$12.000',
    periodo: 'por mes',
    destacado: true,
    features: [
      '200 consultas por mes',
      'Respuestas detalladas',
      'Historial ilimitado',
      'Exportar respuestas a PDF',
      'Soporte por email',
    ],
    cta: 'Empezar con Pro',
    href: '/registro?plan=pro',
  },
  {
    id: 'empresa',
    nombre: 'Empresa',
    precio: 'A consultar',
    periodo: '',
    destacado: false,
    features: [
      'Consultas ilimitadas',
      'API de integración',
      'Múltiples usuarios',
      'Soporte prioritario',
      'Onboarding personalizado',
    ],
    cta: 'Contactanos',
    href: 'mailto:hola@trade.ai',
  },
]

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* ─── HEADER ─── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.logo}>
            <span className={styles.logoTrade}>trade</span>
            <span className={styles.logoDot}>.</span>
            <span className={styles.logoAi}>ai</span>
            <span className={styles.logoBadge}>Beta</span>
          </a>
          <nav className={styles.headerNav}>
            <a href="#como-funciona" className={styles.headerNavLink}>Cómo funciona</a>
            <a href="#precios" className={styles.headerNavLink}>Precios</a>
          </nav>
          <div className={styles.headerActions}>
            <a href="/login" className={styles.btnSecondary}>Iniciar sesión</a>
            <a href="/registro" className={styles.btnPrimary}>Empezar gratis</a>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          {/* Columna izquierda */}
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>
              Comercio exterior argentino
            </div>
            <h1 className={styles.heroTitle}>
              Consultá aranceles,<br />
              normativa y documentos<br />
              <span className={styles.heroAccent}>al instante.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Preguntá en lenguaje natural sobre exportaciones, importaciones,
              acuerdos comerciales y normativa aduanera.
              Respuestas respaldadas por fuentes oficiales.
            </p>
            <div className={styles.heroCtas}>
              <a href="/registro" className={styles.btnPrimaryLg}>
                Empezar gratis
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </a>
              <a href="#como-funciona" className={styles.btnGhost}>Ver cómo funciona</a>
            </div>
          </div>

          {/* Columna derecha — mockup de producto */}
          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.terminalCard}>
              <div className={styles.terminalHeader}>
                <div className={styles.terminalDots}>
                  <span /><span /><span />
                </div>
                <span className={styles.terminalTitle}>trade.ai — consulta NCM</span>
              </div>
              <div className={styles.terminalBody}>
                <div className={styles.terminalQuery}>
                  ¿Cuánto cuesta importar vino tinto a Argentina?
                </div>
                <div className={styles.terminalDivider} />
                <div className={styles.terminalRow}>
                  <span className={styles.terminalLabel}>Posición NCM</span>
                  <span className={styles.terminalCode}>2204.21.00</span>
                </div>
                <div className={styles.terminalRow}>
                  <span className={styles.terminalLabel}>Descripción</span>
                  <span className={styles.terminalVal}>Vino tinto en recipientes ≤ 2L</span>
                </div>
                <div className={styles.terminalDivider} />
                <div className={styles.terminalRow}>
                  <span className={styles.terminalLabel}>Extrazona</span>
                  <span className={styles.terminalBad}>20%</span>
                </div>
                <div className={styles.terminalRow}>
                  <span className={styles.terminalLabel}>Mercosur</span>
                  <span className={styles.terminalGood}>0%</span>
                </div>
                <div className={styles.terminalRow}>
                  <span className={styles.terminalLabel}>SENASA</span>
                  <span className={styles.terminalWarn}>Habilitación requerida</span>
                </div>
                <div className={styles.terminalDivider} />
                <div className={styles.terminalDisclaimer}>
                  Fuente: ARCA · Actualizado Feb 2026
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats — fila completa debajo */}
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>10.000+</span>
            <span className={styles.statLabel}>Posiciones NCM</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>150+</span>
            <span className={styles.statLabel}>Fuentes oficiales</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>10+</span>
            <span className={styles.statLabel}>Acuerdos comerciales</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>AR</span>
            <span className={styles.statLabel}>Normativa argentina</span>
          </div>
        </div>
      </section>

      {/* ─── CÓMO FUNCIONA ─── */}
      <section className={styles.section} id="como-funciona">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Simple y rápido</div>
          <h2 className={styles.sectionTitle}>Cómo funciona</h2>
          <p className={styles.sectionSubtitle}>
            En tres pasos, pasás de una duda a una respuesta fundamentada en normativa oficial.
          </p>

          <div className={styles.pasosGrid}>
            {PASOS.map((paso, i) => (
              <div key={i} className={styles.paso}>
                <div className={styles.pasoNum}>{paso.num}</div>
                <h3 className={styles.pasoTitulo}>{paso.titulo}</h3>
                <p className={styles.pasoDesc}>{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUÉ PODÉS CONSULTAR ─── */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Cobertura amplia</div>
          <h2 className={styles.sectionTitle}>¿Qué podés consultar?</h2>
          <p className={styles.sectionSubtitle}>
            Desde clasificación arancelaria hasta requisitos de organismos oficiales.
          </p>

          <div className={styles.categoriasGrid}>
            {CATEGORIAS.map((cat, i) => (
              <div key={i} className={styles.categoriaItem}>
                <span className={styles.categoriaNum}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={styles.categoriaTexto}>
                  <span className={styles.categoriaTitulo}>{cat.titulo}</span>
                  <span className={styles.categoriaDesc}>{cat.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLANES ─── */}
      <section className={styles.section} id="precios">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Sin sorpresas</div>
          <h2 className={styles.sectionTitle}>Planes y precios</h2>
          <p className={styles.sectionSubtitle}>
            Empezá gratis. Escalá cuando lo necesites.
          </p>

          <div className={styles.planesGrid}>
            {PLANES.map((plan) => (
              <div
                key={plan.id}
                className={`${styles.planCard} ${plan.destacado ? styles.planCardDestacado : ''}`}
              >
                {plan.destacado && (
                  <div className={styles.planPopular}>Más popular</div>
                )}
                <div className={styles.planNombre}>{plan.nombre}</div>
                <div className={styles.planPrecio}>
                  {plan.precio}
                  {plan.periodo && <span className={styles.planPeriodo}> / {plan.periodo}</span>}
                </div>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f, i) => (
                    <li key={i} className={styles.planFeature}>
                      <span className={styles.planCheck} aria-hidden="true">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  className={plan.destacado ? styles.btnPlanPrimary : styles.btnPlanSecondary}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <div className={styles.logo}>
                <span className={styles.logoTrade}>trade</span>
                <span className={styles.logoDot}>.</span>
                <span className={styles.logoAi}>ai</span>
              </div>
              <p className={styles.footerTagline}>
                Inteligencia artificial para el comercio exterior argentino.
              </p>
              <p className={styles.footerHecho}>Hecho en Argentina</p>
            </div>
            <div className={styles.footerLinks}>
              <div className={styles.footerLinkGroup}>
                <div className={styles.footerLinkTitle}>Producto</div>
                <a href="#como-funciona" className={styles.footerLink}>Cómo funciona</a>
                <a href="#precios" className={styles.footerLink}>Precios</a>
                <a href="/registro" className={styles.footerLink}>Crear cuenta</a>
              </div>
              <div className={styles.footerLinkGroup}>
                <div className={styles.footerLinkTitle}>Legal</div>
                <a href="/terminos" className={styles.footerLink}>Términos de uso</a>
                <a href="/privacidad" className={styles.footerLink}>Privacidad</a>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerDisclaimer}>
              La información provista por trade.ai es orientativa y está respaldada por documentos oficiales públicos.
              No reemplaza el asesoramiento de un despachante de aduana matriculado. Ante dudas, consultá con un profesional habilitado.
            </p>
            <p className={styles.footerCopy}>© {new Date().getFullYear()} trade.ai</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
