# trade.ai — Design System

## Concepto Visual

**Dirección estética:** Dark luxury tech — ambiente oscuro profesional con acentos amarillo
que dan energía y distinción. Inspirado en interfaces de terminal modernas con calidez.

**Tono:** Serio y profesional. Herramienta de trabajo para profesionales de comercio
exterior. Sin gradientes llamativos. El amarillo es el único color de acento —
todo lo demás es superficie oscura o gris.

**Diferenciador:** El amarillo (`#DDD92A`) como identidad — se usa para elementos
activos, CTAs, links y badges destacados. Nada más debe ser amarillo.

---

## Paleta de Colores

### Fondos (de más oscuro a más claro)
```
--surface:           #1A191C   /* fondo principal de la app */
--surface-low:       #1f1e21   /* surface más oscura */
--surface-container: #242327   /* cards, containers */
--surface-high:      #2a292e   /* elementos elevados */
--surface-highest:   #313035   /* inputs, campos */
```

### Sidebar / MobileNav
```
#111013   /* más oscuro que surface — contraste deliberado */
```

### Texto
```
--on-surface:         #F5F5F5   /* texto principal */
--on-surface-variant: #9E9DA0   /* texto secundario, labels */
```

### Primario (amarillo — identidad de trade.ai)
```
--primary:        #DDD92A   /* color principal, CTAs, links activos */
--primary-intense: #EAE151  /* hover de botones primarios */
--on-primary:     #1A191C   /* texto oscuro sobre fondo amarillo */
```

### Semánticos
```
success:  text-emerald-400 / bg-emerald-500/10
error:    text-red-400     / bg-red-500/10
warning:  text-amber-400
```

---

## Tipografía

### Fonts
```
font-display → Bebas Neue    (solo landing/auth — NUNCA en app interna)
font-body    → Inter         (app interna, títulos de sección, body)
font-mono    → Space Grotesk (números, códigos NCM, montos)
font-logo    → Salin         (SOLO el logo "trade.ai")
```

### Reglas por contexto
- **Landing / auth:** `font-display` (Bebas Neue) en títulos grandes
- **App interna** `app/(app)/`: `font-body` (Inter) en TODOS los títulos — cero Bebas Neue
- **Logo** en todos lados: `font-logo` (Salin), siempre lowercase

### Logo JSX estándar
```jsx
<span className="font-logo">
  <span className="text-on-surface">trade</span>
  <span className="text-primary">.ai</span>
</span>
```

### Escala tipográfica
```
font-display text-5xl  → títulos hero landing (3rem)
font-display text-2xl  → headlines landing/auth
font-body text-2xl font-semibold → títulos de página en app (PageLayout)
font-body text-base    → body principal
font-body text-sm      → UI labels, metadata
font-body text-xs      → hints, footnotes
font-mono text-sm      → datos numéricos, códigos NCM
font-mono text-[10px]  → micro labels, badges
```

---

## Espaciado y Border Radius

```
rounded-sm:  6px    /* badges, tags pequeños */
rounded:     8px    /* inputs, botones */
rounded-lg:  12px   /* cards */
rounded-xl:  16px   /* cards grandes, modals */
rounded-2xl: 24px   /* panels grandes */
```

### Breakpoints
```
mobile:  < 768px    → MobileNav (header + bottom tabs + drawer)
desktop: ≥ 1024px   → Sidebar fija (250px) + contenido
```

---

## Componentes Base

### Cards
```
Base:      bg-white/[0.03] border border-white/[0.04] rounded-2xl
Destacada: border border-primary/20
Glass:     bg-white/[0.03] backdrop-blur-xl
```

### Botones (Button.js)
```
primary:   bg-primary-intense text-on-primary hover:shadow-[0_0_20px_rgba(221,217,42,0.2)]
secondary: bg-white/[0.05] text-on-surface hover:bg-white/[0.08]
ghost:     bg-transparent text-on-surface-variant hover:bg-white/[0.06]
danger:    bg-red-500/10 text-red-400 border border-red-500/20
```

### Inputs (Input.js)
```
Base:   bg-surface-highest rounded-xl px-4 py-3
Focus:  border border-primary/30 outline-none
Error:  border border-red-500/50
Label:  font-body text-xs text-on-surface-variant mb-1.5
Hint:   font-body text-[10px] text-on-surface-variant/60 mt-1
```

