# Propuesta — Rediseño visual Intercom (trade.ai v3)

- **Change ID:** `intercom-redesign`
- **Estado:** propuesta
- **Fecha:** 2026-06-13
- **Depende de:** `import-first-redesign` (la funcionalidad v2 ya implementada)
- **Artifact store:** openspec

---

## 1. Problema

La interfaz actual (dark `#1A191C` + amarillo `#DDD92A`) se lee como "chat de IA barato",
no como una herramienta de consultora de comercio exterior. Para un producto que maneja
plata y decisiones legales, la estética actual no transmite la seriedad y profesionalismo
que la marca necesita.

## 2. Decisión

Rediseño visual TOTAL adoptando el sistema editorial de Intercom (documentado en
`DESIGN-intercom.md`, incluido en este change), adaptado a trade.ai:

- **Fondo crema** `#f5f1ec` (no blanco puro) como superficie ancla.
- **Tarjetas blancas flotantes** `#ffffff` con **hairlines** finos `#d3cec6`, radios modestos (8–16px), sin sombras.
- **Tinta carbón** `#111111` como color de sistema (texto, primario).
- **Naranja `#ff5600`** como ÚNICO acento, reservado para la acción de IA / CTA primario (clasificar).
- **Tipografía Inter** (sustituto de Saans) — peso 500 para display con tracking negativo;
  **JetBrains Mono** para NCM, montos y código. Se retiran Bebas Neue, Space Grotesk y Salin.
- Ritmo editorial: mucho aire, el contenido/producto como protagonista, ornamento mínimo.

El mockup de referencia (`reference-importar.html`) muestra el sistema aplicado a `/importar`.

## 3. Alcance

- **Re-skin total de toda la app**, manteniendo intacta la funcionalidad v2 (flujo guiado,
  informe, copiloto, operaciones, auth, etc.). Es un cambio de presentación, no de lógica.
- Incluye: tokens (Tailwind + CSS vars), fuentes, layout (sidebar/topbar/mobile), flujo de
  importación, informe + copiloto, operaciones, auth, landing y páginas secundarias.

### No-objetivos

- No cambiar la lógica de negocio, las API routes ni los datos.
- No rediseñar el modelo de navegación (ya es import-first v2); solo su piel.
- No tocar la base de datos.

## 4. Objetivos

1. Que la app transmita "consultora seria y profesional" a primera vista.
2. Sistema visual coherente y disciplinado en TODAS las pantallas (un solo acento, hairlines, crema).
3. Accesibilidad: contraste AA sobre crema, foco visible, `prefers-reduced-motion`.
4. Cero regresión funcional (build verde, tests sin fallas nuevas).

## 5. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Las `bg-white/[0.0x]` (tarjetas dark translúcidas) quedan invisibles sobre crema | Migración explícita por pantalla a `surface-1` blanco + `hairline` |
| Flip dark→light deja texto ilegible (on-surface era claro) | Remapeo de tokens semánticos en un solo lugar + revisión por fase |
| El naranja se usa de más y pierde fuerza | Disciplina: naranja solo en acción de IA / CTA primario (regla del sistema) |
| Cambio de marca (se retira el amarillo) | Confirmado por el usuario: acento = `#ff5600` |

## 6. Próximos artefactos

- `DESIGN-intercom.md` — sistema de diseño fuente (Intercom), ya incluido.
- `design.md` — mapeo de tokens actual→nuevo, reglas de migración y plan de fases.
- `specs/` — requisitos visuales por superficie.
- `tasks.md` — checklist por fases.
