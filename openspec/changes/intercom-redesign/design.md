# Diseño técnico — Rediseño visual Intercom (trade.ai v3)

- **Change ID:** `intercom-redesign`
- **Fuente de verdad del sistema visual:** `./DESIGN-intercom.md` (en este change)
- **Mockup de referencia:** `./reference-importar.html` (la pantalla `/importar` ya rediseñada)
- **Depende de:** `proposal.md`

El objetivo es estético: pasar de dark+amarillo a un sistema **editorial crema/carbón/naranja**
sin tocar la lógica. Acento confirmado: **naranja `#ff5600`**, reservado para la acción de IA / CTA primario.

---

## Parte A — Cómo están los tokens hoy (y dónde tocar)

Los tokens viven en DOS lugares y hay que actualizar ambos:
1. **`tailwind.config.js`** → `theme.extend.colors` mapea nombres a HEX literales. Cambiar acá
   reescribe todas las utility classes (`bg-surface`, `text-on-surface`, `text-primary`, etc.).
2. **`app/globals.css` `:root`** → CSS vars (`--surface`, `--primary`, `--text`, `--accent`,
   `--border`, etc.) que usan los CSS legacy (p. ej. `Sidebar.css`, `MobileNav.css`, módulos).

Además, muchos componentes usan **utilities crudas del tema dark** que NO se arreglan con tokens:
`bg-white/[0.03]`, `border-white/[0.04]`, `bg-white/[0.06]`, `text-on-surface-variant/50`, etc.
Esas hay que migrarlas por pantalla (Parte C).

## Parte B — Mapeo de tokens (actual → nuevo)

### Tailwind colors (`tailwind.config.js`)

| Token | Antes (dark) | Ahora (Intercom light) | Rol nuevo |
| --- | --- | --- | --- |
| `surface` | `#1A191C` | `#f5f1ec` | Canvas crema (fondo de página) |
| `surface-low` | `#1f1e21` | `#ffffff` | Tarjeta blanca (surface-1) |
| `surface-container` | `#242327` | `#ffffff` | Tarjeta blanca |
| `surface-high` | `#2a292e` | `#ebe7e1` | Crema más oscuro (surface-2) |
| `surface-highest` | `#313035` | `#ebe7e1` | Tints / chips |
| `primary` | `#DDD92A` | `#ff5600` | Acento (acción IA / CTA) |
| `primary-intense` | `#EAE151` | `#e64e00` | Acento hover (naranja más oscuro) |
| `on-surface` | `#F5F5F5` | `#111111` | Tinta carbón (texto principal) — FLIP |
| `on-surface-variant` | `#9E9DA0` | `#626260` | Tinta secundaria (ink-muted) |
| `on-primary` | `#1A191C` | `#ffffff` | Texto sobre naranja — FLIP |

Tokens nuevos a agregar: `hairline #d3cec6`, `hairline-soft #ebe7e1`, `ink-subtle #7b7b78`,
`ink-tertiary #9c9fa5`, `canvas #f5f1ec` (alias de surface), `surface-1 #ffffff`, `surface-2 #ebe7e1`.

### CSS vars (`app/globals.css :root`)

Reflejar el mismo mapeo: `--surface→#f5f1ec`, `--surface-low→#fff`, `--primary/--accent→#ff5600`,
`--accent-hover→#e64e00`, `--accent-dim→rgba(255,86,0,.10)`, `--accent-dim-border→rgba(255,86,0,.20)`,
`--on-surface/--text→#111111`, `--on-surface-variant/--text-muted→#626260`, `--on-primary→#fff`,
`--bg→#f5f1ec`, `--border→#d3cec6` (hairline sólido, ya no rgba blanco), `--border-light→#ebe7e1`,
`--text-dim→#7b7b78`. Agregar `--hairline`, `--ink-subtle`, `--ink-tertiary`.

### Tipografía

