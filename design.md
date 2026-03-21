# trade.ai — Design System v2.0

## Concepto Visual

**Dirección estética:** Dark luxury tech — como Bloomberg Terminal 
meets fintech moderna. Profesional pero con personalidad. El efecto 
de glow azul difuso (inspirado en Halo AI) da profundidad y 
sofisticación sin ser infantil.

**Tono:** Serio pero accesible. No es un banco, no es un startup 
colorido. Es la herramienta de trabajo de un profesional de 
comercio exterior que valora su tiempo.

**Diferenciador visual:** El glow azul ambiental que "respira" 
detrás del contenido. No es un gradiente plano — es una atmósfera.

---

## Paleta de Colores

### Fondos (de más oscuro a más claro)
```css
--bg-deepest:    #050508;     /* fondo del body, lo más oscuro */
--bg-base:       #0a0d14;     /* fondo principal de la app */
--bg-surface:    #111827;     /* cards, paneles, sidebar */
--bg-elevated:   #1a2235;     /* elementos elevados, modals */
--bg-hover:      #1e293b;     /* hover states */
```

### Bordes
```css
--border-subtle:  #1e293b;    /* bordes sutiles entre secciones */
--border-default: #2a3a58;    /* bordes de cards y inputs */
--border-focus:   #0070FF40;  /* borde de focus con transparencia */
```

### Texto
```css
--text-primary:   #f0f4fc;    /* texto principal, alta legibilidad */
--text-secondary: #94a3b8;    /* texto secundario, descripciones */
--text-muted:     #64748b;    /* texto terciario, hints, placeholders */
--text-disabled:  #334155;    /* texto deshabilitado */
```

### Accent (azul principal — identidad de trade.ai)
```css
--accent:         #0070FF;    /* botones primarios, links, CTAs */
--accent-hover:   #0062e0;    /* hover del accent */
--accent-light:   #43b7f5;    /* highlights, badges, decorativo */
--accent-glow:    #0070FF20;  /* glow sutil para bordes y sombras */
--accent-glow-strong: #0070FF40; /* glow más fuerte para hero */
```

### Secundario (naranja/ámbar — alertas, badges, premium)
```css
--secondary:      #F59E0B;    /* badges de plan, alertas, precio */
--secondary-hover:#D97706;    /* hover */
--secondary-muted:#F59E0B20;  /* background sutil de badges */
```

### Semánticos
```css
--success:        #10b981;    /* confirmaciones, docs completos */
--success-muted:  #10b98120;
--warning:        #F59E0B;    /* alertas, vencimientos cercanos */
--warning-muted:  #F59E0B20;
--error:          #ef4444;    /* errores, docs faltantes críticos */
--error-muted:    #ef444420;
--info:           #43b7f5;    /* información, tips */
--info-muted:     #43b7f520;
```

---

## Tipografía

### Fonts
```css
/* Display / Headlines — personalidad, impacto */
--font-display: 'Syne', sans-serif;
/* 
  Syne es angular, moderna, con carácter. 
  Perfecta para headlines y el logo.
  Pesos: 400, 500, 600, 700, 800
*/

/* Body / UI — legibilidad, profesionalismo */
--font-body: 'DM Sans', sans-serif;
/*
  DM Sans es limpia, geométrica, excelente legibilidad.
  Mejor que Inter para este contexto.
  Pesos: 300, 400, 500, 700
*/

/* Mono — datos, códigos NCM, números */
--font-mono: 'JetBrains Mono', monospace;
/*
  Para códigos NCM (0902.30.00), aranceles (20.0%), 
  montos (USD 1,350.00). Da aspecto técnico/profesional.
  Peso: 400, 500
*/
```

### Escala tipográfica
```css
--text-xs:    0.65rem;   /* 10.4px — micro labels, badges */
--text-sm:    0.75rem;   /* 12px — labels, footnotes */
--text-base:  0.875rem;  /* 14px — body text principal */
--text-md:    0.95rem;   /* 15.2px — body destacado */
--text-lg:    1.125rem;  /* 18px — subtítulos */
--text-xl:    1.5rem;    /* 24px — títulos de sección */
--text-2xl:   2rem;      /* 32px — títulos de página */
--text-3xl:   2.5rem;    /* 40px — hero mobile */
--text-4xl:   3.5rem;    /* 56px — hero desktop */
--text-5xl:   4.5rem;    /* 72px — hero impacto máximo */
```

### Aplicación
```
Logo "trade.ai"    → Syne 700, text-xl
Headlines hero     → Syne 700, text-4xl/text-5xl
Títulos de página  → Syne 600, text-2xl
Subtítulos         → DM Sans 500, text-lg
Body text          → DM Sans 400, text-base, line-height 1.7
Labels/UI          → DM Sans 500, text-sm, letter-spacing 0.05em
Badges             → DM Sans 500, text-xs, uppercase, letter-spacing 0.1em
Datos numéricos    → JetBrains Mono 500, text-base
Códigos NCM        → JetBrains Mono 400, text-sm
Precios grandes    → JetBrains Mono 500, text-xl
```

