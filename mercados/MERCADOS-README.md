# Mercados — Feature de datos financieros para Trade.ai

## Archivos a copiar

```
trade-ai/
├── app/
│   ├── api/
│   │   └── market-data/
│   │       └── route.js          ← API route (DolarApi + ArgentinaDatos + Yahoo Finance)
│   └── (app)/
│       └── mercados/
│           ├── page.js           ← Server component
│           └── MercadosClient.js ← Client component (dashboard)
```

## Integración

### 1. Copiar los 3 archivos

### 2. Agregar al sidebar
En tu componente de navegación (sección "Herramientas"):
```jsx
import { BarChart3 } from 'lucide-react';
// Nuevo item:
{ href: '/mercados', label: 'Mercados', icon: BarChart3 }
```

### 3. Design system
El componente usa las clases Tailwind de tu design system actual (amarillo):
- `text-primary` (#DDD92A), `bg-primary/[0.06]`, `border-primary/10`
- `text-on-surface` (#F5F5F5), `text-on-surface-variant` (#9E9DA0)
- `bg-white/[0.03]`, `border-white/[0.04]`
- `font-body` (Inter) para títulos — cero Bebas Neue en app interna
- `font-mono` (Space Grotesk) para números y datos

No usa CSS variables de la paleta cyan (eliminada).

## Fuentes de datos

| Fuente | Datos | Auth | Costo |
|--------|-------|------|-------|
| DolarApi.com | Dólares (oficial/blue/MEP/CCL/mayorista/tarjeta), EUR, BRL | Sin key | Gratis |
| ArgentinaDatos | Riesgo país, inflación mensual/interanual, tasas | Sin key | Gratis |
| Yahoo Finance | Commodities (soja/trigo/maíz/petróleo), S&P 500, forex | Sin key | Gratis* |

*Yahoo Finance usa endpoint no oficial — ver nota abajo.

## Cache
- ISR: `revalidate = 300` (5 min) en Vercel
- Header: `Cache-Control: public, s-maxage=300, stale-while-revalidate=60`
- Auto-refresh en cliente cada 5 min + botón manual

## Nota Yahoo Finance
El endpoint `query1.finance.yahoo.com/v7/finance/quote` es no oficial.
Alternativas si deja de funcionar:
1. Python `yfinance` como microservicio
2. Twelve Data (free: 800 req/day)
3. API Ninjas Commodity Price (free: 10K req/month)

## Para V2
- Baltic Dry Index (BDI) — TradingEconomics API o scraping
- Freightos Baltic Index (FBX) — containers, API paga
- Reservas internacionales BCRA
- Merval en USD CCL
- Fed Funds Rate (FRED API, gratis con registro)
