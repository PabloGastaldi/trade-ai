# trade.ai — Design System

## Concepto Visual

**Dirección estética:** Dark luxury tech — ambiente oscuro profesional con acentos cyan
que dan profundidad y sofisticación. Inspirado en interfaces de terminal modernas
con la calidez del cyan como color de identidad.

**Tono:** Serio y profesional. Herramienta de trabajo para profesionales de comercio
exterior. Sin color excesivo, sin gradientes llamativos. El cyan es el único color
de acento — todo lo demás es superficie oscura o gris.

**Diferenciador:** El cyan (#81e9ff) como identidad — se usa solo para elementos
activos, CTAs, links y badges destacados. Nada más debe ser cyan.

---

## Paleta de Colores

### Fondos (de más oscuro a más claro)
```
--surface:          #0c0e12   /* fondo principal de la app */
--surface-low:      #111318   /* inputs, dropdowns */
--surface-high:     #1d2025   /* hover states, headers de tabla */
--surface-highest:  #23262c   /* inputs más oscuros, campos destacados */
```

### Bordes
```
--border:           rgba(255,255,255,0.06)   /* default borders */
--border-light:     rgba(255,255,255,0.10)   /* hover borders */
```

### Texto
```
--text:             #f6f6fc   /* texto principal */
--text-muted:       #aaabb0   /* texto secundario, labels */
--text-disabled:     #4a4b52  /* texto deshabilitado */
```

### Primario (cyan — identidad de trade.ai)
```
--primary:          #81e9ff   /* color principal, CTAs, links activos */
--primary-intense:   #00e0ff  /* fondo de botones primarios */
--primary-muted:    rgba(129,233,255,0.06)  /* backgrounds sutiles */
--on-primary:       #00363f  /* texto sobre fondo cyan */
```

### Semánticos
```
--success:          #10b981
--success-muted:    rgba(16,185,129,0.10)
--warning:          #f59e0b
--warning-muted:    rgba(245,158,11,0.10)
--error:            #ef4444
--error-muted:      rgba(239,68,68,0.10)
```

---

## Tipografía

### Fonts (Google Fonts via next/font)
```
font-display  → Bebas Neue       /* títulos de página, headlines, logo */
font-body     → Inter           /* body, UI, descripciones */
font-mono     → Space Grotesk   /* códigos NCM, montos, datos */
```

### Escala
```
font-display text-5xl  → títulos de página (3rem)
font-display text-2xl  → headlines de sección
font-body text-base    → body principal (0.875rem)
font-body text-sm      → UI labels, metadata
font-body text-xs      → hints, footnotes
font-mono text-xs      → NCM codes, montos
font-mono text-[10px]  → micro labels, badges
```

### Aplicación
```
Logo "trade.ai"     → font-display text-xl, ".ai" en --primary
Títulos de página   → font-display uppercase tracking-wider
Labels de sección    → font-display text-[10px] uppercase tracking-widest, --text-muted
Body text            → font-body text-sm text--text, leading-relaxed
Datos numéricos      → font-mono text-sm
Badges               → font-mono text-[10px] uppercase tracking-widest
```

---

## Spaciado y Border Radius

### Border Radius
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
tablet:  768–1024px → Sidebar colapsado (60px)
desktop: ≥ 1024px  → Sidebar expanded (250px) + contenido
```

---

## Componentes Base

### Cards
```
Base:        bg-white/[0.03] border border-white/[0.04] rounded-2xl
Destacada:   border border-primary/20
Glass:       bg-white/[0.03] backdrop-blur-xl
```

### Botones (Button.js component)
```
primary:     bg-primary-intense text-on-primary hover:bg-primary
secondary:   bg-white/[0.05] text-on-surface hover:bg-white/[0.08]
ghost:       bg-transparent text-on-surface-variant hover:bg-white/[0.06]
danger:      bg-red-500/10 text-red-400 border border-red-500/20
Loading:     spinner SVG + texto "Cargando..."
Disabled:    opacity-40 cursor-not-allowed
```

### Inputs (Input.js component)
```
Base:        bg-surface-highest rounded-xl px-4 py-3
Focus:       border border-primary/30 outline-none
Error:       border border-red-500/50
Label:       font-body text-xs text-on-surface-variant mb-1.5
Hint:        font-body text-[10px] text-on-surface-variant/60 mt-1
```

### Badges (Badge.jsx)
```
primary:     bg-primary/10 text-primary
accent:      bg-primary/10 text-primary (sin amarillo)
success:     bg-emerald-500/10 text-emerald-400
error:       bg-red-500/10 text-red-400
neutral:     bg-white/[0.06] text-on-surface-variant
```

---

## Layout App Shell

### Desktop (≥1024px)
```
Sidebar:        position fixed, left:0, top:0, bottom:0, width:250px
Content:        margin-left:250px, overflow-y auto
Colapsado:     width:60px, margin-left:60px
```

### Mobile (<768px)
```
Header:        position fixed, top:0, height:52px, z-index:199
               Logo izquierda + botón hamburguesa derecha
Content:       margin-top:52px, padding-bottom:60px (para tabs)
Bottom tabs:   position fixed, bottom:0, height:60px, z-index:200
               4 columnas: Chat, Calculadora, Operaciones, Más
Drawer:        position fixed, bottom:60px, z-index:200
               translateY(100%) → translateY(0) al abrir
               содержит: email, plan badge, todos los links, logout
```

### Navegación Sidebar (Desktop)
```
Secciones:     Chat IA, Herramientas, Mi negocio, Cuenta
Items:         Icono Lucide (16px, stroke-width:1.5) + label
Activo:        border-left-color:primary + bg-primary/6 + icono text-primary
Hover:         bg-white/[0.04]
Soon:          opacity-0.5, pointer-events-none, badge "Pronto"
Logout:        Botón abajo del sidebar, ícono flecha SVG
```

---

## Chat / Consulta

### Estructura
```
Container:     flex-col min-h-screen bg-surface
Messages:      flex-1 overflow-y-auto, max-w-3xl mx-auto
Empty state:   watermark TRADE.AI (muy sutil), título, chips ejemplo
Bubble IA:    px-4 py-3 rounded-2xl rounded-bl-sm
Bubble User:  px-4 py-3 rounded-2xl rounded-br-sm, bg-white/[0.06]
Cursor:       ▌ (w-0.5 h-3.5 bg-primary animate-pulse) dentro del bubble
Input:        bg-surface-low/80 backdrop-blur-xl border-t border-white/[0.04]
               rounded-2xl, px-4 pb-6 pt-2
Mobile:       input pb-[80px] para evitar solaparse con bottom tabs
```

### Markdown render (ReactMarkdown + remarkGfm)
```
p:            mb-1.5 last:mb-0 leading-relaxed
h2:           font-display text-base mt-3 mb-1 pb-1 border-b border-white/[0.06]
h3:           font-semibold text-sm mt-3 mb-1
table:        overflow-x-auto rounded-xl border border-white/[0.06]
th:           text-xs font-semibold text-primary uppercase
td:           px-3 py-2 border-b border-white/[0.04]
code:         bg-surface-high text-primary text-xs font-mono px-1.5 py-0.5 rounded
pre:          bg-surface-high rounded-xl p-4 my-2
blockquote:   border-l-2 border-primary/30 pl-3 my-1.5 italic
strong:       font-semibold text-on-surface
hr:           border-surface-high my-3
```

### Normalización de texto
```
función normalizarTexto():
  .replace(/\n{3,}/g, '\n\n')  // máximo doble newline
  .trim()
```

---

## Calculadora de costos

### Estructura
```
Tabs:         bg-white/[0.04] rounded-xl p-1 (Importación | Exportación)
Regímenes:    4 cards en grid (Régimen general, Courier, PEF, Correo)
Resultado:    Card destacada con desglose de costos
Destacado:    border border-primary/20 bg-primary/3
```

### Desglose de costos
```
Valor FOB/CIF:  font-mono text-lg
Tributos:       Lista con alícuota %
Total:          font-mono text-xl text-primary
Preferencia:    bg-emerald-500/5 border border-emerald-500/15
Disclaimer:     bg-primary/5 border border-primary/10
```

---

## Nomenclador NCM

### Estructura
```
Buscador:      Input con icono búsqueda, debounce 300ms
Tabla:         bg-white/[0.03] rounded-2xl, hover en filas
Panel:         Slide-in desde derecha, max-w-md, overlay oscuro
Detalle:       Aranceles, Organismos, Preferencias, NTM, Destinos
```

---

## Auth pages (login, registro, etc.)

### Split-screen
```
Container:     flex min-h-screen items-center justify-center gap-12 px-8 bg-surface
Left (card):   w-[500px] h-[600px] — solo branding, nunca w-1/2
Right (form):  w-[400px] shrink-0 — el formulario
NO USAR:      flex-1, w-1/2
```

---

## Iconografía

### Lucide React — Sidebar
```
Chat IA:        MessageSquare
Nomenclador:    BookOpen
Calculadora:    Calculator
Comparador:     Globe
Catálogo:       Package
Operaciones:    Ship
Historial:      Clock
Mi cuenta:      User
Planes:         Star
```

### Tamaño estándar
```
Sidebar icons:  16px, strokeWidth=1.5
Bottom tabs:   20px, strokeWidth=1.5
Mobile drawer: 18px, strokeWidth=1.5
```

---

## Animaciones y transiciones

```
Fade-in mensajes:   animation: fadeIn 0.3s ease-out (translateY 8px)
Typing cursor:      animate-pulse en span w-0.5
Bounce dots:       animate-bounce con stagger 0.2s
Transiciones UI:    transition-all duration-150
Drawer:            translateY con cubic-bezier(0.4,0,0.2,1) 0.28s
```

---

## Scrollbar
```
::-webkit-scrollbar        { width: 4px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb   { background: rgba(255,255,255,0.06); border-radius: 2px; }
scrollbar-width:            thin;
scrollbar-color:            var(--border) transparent;
```