---

## Espaciado y Layout

### Spacing Scale
```css
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
```

### Border Radius
```css
--radius-sm:   6px;    /* badges, tags */
--radius-md:   8px;    /* inputs, botones */
--radius-lg:   12px;   /* cards */
--radius-xl:   16px;   /* modals, panels grandes */
--radius-full: 9999px; /* pills, avatares */
```

### Breakpoints
```css
--mobile:  640px;
--tablet:  1024px;
--desktop: 1280px;
--wide:    1536px;
```

### Layout
```
Sidebar:        250px (desktop), 60px (colapsado), 0 (mobile)
Content max:    1200px (centrado con auto margins)
Card padding:   space-5 (20px)
Section gap:    space-12 (48px) entre secciones
Grid gap:       space-4 (16px) entre cards
```

---

## Componentes Base

### Botones
```css
/* Primario */
.btn-primary {
  background: var(--accent);
  color: white;
  font: 500 var(--text-sm) var(--font-body);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  border: none;
  letter-spacing: 0.02em;
  transition: all 0.2s;
  cursor: pointer;
}
.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 0 20px var(--accent-glow);
  transform: translateY(-1px);
}

/* Secundario (outline) */
.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  /* resto igual que primary */
}
.btn-secondary:hover {
  color: var(--text-primary);
  border-color: var(--accent);
  background: var(--accent-glow);
}

/* Ghost (sin borde) */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
}
.btn-ghost:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}
```

### Cards
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: all 0.2s;
}
.card:hover {
  border-color: var(--border-default);
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}
.card-highlighted {
  border-color: var(--accent);
  box-shadow: 0 0 30px var(--accent-glow);
}
```

### Inputs
```css
.input {
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  color: var(--text-primary);
  font: 400 var(--text-base) var(--font-body);
  transition: all 0.2s;
}
.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
  outline: none;
}
.input::placeholder {
  color: var(--text-muted);
}
```

### Badges
```css
.badge {
  font: 500 var(--text-xs) var(--font-body);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 3px 8px;
  border-radius: var(--radius-full);
}
.badge-accent {
  color: var(--accent-light);
  background: var(--accent-glow);
  border: 1px solid var(--accent-glow-strong);
}
.badge-secondary {
  color: var(--secondary);
  background: var(--secondary-muted);
  border: 1px solid var(--secondary)30;
}
.badge-success {
  color: var(--success);
  background: var(--success-muted);
}
.badge-error {
  color: var(--error);
  background: var(--error-muted);
}
```

---

## Efectos Especiales

### Glow ambiental (el efecto Halo AI)
```css
/* Glow principal — detrás del hero */
.glow-hero {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(
      ellipse 80% 50% at 50% -20%, 
      rgba(0, 112, 255, 0.15) 0%, 
      transparent 60%
    ),
    radial-gradient(
      ellipse 60% 40% at 20% 50%, 
      rgba(0, 112, 255, 0.08) 0%, 
      transparent 50%
    ),
    radial-gradient(
      ellipse 40% 60% at 80% 80%, 
      rgba(67, 183, 245, 0.05) 0%, 
      transparent 50%
    );
}

/* Glow pulsante sutil (opcional, para el hero) */
@keyframes glow-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.glow-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle 400px at 50% 30%, 
    rgba(0, 112, 255, 0.1) 0%, 
    transparent 70%
  );
  animation: glow-pulse 8s ease-in-out infinite;
}
```

### Backdrop blur (para headers y sidebars)
```css
.backdrop {
  background: rgba(10, 13, 20, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

### Animaciones de entrada
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Staggered entrance — aplicar con animation-delay */
.animate-in {
  opacity: 0;
  animation: fadeUp 0.6s ease forwards;
}
.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }
.delay-4 { animation-delay: 0.4s; }
.delay-5 { animation-delay: 0.5s; }
```

### Grain overlay (textura sutil)
```css
.grain::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1000;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}
```

---

## Landing Page — Estructura

### Secciones
1. HERO — título + subtítulo + CTAs + card de ejemplo + stats
2. FEATURES — qué podés hacer con trade.ai (6 cards)
3. CÓMO FUNCIONA — 3 pasos con visual
4. CALCULADORA PREVIEW — demo interactiva (o mockup)
5. PLANES — 3 cards de pricing
6. FOOTER — links, disclaimer, "Hecho en Argentina"

### Scrollbar custom
```css
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { 
  background: var(--border-default); 
  border-radius: 2px; 
}
```
