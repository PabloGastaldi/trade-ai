# Spec — Rediseño visual (sistema Intercom)

Capacidad: `visual-redesign`. Re-skin total de trade.ai al sistema editorial crema/carbón/naranja,
sin alterar la funcionalidad. Fuente del sistema: `../../DESIGN-intercom.md`.

## ADDED Requirements

### Requirement: Sistema de tokens crema/carbón/naranja

El sistema DEBE definir la paleta nueva en `tailwind.config.js` y `app/globals.css`, con fondo
crema, superficies blancas, hairlines, tinta carbón y un único acento naranja `#ff5600`.

#### Scenario: Tokens aplicados globalmente

- **WHEN** se construye la app
- **THEN** `bg-surface` resuelve a crema `#f5f1ec`, `text-on-surface` a carbón `#111111`,
  `text-primary`/`bg-primary` a naranja `#ff5600`, y existen `hairline`, `surface-1`, `surface-2`
- **AND** no quedan referencias activas a Bebas Neue, Space Grotesk ni Salin

### Requirement: Tipografía Inter + JetBrains Mono

El sistema DEBE usar Inter para texto y display (peso 500 con tracking negativo en display) y
JetBrains Mono para NCM, montos y código.

#### Scenario: Fuentes cargadas

- **WHEN** se renderiza cualquier pantalla
- **THEN** el texto usa Inter y los datos numéricos/NCM usan JetBrains Mono

### Requirement: Disciplina del acento naranja

El sistema DEBE reservar el naranja para la acción de IA / CTA primario; el resto de acciones
son carbón o blancas con hairline.

#### Scenario: Un solo CTA naranja por vista

- **WHEN** se muestra cualquier pantalla
- **THEN** hay como mucho un CTA naranja (la acción primaria) y los secundarios no son naranjas

### Requirement: Superficie editorial sin sombras

El sistema DEBE comunicar profundidad por contraste de superficie (blanco sobre crema) + hairline,
sin drop shadows, con radios 8/12/16px.

#### Scenario: Tarjetas sobre crema

- **WHEN** se renderiza una tarjeta
- **THEN** es blanca con borde hairline y radio 12/16px, sin sombra

### Requirement: Consistencia en todas las superficies

El sistema DEBE aplicar el rediseño a layout, flujo de importación, informe, copiloto,
operaciones, auth, landing y páginas secundarias — sin que queden pantallas en el tema dark viejo.

#### Scenario: Sin restos del tema dark

- **WHEN** se navega cualquier pantalla activa
- **THEN** no se ve fondo dark `#1A191C` ni amarillo `#DDD92A`, ni tarjetas translúcidas invisibles

### Requirement: Sin regresión funcional ni de accesibilidad

El sistema NO DEBE alterar la lógica; DEBE mantener build verde, tests sin fallas nuevas,
contraste AA sobre crema, foco visible y `prefers-reduced-motion`.

#### Scenario: Build y tests

- **WHEN** se completa cada fase
- **THEN** `npm run build` compila y no hay fallas de test nuevas (las 4 pre-existentes siguen)
