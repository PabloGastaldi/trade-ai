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
      'Consultas IA ilimitadas',
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
      className={`transition-all duration-700 ease-out ${className}`}
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

      {/* ─── 1. HEADER — pill flotante ─── */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
        <div className="flex items-center justify-between gap-3 px-5 py-2.5 rounded-full bg-surface/60 backdrop-blur-2xl border border-white/[0.06] shadow-lg shadow-black/20">
          {/* Logo */}
          <a href="/" className="flex items-center no-underline flex-shrink-0">
            <span className="font-logo text-lg"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span>
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
                className="px-3.5 py-1.5 rounded-full text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-150 no-underline"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="/login"
              className="px-4 py-2 rounded-lg text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-150 no-underline"
            >
              Iniciar sesión
            </a>
            <a
              href="/registro"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-on-primary bg-primary-intense hover:bg-primary hover:shadow-[0_0_20px_rgba(221,217,42,0.25)] transition-all duration-150 no-underline"
            >
              Empezar gratis
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden mt-2 p-4 rounded-2xl bg-surface/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl">
            <nav className="flex flex-col gap-1 mb-4">
              {[
                { label: 'Herramientas', href: '#herramientas' },
                { label: 'Precios', href: '#precios' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-sm text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] transition-colors no-underline"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-2">
              <a href="/login" className="px-4 py-2.5 rounded-xl text-sm text-center text-on-surface-variant border border-white/[0.08] hover:text-on-surface transition-colors no-underline">
                Iniciar sesión
              </a>
              <a href="/registro" className="px-4 py-2.5 rounded-xl text-sm text-center font-semibold text-on-primary bg-primary-intense no-underline">
                Empezar gratis
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
        {/* Atmospheric glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(221,217,42,0.04) 0%, transparent 70%)',
          }} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto">


          {/* Title */}
          <h1 className="font-logo text-[clamp(5rem,15vw,14rem)] leading-none text-on-surface opacity-0 animate-[fadeInUp_0.8s_0.2s_ease_forwards]">
            <span>trade</span><span className="text-primary">.ai</span>
          </h1>

          {/* Subtitle */}
          <p className="font-body text-xl md:text-2xl text-on-surface-variant font-light tracking-wide mt-10 mb-4 max-w-xl opacity-0 animate-[fadeInUp_0.8s_0.4s_ease_forwards]">
            Donde el comercio se vuelve inteligente.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10 opacity-0 animate-[fadeInUp_0.8s_0.6s_ease_forwards]">
            <a
              href="/registro"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary-intense text-on-primary font-semibold text-base hover:shadow-[0_0_30px_rgba(221,217,42,0.25)] transition-all duration-200 no-underline"
            >
              Empezar gratis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a
              href="#herramientas"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/[0.05] backdrop-blur-sm border border-white/[0.1] text-on-surface font-medium text-base hover:bg-white/[0.1] transition-all duration-200 no-underline"
            >
              Ver herramientas
            </a>
          </div>

          {/* Scroll indicator */}
          <div className="mt-20 opacity-30 animate-bounce">
            <ChevronDown size={24} className="text-on-surface-variant" />
          </div>
        </div>
      </section>

      {/* ─── QUÉ ES TRADE.AI ─── */}
      <section className="py-32 px-4 bg-surface">
        <div className="max-w-5xl mx-auto text-center">
          <FadeSection>
            <h2 className="font-display text-5xl md:text-6xl tracking-wider text-on-surface">
              UNA PLATAFORMA.
              <br />
              TODO EL COMERCIO EXTERIOR.
            </h2>
            <p className="font-body text-lg text-on-surface-variant mt-8 max-w-2xl mx-auto leading-relaxed">
              Gestioná operaciones de exportación e importación de principio a fin.
              Calculá costos, controlá documentación, y consultá normativa con un
              asistente de IA especializado en comercio exterior argentino.
            </p>
          </FadeSection>
        </div>
      </section>

      {/* ─── HERRAMIENTAS — Bento Grid ─── */}
      <section id="herramientas" className="py-24 px-4 bg-surface-low">
        <div className="max-w-6xl mx-auto">
          <FadeSection>
            <h2 className="font-display text-5xl md:text-6xl tracking-wider text-on-surface mb-16">
              HERRAMIENTAS
            </h2>
          </FadeSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Card 1 — Chat IA (col-span-2) */}
            <FadeSection className="md:col-span-2 group" delay={0}>
              <div className="relative h-full p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.04] hover:bg-white/[0.06] hover:scale-[1.01] transition-all duration-300">
                <span className="font-mono text-xs tracking-widest uppercase text-primary mb-4 block">
                  ASISTENTE IA
                </span>
                <h3 className="font-body text-2xl font-semibold text-on-surface mb-3">
                  Chat con IA especializado
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6 max-w-lg">
                  Consultá sobre aranceles, documentación y normativa en lenguaje natural.
                  Respuestas con fuentes oficiales citadas.
                </p>

                {/* Chat mockup */}
                <div className="bg-surface/80 rounded-xl p-5 border border-white/[0.04] max-w-md">
                  <p className="font-body text-sm text-on-surface-variant italic">
                    "¿Puedo exportar galletas de chocolate a Chile?"
                  </p>
                  <p className="font-body text-sm text-on-surface mt-3">
                    Sí, con arancel 0% gracias al ACE-35. NCM 1905.31.00. Necesitás habilitación INAL y certificado de origen.
                  </p>
                  <span className="font-mono text-[10px] text-primary mt-3 block">trade.ai</span>
                </div>
              </div>
            </FadeSection>

            {/* Card 2 — Calculadora */}
            <FadeSection className="group" delay={100}>
              <div className="relative h-full p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.04] hover:bg-white/[0.06] hover:scale-[1.01] transition-all duration-300 flex flex-col">
                <span className="font-mono text-xs tracking-widest uppercase text-primary mb-4 block">
                  CALCULADORA
                </span>
                <h3 className="font-body text-xl font-semibold text-on-surface mb-2">
                  Calculá costos de importación y exportación
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6 flex-1">
                  Compará regímenes: general, courier, PEF. Encontrá la opción más económica.
                </p>

                {/* Calc mockup */}
                <div className="bg-surface/80 rounded-xl p-4 border border-white/[0.04] space-y-2">
                  {[
                    { label: 'Régimen General', val: '$1,986', dim: true },
                    { label: 'Courier', val: '$1,607', dim: true },
                    { label: 'PEF Personal', val: '$1,607', best: true },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center font-mono text-sm">
                      <span className={row.dim ? 'text-on-surface-variant' : 'text-on-surface'}>
                        {row.label}
                      </span>
                      <span className={row.best ? 'text-primary font-semibold' : 'text-on-surface-variant'}>
                        {row.val}
                        {row.best && <span className="ml-2 text-[10px] tracking-wide">✓ MEJOR</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>

            {/* Card 3 — Comparador */}
            <FadeSection className="group" delay={150}>
              <div className="relative h-full p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.04] hover:bg-white/[0.06] hover:scale-[1.01] transition-all duration-300 flex flex-col">
                <span className="font-mono text-xs tracking-widest uppercase text-primary mb-4 block">
                  COMPARADOR
                </span>
                <h3 className="font-body text-xl font-semibold text-on-surface mb-2">
                  21 países, un solo clic
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6 flex-1">
                  Compará aranceles y costos entre destinos.
                </p>

                {/* Country flags mockup */}
                <div className="flex items-center gap-4 font-mono text-sm">
                  {[
                    { flag: 'US', price: '$1,608' },
                    { flag: 'BR', price: '$2,062' },
                    { flag: 'CN', price: '$1,213' },
                  ].map((c) => (
                    <div key={c.flag} className="flex items-center gap-2 text-on-surface-variant">
                      <span className="text-base">{c.flag}</span>
                      <span className="text-on-surface">{c.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>

            {/* Card 4 — Gestor de operaciones */}
            <FadeSection className="group" delay={200}>
              <div className="relative h-full p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.04] hover:bg-white/[0.06] hover:scale-[1.01] transition-all duration-300">
                <span className="font-mono text-xs tracking-widest uppercase text-primary mb-4 block">
                  OPERACIONES
                </span>
                <h3 className="font-body text-xl font-semibold text-on-surface mb-2">
                  Gestioná expo e impo
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  Checklist inteligente de documentos y alertas de vencimiento.
                </p>

                {/* Progress mockup */}
                <div className="mt-6 space-y-3">
                  {[
                    { label: 'Factura comercial', done: true },
                    { label: 'Certificado de origen', done: true },
                    { label: 'Habilitación SENASA', done: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 font-mono text-sm">
                      <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${item.done ? 'border-primary bg-primary/20' : 'border-white/20'}`}>
                        {item.done && (
                          <svg className="w-2.5 h-2.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className={item.done ? 'text-on-surface-variant line-through opacity-50' : 'text-on-surface-variant'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>

            {/* Card 5 — NCM */}
            <FadeSection className="group" delay={250}>
              <div className="relative h-full p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.04] hover:bg-white/[0.06] hover:scale-[1.01] transition-all duration-300 overflow-hidden">
                <span className="font-mono text-xs tracking-widest uppercase text-primary mb-4 block">
                  NCM
                </span>
                <h3 className="font-body text-xl font-semibold text-on-surface mb-2">
                  10.000+ posiciones
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  Aranceles, preferencias y organismos.
                </p>
                {/* Watermark */}
                <span className="absolute bottom-4 right-5 font-mono text-3xl text-white/[0.06] select-none pointer-events-none">
                  8422.40.10
                </span>
              </div>
            </FadeSection>

          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-20 px-4 bg-surface">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            {[
              { num: '10.000+', label: 'POSICIONES NCM' },
              { num: '100+', label: 'FUENTES OFICIALES' },
              { num: '21', label: 'PAÍSES' },
              { num: '24/7', label: 'DISPONIBLE' },
            ].map((stat, i) => (
              <FadeSection key={i} className="flex flex-col items-center" delay={i * 80}>
                <div className="font-display text-6xl text-on-surface tracking-wide leading-none">
                  {stat.num}
                </div>
                <div className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mt-3">
                  {stat.label}
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLANES ─── */}
      <section id="precios" className="py-32 px-4 bg-surface-low">
        <div className="max-w-5xl mx-auto">
          <FadeSection>
            <h2 className="font-display text-5xl md:text-6xl tracking-wider text-on-surface text-center mb-4">
              PRECIOS
            </h2>
            <p className="font-body text-on-surface-variant text-center mb-16">
              Sin compromiso. Cancelá cuando quieras.
            </p>
          </FadeSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANES.map((plan, i) => (
              <FadeSection key={plan.id} delay={i * 100}>
                <div className={`relative flex flex-col h-full p-8 rounded-2xl bg-white/[0.03] border transition-all duration-200 hover:scale-[1.02] ${
                  plan.destacado
                    ? 'border-primary/30 shadow-[0_0_40px_rgba(221,217,42,0.04)]'
                    : 'border-white/[0.04] hover:border-white/[0.08]'
                }`}>

                  {plan.destacado && (
                    <div className="absolute -top-3 left-8 font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded-full bg-primary-intense/10 text-primary">
                      RECOMENDADO
                    </div>
                  )}

                  <div className="mb-6">
                    <div className={`font-mono text-sm tracking-widest uppercase mb-2 ${
                      plan.destacado ? 'text-primary' : 'text-on-surface-variant'
                    }`}>
                      {plan.nombre}
                    </div>
                    <div className={`font-display leading-none ${
                      plan.nombre === 'EMPRESA' ? 'text-4xl' : 'text-7xl'
                    } text-on-surface tracking-wide`}>
                      {plan.precio}
                    </div>
                    {plan.sub && (
                      <div className="font-body text-sm text-on-surface-variant mt-1">{plan.sub}</div>
                    )}
                    {!plan.sub && plan.precioRaw && (
                      <div className="font-body text-sm text-on-surface-variant mt-1">{plan.precioRaw}</div>
                    )}
                  </div>

                  <div className="h-px bg-white/10 my-6" />

                  <ul className="flex flex-col gap-3 flex-1">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-3 font-body text-sm text-on-surface-variant">
                        <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {plan.featuresOriginales && (
                    <div className="mt-5 p-3 bg-primary/5 border border-primary/15 rounded-xl">
                      <p className="font-body text-[11px] font-semibold text-primary/80 mb-2">Límites ampliados — Fase Beta</p>
                      <div className="space-y-1">
                        {plan.featuresOriginales.map((f, fi) => (
                          <div key={fi} className="flex items-center gap-2">
                            <span className="font-body text-[10px] text-on-surface-variant/40 line-through">{f}</span>
                            <span className="font-body text-[10px] text-primary/70">→ {plan.features[fi]}</span>
                          </div>
                        ))}
                      </div>
                      <p className="font-body text-[10px] text-on-surface-variant/40 mt-2 leading-relaxed">
                        Válido mientras dure la versión beta.
                      </p>
                    </div>
                  )}

                  <a
                    href={plan.href}
                    className={`mt-8 block text-center px-6 py-3 rounded-xl font-body text-sm transition-all duration-150 no-underline ${
                      plan.destacado
                        ? 'bg-primary-intense text-on-primary font-semibold hover:bg-primary hover:shadow-[0_0_20px_rgba(221,217,42,0.2)]'
                        : 'border border-white/[0.1] text-on-surface hover:bg-white/[0.05]'
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
      <section className="py-32 px-4 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <FadeSection>
            <h2 className="font-display text-7xl md:text-8xl tracking-wider text-on-surface">
              EMPEZÁ HOY
            </h2>
            <p className="font-body text-lg text-on-surface-variant mt-6 mb-12">
              La herramienta que faltaba en el comercio exterior argentino.
            </p>
            <a
              href="/registro"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-intense text-on-primary font-semibold text-lg hover:shadow-[0_0_30px_rgba(221,217,42,0.25)] transition-all duration-200 no-underline"
            >
              Crear cuenta gratis
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </FadeSection>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-16 px-4 bg-surface border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">
            {/* Brand */}
            <div>
              <div>
                <span className="font-logo text-xl"><span className="text-on-surface-variant">trade</span><span className="text-primary">.ai</span></span>
              </div>
              <p className="font-body text-sm text-on-surface-variant/60 mt-2">
                Plataforma de comercio exterior con IA
              </p>
              <p className="font-body text-sm text-on-surface-variant/40 mt-1">
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
                  className="font-body text-sm text-on-surface-variant/60 hover:text-on-surface transition-colors no-underline"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="border-t border-white/[0.04] pt-8 text-center">
            <p className="font-body text-xs text-on-surface-variant/40 max-w-2xl mx-auto leading-relaxed">
              La información provista es orientativa y está respaldada por documentos oficiales públicos.
              No reemplaza el asesoramiento de un despachante de aduana habilitado.
            </p>
            <p className="font-mono text-xs text-on-surface-variant/30 mt-4">
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