- Cargar **Inter** (400/500/600) y **JetBrains Mono** (400/500) por `next/font/google` en `app/layout.js`.
- `--font-body` → Inter; `--font-display` → Inter (peso 500, tracking negativo por tamaño);
  `--font-mono` → JetBrains Mono. **Retirar** Bebas Neue, Space Grotesk y `--font-logo` (Salin) +
  su `@font-face`. El logo "trade.ai" pasa a Inter 600, carbón, con `.ai` en naranja o carbón.
- Escala display con tracking negativo proporcional (ver `DESIGN-intercom.md` typography): los
  `text-4xl/5xl` del hero usan `font-medium` + `tracking-[-1.5px]`, no Bebas.

## Parte C — Reglas de migración de utilities (por pantalla)

Reemplazos mecánicos a aplicar en cada componente:

| Patrón dark | Reemplazo light |
| --- | --- |
| `bg-white/[0.03]` (tarjeta) | `bg-surface-low` (blanco) + `border border-hairline` |
| `bg-white/[0.02]` (sutil) | `bg-surface` (crema) o `bg-surface-high` |
| `border-white/[0.04]` / `[0.08]` | `border-hairline` (o `border-hairline-soft` para divisores suaves) |
| `bg-white/[0.06]` (hover/activo) | `bg-surface-high` (#ebe7e1) |
| `text-on-surface-variant/50` y opacidades de texto | usar `text-ink-subtle` / `text-ink-tertiary` (sin opacidad) |
| Sombras/`shadow-*` | quitar — Intercom no usa sombras; profundidad = blanco sobre crema + hairline |
| Acento amarillo decorativo | quitar; el naranja SOLO en CTA primario / acción IA |
| `rounded-2xl` en todo | tarjetas `rounded-lg` (12px); mockups/paneles `rounded-xl` (16px); botones/inputs `rounded-md` (8px) |

Disciplina del naranja: un solo CTA naranja por viewport (la acción primaria). El resto de los
botones son carbón (`button-primary`: bg carbón, texto blanco) o blancos con hairline (secundario).

## Parte D — Plan de fases (cada una = build verde antes de seguir)

1. **Fundación** — tokens (Tailwind + CSS vars), fuentes (Inter + JetBrains Mono en layout),
   retiro de Bebas/Space Grotesk/Salin. Deja la base lista; algunas pantallas se verán a medias
   hasta migrarlas (esperado).
2. **App shell** — `app/(app)/layout.js`, `Sidebar` (+ `Sidebar.css`), `MobileNav` (+ css),
   `AppHeader`/topbar, según el mockup (sidebar blanco sobre crema, indicador activo carbón,
   topbar con uso de plan + ayuda).
3. **Flujo de importación** — `ImportarClient` (hero, searchbar con CTA "Clasificar" naranja,
   chips de ejemplo, pasos, candidatos) según `reference-importar.html`.
4. **Informe + copiloto** — `ImportReport` (CostHero, tarjetas, semáforo) y `CopilotRail` a light.
5. **Operaciones** — lista, Kanban, detalle, modal, PrintView, paneles → light editorial.
6. **Auth + landing + secundarias + pulido** — `app/page.js` (landing), auth pages, `/cuenta`,
   `/planes`, `/historial`, `/consulta`, y las accesibles por deep-link (nomenclador, calculadora,
   simulador, comparador, catalogo, mercados). Pasada final de contraste, foco y reduced-motion.

## Parte E — Decisiones y tradeoffs

- **Remapear tokens existentes en su lugar** (vs. renombrar): se reusan los nombres `surface`/
  `on-surface`/`primary` con valores nuevos → la mayoría de las utilities semánticas flipan solas.
  El costo es migrar las utilities crudas dark (Parte C), inevitable en un flip de tema.
- **Inter para todo** (vs. mantener Bebas en hero): el sistema Intercom es mono-familia; el hero
  usa Inter 500 con tracking negativo, más sobrio y "consultora". Se retira Bebas.
- **Sin sombras**: profundidad por superficie (blanco sobre crema) + hairline, como Intercom.
- **El amarillo se retira** de la identidad; acento único naranja `#ff5600` (decisión del usuario).
