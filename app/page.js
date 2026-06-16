'use client'

import { useEffect, useRef, useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

const PLANES = [
  {
    id: 'free',
    nombre: 'GRATUITO',
    precio: '$0',
    sub: '/mes',
    precioRaw: 'Gratis para siempre',
    destacado: false,
    features: [
      '10 consultas IA/mes',
      '10 simulaciones/mes',
      '10 cálculos/mes',
      '10 productos en catálogo',
      '10 búsquedas en nomenclador',
    ],
    featuresOriginales: [
      '3 consultas IA/mes',
      '1 simulación/mes',
      '1 cálculo/mes',
      '3 productos en catálogo',
      '5 búsquedas en nomenclador',
    ],
    cta: 'Empezar gratis',
    href: '/registro',
  },
  {
    id: 'pro',
    nombre: 'PRO',
    precio: '$15.000',
    sub: '/mes',
    precioRaw: null,
    destacado: true,
    features: [
      '100 consultas IA/mes',
      'Simulador ilimitado',
      'Calculadora ilimitada',
      'Comparador ilimitado',
      'Catálogo ilimitado',
      'Nomenclador ilimitado',
      'Operaciones ilimitadas',
    ],
    cta: 'Empezar con Pro',
    href: '/registro?plan=pro',
  },
  {
    id: 'empresa',
    nombre: 'EMPRESA',
    precio: 'A MEDIDA',
    sub: null,
    precioRaw: 'Consultanos',
    destacado: false,
    features: [
      'Todo ilimitado + prioridad',
      'Múltiples usuarios',
      'Soporte prioritario',
      'Integraciones personalizadas',
    ],
    cta: 'Contactanos',
    href: 'mailto:tradeaicomex@gmail.com?subject=Consulta%20Plan%20Empresa%20%E2%80%94%20trade.ai',
  },
]

function useInView(options = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.1, ...options }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}