### Badges (Badge.jsx)
```
primary: bg-primary/10 text-primary
success: bg-emerald-500/10 text-emerald-400
error:   bg-red-500/10 text-red-400
neutral: bg-white/[0.06] text-on-surface-variant
```

---

## Layout App Shell

### Desktop (≥1024px)
```
Sidebar:  position fixed, left:0, top:0, bottom:0, width:250px, bg:#111013
Content:  margin-left:250px, overflow-y auto
```

### Mobile (<768px)
```
Header:      position fixed, top:0, height:52px, bg:#111013
             Logo izquierda + botón hamburguesa derecha
Content:     margin-top:52px, padding-bottom:60px
Bottom tabs: position fixed, bottom:0, height:60px, bg:#111013
             4 tabs: Chat, Calculadora, Operaciones, Más
Drawer:      position fixed, bottom:60px, translateY(100%) → (0) al abrir
             Contiene: email, plan badge, todos los links, logout
```

### Navegación Sidebar (Desktop)
```
Secciones: Chat IA, Herramientas, Mi negocio, Cuenta
Items:     Icono Lucide (16px, stroke-width:1.5) + label
Activo:    border-left-color:primary + bg-primary/6 + icono text-primary
Hover:     bg-white/[0.04]
Logout:    Botón abajo del sidebar
```

---

## Chat / Consulta

### Estructura
```
Container:   flex-col min-h-screen bg-surface
Messages:    flex-1 overflow-y-auto, max-w-3xl mx-auto
Bubble IA:   px-4 py-3 rounded-2xl rounded-bl-sm
Bubble User: px-4 py-3 rounded-2xl rounded-br-sm, bg-white/[0.06]
Cursor:      ▌ (w-0.5 h-3.5 bg-primary animate-pulse)
Input:       bg-surface-low/80 backdrop-blur-xl border-t border-white/[0.04]
```

### Markdown render (ReactMarkdown + remarkGfm)
```
p:          mb-1.5 last:mb-0 leading-relaxed
h2:         font-body text-base mt-3 mb-1 pb-1 border-b border-white/[0.06]
h3:         font-semibold text-sm mt-3 mb-1
table:      overflow-x-auto rounded-xl border border-white/[0.06]
th:         text-xs font-semibold text-primary uppercase
td:         px-3 py-2 border-b border-white/[0.04]
code:       bg-surface-high text-primary text-xs font-mono px-1.5 py-0.5 rounded
blockquote: border-l-2 border-primary/30 pl-3 my-1.5 italic
strong:     font-semibold text-on-surface
```

---

## Auth pages (login, registro, etc.)

### Split-screen
```
Container:  flex min-h-screen items-center justify-center gap-12 px-8 bg-surface
Left card:  w-[500px] h-[600px] — solo branding, NUNCA w-1/2
Right form: w-[400px] shrink-0
NO USAR:    flex-1, w-1/2
```
Auth layout.js: solo `bg-surface min-h-screen` — SIN flex center wrapper.
`LeftBrandingCard` es componente reutilizable para recuperar-password y reset-password.

---

## Iconografía — Lucide React

```
Chat IA:     MessageSquare
Nomenclador: BookOpen
Calculadora: Calculator
Comparador:  Globe
Catálogo:    Package
Operaciones: Ship
Historial:   Clock
Mi cuenta:   User
Planes:      Star

Sidebar icons:   16px, strokeWidth=1.5
Bottom tabs:     20px, strokeWidth=1.5
Mobile drawer:   18px, strokeWidth=1.5
```

---

## Animaciones y transiciones

```
Fade-in mensajes: fadeIn 0.3s ease-out (translateY 8px)
Typing cursor:    animate-pulse en span w-0.5
Bounce dots:      animate-bounce con stagger 0.2s
Transiciones UI:  transition-all duration-150
Drawer:           translateY con cubic-bezier(0.4,0,0.2,1) 0.28s
```

---

## Scrollbar

```css
::-webkit-scrollbar       { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #313035; border-radius: 2px; }
```

---

## Paletas anteriores (NO usar)

- **Cyan** (eliminado 2026-03-24): `#81e9ff` / `#00e0ff` / `#00363f` sobre `#0c0e12`
- **Azul marino + dorado** (eliminado 2026-03-20): `#0a0e1b` / `#e99f1c`