function FadeSection({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

  return (
    <div className="bg-surface text-on-surface font-body">

      {/* ─── 1. HEADER — cream bar with hairline ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md border-b border-hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-5 py-3">
          {/* Logo */}
          <a href="/" className="flex items-center no-underline flex-shrink-0">
            <span className="font-logo text-lg font-semibold"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'Herramientas', href: '#herramientas' },
              { label: 'Precios', href: '#precios' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-3.5 py-1.5 rounded-md text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-150 no-underline"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="/login"
              className="px-4 py-2 rounded-md text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-150 no-underline"
            >
              Iniciar sesión
            </a>
            <a
              href="/registro"
              className="px-4 py-2 rounded-md text-sm font-medium text-on-primary bg-primary hover:bg-primary-intense transition-colors duration-150 no-underline"
            >
              Empezar gratis
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-md text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-5 pb-4 bg-surface border-t border-hairline">
            <nav className="flex flex-col gap-1 mb-4 pt-3">
              {[
                { label: 'Herramientas', href: '#herramientas' },
                { label: 'Precios', href: '#precios' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors no-underline"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-2">
              <a href="/login" className="px-4 py-2.5 rounded-md text-sm text-center text-on-surface border border-hairline hover:bg-surface-high transition-colors no-underline">
                Iniciar sesión
              </a>
              <a href="/registro" className="px-4 py-2.5 rounded-md text-sm text-center font-medium text-on-primary bg-primary no-underline">
                Empezar gratis
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-40 pb-24 overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">

          <p className="font-body text-sm font-medium text-on-surface-variant mb-5">
            Comercio exterior para PYMEs argentinas
          </p>

          {/* Title */}
          <h1 className="font-display font-medium text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.05] tracking-[-1.5px] text-on-surface motion-safe:opacity-0 motion-safe:animate-[fadeInUp_0.8s_0.1s_ease_forwards]">
            Importá con la certeza de un despachante, en minutos.
          </h1>

          {/* Subtitle */}
          <p className="font-body text-lg text-on-surface-variant mt-6 mb-10 max-w-xl motion-safe:opacity-0 motion-safe:animate-[fadeInUp_0.8s_0.25s_ease_forwards]">
            Describí tu producto, elegí el origen, y trade.ai te dice cuánto sale puesto en Argentina,
            qué necesitás para importarlo legalmente, y si conviene según el país.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 motion-safe:opacity-0 motion-safe:animate-[fadeInUp_0.8s_0.4s_ease_forwards]">
            <a
              href="/registro"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-primary text-on-primary font-medium text-base hover:bg-primary-intense transition-colors duration-150 no-underline"
            >
              Empezar gratis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a
              href="#herramientas"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-surface-1 border border-hairline text-on-surface font-body font-medium text-base hover:bg-surface-high transition-colors duration-150 no-underline"
            >
              Ver cómo funciona
            </a>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 text-ink-tertiary motion-safe:animate-bounce">
            <ChevronDown size={22} />
          </div>
        </div>
      </section>

      {/* ─── QUÉ ES TRADE.AI ─── */}
      <section className="py-24 px-4 bg-surface">
        <div className="max-w-3xl mx-auto text-center">
          <FadeSection>
            <p className="font-body text-sm font-medium text-primary mb-4">Cómo funciona</p>
            <h2 className="font-display font-medium text-3xl md:text-4xl tracking-[-0.8px] text-on-surface">
              Un solo recorrido, de la idea al costo final.
            </h2>
            <p className="font-body text-lg text-on-surface-variant mt-6 leading-relaxed">
              Describís tu producto en lenguaje natural, elegís el origen, y el sistema responde
              las tres preguntas que importan: cuánto sale puesto en Argentina, qué necesitás
              para importarlo legalmente, y si conviene según el origen.
            </p>
          </FadeSection>
        </div>
      </section>

      {/* ─── HERRAMIENTAS — feature cards on cream ─── */}
      <section id="herramientas" className="py-24 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <FadeSection>
            <p className="font-body text-sm font-medium text-primary mb-4">El producto</p>
            <h2 className="font-display font-medium text-3xl md:text-4xl tracking-[-0.8px] text-on-surface mb-16">
              Dos capas de valor
            </h2>
          </FadeSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Card 1 — Recorrido guiado (col-span-2) */}
            <FadeSection className="md:col-span-2" delay={0}>
              <div className="relative h-full p-8 rounded-lg bg-surface-1 border border-hairline">
                <span className="font-body text-sm font-medium text-on-surface-variant mb-4 block">
                  Recorrido operativo
                </span>
                <h3 className="font-body text-2xl font-medium tracking-[-0.3px] text-on-surface mb-3">
                  Producto → Origen → Costo
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6 max-w-lg">
                  Tres pasos guiados que generan un informe de importación completo.
                  El informe se convierte en una operación gestionable con checklist y vista Kanban.
                </p>

                {/* Mockup */}
                <div className="bg-surface rounded-md p-5 border border-hairline-soft max-w-md">
                  <p className="font-body text-sm text-on-surface-variant italic">
                    "Notebook 14 pulgadas con SSD, desde China"
                  </p>
                  <p className="font-body text-sm text-on-surface mt-3">
                    NCM 8471.30.12. Costo puesto en Argentina: USD 1.213. Necesitás factura comercial y certificado de origen.
                  </p>
                  <span className="font-mono text-[10px] text-primary mt-3 block">trade.ai</span>
                </div>
              </div>
            </FadeSection>

            {/* Card 2 — Copiloto IA */}
            <FadeSection delay={100}>
              <div className="relative h-full p-8 rounded-lg bg-surface-1 border border-hairline flex flex-col">
                <span className="font-body text-sm font-medium text-on-surface-variant mb-4 block">
                  Copiloto IA
                </span>
                <h3 className="font-body text-xl font-medium tracking-[-0.2px] text-on-surface mb-2">
                  Consultas contextuales
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6 flex-1">
                  El copiloto entiende el informe activo y responde en lenguaje natural sobre
                  aranceles, NCM, acuerdos comerciales y documentación aduanera.
                </p>

                <div className="bg-surface rounded-md p-4 border border-hairline-soft">
                  <p className="font-body text-xs text-on-surface-variant">
                    "¿Necesito habilitación SENASA para esto?"
                  </p>
                  <p className="font-mono text-[10px] text-primary mt-2">Respuesta con fuentes oficiales</p>
                </div>
              </div>
            </FadeSection>

            {/* Card 3 — Cobertura de datos */}
            <FadeSection delay={150}>
              <div className="relative h-full p-8 rounded-lg bg-surface-1 border border-hairline flex flex-col">
                <span className="font-body text-sm font-medium text-on-surface-variant mb-4 block">
                  Datos oficiales
                </span>
                <h3 className="font-body text-xl font-medium tracking-[-0.2px] text-on-surface mb-2">
                  33.000+ posiciones NCM
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed flex-1">
                  Aranceles, preferencias arancelarias y barreras no arancelarias, actualizados
                  desde fuentes oficiales argentinas y de UNCTAD.
                </p>

                <div className="flex items-center gap-4 font-mono text-sm mt-6">
                  {[
                    { label: 'MERCOSUR', },
                    { label: 'ACE' },
                  ].map((c) => (
                    <span key={c.label} className="px-2.5 py-1 rounded-sm bg-surface text-on-surface-variant text-xs">
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </FadeSection>

            {/* Card 4 — Gestor de operaciones */}
            <FadeSection delay={200}>
              <div className="relative h-full p-8 rounded-lg bg-surface-1 border border-hairline">
                <span className="font-body text-sm font-medium text-on-surface-variant mb-4 block">
                  Operaciones
                </span>
                <h3 className="font-body text-xl font-medium tracking-[-0.2px] text-on-surface mb-2">
                  Gestioná tus importaciones
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  Checklist inteligente de documentos y vista Kanban por estado de operación.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    { label: 'Factura comercial', done: true },
                    { label: 'Certificado de origen', done: true },
                    { label: 'Habilitación SENASA', done: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 font-mono text-sm">
                      <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${item.done ? 'border-primary bg-primary/10' : 'border-hairline'}`}>
                        {item.done && (
                          <svg className="w-2.5 h-2.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className={item.done ? 'text-ink-subtle line-through' : 'text-on-surface-variant'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>

            {/* Card 5 — Deep-link tools */}
            <FadeSection delay={250}>
              <div className="relative h-full p-8 rounded-lg bg-surface-1 border border-hairline overflow-hidden">
                <span className="font-body text-sm font-medium text-on-surface-variant mb-4 block">
                  Herramientas avanzadas
                </span>
                <h3 className="font-body text-xl font-medium tracking-[-0.2px] text-on-surface mb-2">
                  Nomenclador, calculadora y comparador
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  Accesibles cuando necesitás más control sobre la clasificación o el cálculo.
                </p>
                {/* Watermark */}
                <span className="absolute bottom-4 right-5 font-mono text-3xl text-hairline select-none pointer-events-none">
                  8422.40.10
                </span>
              </div>
            </FadeSection>

          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-16 px-4 bg-surface border-t border-hairline">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            {[
              { num: '33.000+', label: 'Posiciones NCM' },
              { num: '52.500+', label: 'Preferencias arancelarias' },
              { num: 'MERCOSUR · ACE', label: 'Acuerdos cubiertos' },
              { num: 'Oficiales', label: 'Datos actualizados' },
            ].map((stat, i) => (
              <FadeSection key={i} className="flex flex-col items-center text-center" delay={i * 80}>
                <div className="font-display font-medium text-2xl tracking-[-0.5px] text-on-surface leading-none">
                  {stat.num}
                </div>
                <div className="font-body text-xs text-ink-subtle mt-2">
                  {stat.label}
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLANES ─── */}
      <section id="precios" className="py-24 px-4 bg-surface">
        <div className="max-w-5xl mx-auto">
          <FadeSection>
            <p className="font-body text-sm font-medium text-primary text-center mb-4">Precios</p>
            <h2 className="font-display font-medium text-3xl md:text-4xl tracking-[-0.8px] text-on-surface text-center mb-4">
              Elegí tu plan
            </h2>
            <p className="font-body text-on-surface-variant text-center mb-16">
              Sin compromiso. Cancelá cuando quieras.
            </p>
          </FadeSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANES.map((plan, i) => (
              <FadeSection key={plan.id} delay={i * 100}>
                <div className={`relative flex flex-col h-full p-8 rounded-lg border transition-colors duration-150 ${
                  plan.destacado
                    ? 'bg-on-surface border-on-surface text-on-primary'
                    : 'bg-surface-1 border-hairline'
                }`}>

                  {plan.destacado && (
                    <div className="absolute -top-3 left-8 font-body text-[10px] font-medium px-3 py-1 rounded-full bg-primary text-on-primary">
                      RECOMENDADO
                    </div>
                  )}

                  <div className="mb-6">
                    <div className={`font-body text-sm font-medium mb-2 ${
                      plan.destacado ? 'text-white/70' : 'text-on-surface-variant'
                    }`}>
                      {plan.nombre}
                    </div>
                    <div className={`font-display font-medium leading-none tracking-[-0.5px] ${
                      plan.nombre === 'EMPRESA' ? 'text-3xl' : 'text-5xl'
                    } ${plan.destacado ? 'text-on-primary' : 'text-on-surface'}`}>
                      {plan.precio}
                    </div>
                    {plan.sub && (
                      <div className={`font-body text-sm mt-1 ${plan.destacado ? 'text-white/70' : 'text-on-surface-variant'}`}>{plan.sub}</div>
                    )}
                    {!plan.sub && plan.precioRaw && (
                      <div className={`font-body text-sm mt-1 ${plan.destacado ? 'text-white/70' : 'text-on-surface-variant'}`}>{plan.precioRaw}</div>
                    )}
                  </div>

                  <div className={`h-px my-6 ${plan.destacado ? 'bg-white/15' : 'bg-hairline'}`} />

                  <ul className="flex flex-col gap-3 flex-1">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className={`flex items-start gap-3 font-body text-sm ${plan.destacado ? 'text-white/80' : 'text-on-surface-variant'}`}>
                        <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.destacado ? 'text-primary' : 'text-primary'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {plan.featuresOriginales && (
                    <div className="mt-5 p-3 bg-primary/5 border border-primary/20 rounded-md">
                      <p className="font-body text-[11px] font-medium text-primary mb-2">Límites ampliados — Fase Beta</p>
                      <div className="space-y-1">
                        {plan.featuresOriginales.map((f, fi) => (
                          <div key={fi} className="flex items-center gap-2">
                            <span className="font-body text-[10px] text-ink-tertiary line-through">{f}</span>
                            <span className="font-body text-[10px] text-primary">→ {plan.features[fi]}</span>
                          </div>
                        ))}
                      </div>
                      <p className="font-body text-[10px] text-ink-tertiary mt-2 leading-relaxed">
                        Válido mientras dure la versión beta.
                      </p>
                    </div>
                  )}

                  <a
                    href={plan.href}
                    className={`mt-8 block text-center px-6 py-3 rounded-md font-body text-sm font-medium transition-colors duration-150 no-underline ${
                      plan.destacado
                        ? 'bg-primary text-on-primary hover:bg-primary-intense'
                        : 'border border-hairline text-on-surface hover:bg-surface-high'
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="py-24 px-4 bg-surface">
        <div className="max-w-3xl mx-auto">
          <FadeSection>
            <div className="rounded-lg bg-surface-1 border border-hairline p-12 text-center">
              <h2 className="font-display font-medium text-3xl md:text-4xl tracking-[-0.6px] text-on-surface">
                Empezá hoy
              </h2>
              <p className="font-body text-lg text-on-surface-variant mt-4 mb-10">
                La herramienta que faltaba para las PYMEs que importan ocasionalmente.
              </p>
              <a
                href="/registro"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-md bg-primary text-on-primary font-medium text-base hover:bg-primary-intense transition-colors duration-150 no-underline"
              >
                Crear cuenta gratis
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-16 px-4 bg-surface border-t border-hairline">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">
            {/* Brand */}
            <div>
              <div>
                <span className="font-logo text-xl font-semibold"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span>
              </div>
              <p className="font-body text-sm text-ink-subtle mt-2">
                Comercio exterior para PYMEs argentinas
              </p>
              <p className="font-body text-sm text-ink-tertiary mt-1">
                Hecho en Argentina
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-8">
              {[
                { label: 'Herramientas', href: '#herramientas' },
                { label: 'Precios', href: '#precios' },
                { label: 'Términos', href: '/terminos' },
                { label: 'Privacidad', href: '/privacidad' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="font-body text-sm text-ink-subtle hover:text-on-surface transition-colors no-underline"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="border-t border-hairline-soft pt-8 text-center">
            <p className="font-body text-xs text-ink-tertiary max-w-2xl mx-auto leading-relaxed">
              La información provista es orientativa y está respaldada por documentos oficiales públicos.
              No reemplaza el asesoramiento de un despachante de aduana habilitado.
            </p>
            <p className="font-mono text-xs text-ink-tertiary mt-4">
              © {new Date().getFullYear()} trade.ai
            </p>
          </div>
        </div>
      </footer>

      {/* Keyframes injected via style tag */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
