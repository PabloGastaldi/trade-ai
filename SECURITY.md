# trade.ai — Seguridad

Auditoría realizada: 2026-03-17
Próxima revisión recomendada: antes del deploy a producción y cada 6 meses.

---

## Estado del checklist pre-lanzamiento

| # | Control | Estado | Notas |
|---|---------|--------|-------|
| 1 | API keys en variables de entorno | ✅ OK | Verificado — cero hardcoded |
| 2 | .env.local en .gitignore | ✅ OK | `.env*.local` en línea 29 |
| 3 | RLS en todas las tablas Supabase | ⚠️ EJECUTAR SQL | Script listo: `scripts/rls-setup.sql` — ejecutar en Supabase SQL Editor |
| 4 | service_role solo server-side | ✅ OK | Nunca en Client Components |
| 5 | Rate limiting | ✅ OK | Dos capas — ver sección Rate Limiting |
| 6 | Input validation en endpoints | ✅ OK | sanitizarPregunta() + validación de body |
| 7 | Guardrails anti-injection en agente | ✅ OK | System prompt con instrucciones explícitas |
| 8 | Disclaimer automático | ✅ OK | La UI lo agrega, Claude no lo genera |
| 9 | Headers de seguridad (CSP, etc.) | ✅ OK | Configurados en next.config.mjs |
| 10 | No console.log con datos sensibles | ✅ OK | Emails/user_ids removidos de logs |
| 11 | Webhook MP valida autenticidad | ✅ OK | HMAC + timestamp anti-replay + timingSafeEqual |
| 12 | HTTPS | ✅ OK | Vercel lo maneja automáticamente |
| 13 | CORS | ✅ OK | Next.js API Routes same-origin por defecto |
| 14 | Passwords hasheados | ✅ OK | Supabase Auth lo maneja |
| 15 | Sesiones expiran | ✅ OK | Middleware refresca sesión en cada request |

---

## Rate Limiting — Arquitectura de dos capas

### Capa 1: Middleware por IP (`middleware.js`)
Bloquea floods y bots antes de llegar a la lógica de negocio.

| Ruta | Límite | Ventana | Razón |
|------|--------|---------|-------|
| `/api/auth/*` | 10 req | 1 min | Anti brute-force de login |
| `/api/checkout` | 10 req | 1 min | Anti spam de creación de pagos |
| `/api/consulta` | 30 req | 1 min | Capa gruesa por IP |
| `/api/webhooks/*` | 60 req | 1 min | MP puede enviar ráfagas legítimas |
| `/api/*` (default) | 100 req | 1 min | Protección general |

Responde `HTTP 429` con headers estándar:
- `Retry-After: N` — segundos hasta que se libera la ventana
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Capa 2: Route handler por userId (`/api/consulta`)
Evita que un usuario acapare el cupo aunque comparta IP con otros.
- Límite: 10 consultas / minuto por cuenta autenticada
- Implementado con `RateLimiter` de `lib/rate-limit.js`

### Utilidad compartida (`lib/rate-limit.js`)
- Clase `RateLimiter` con ventana fija y limpieza automática de entradas expiradas
- Función `getClientIp()` lee `x-forwarded-for` (compatible con Vercel/proxies)
- **Limitación conocida:** en memoria — no persiste entre instancias serverless.
  Para escalar: migrar a Upstash Redis (cambio de ~10 líneas en `RateLimiter.check()`).

---

## Webhook MercadoPago (`/api/webhooks/mercadopago`)

Tres niveles de protección implementados:

1. **Firma HMAC-SHA256** — verifica que el webhook viene de MP usando `MP_WEBHOOK_SECRET`
2. **Anti-replay por timestamp** — rechaza webhooks con timestamp > 5 minutos de antigüedad
3. **Comparación timing-safe** — usa `crypto.timingSafeEqual()` para prevenir timing attacks

**Importante en producción:**
- `MP_WEBHOOK_SECRET` es **obligatorio** en `NODE_ENV=production`. Sin él, el webhook rechaza todo.
- Configurar en Vercel: Settings → Environment Variables → `MP_WEBHOOK_SECRET`

---

## Headers de seguridad (`next.config.mjs`)

Aplicados a todas las rutas:

| Header | Valor | Protege contra |
|--------|-------|----------------|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Fuga de URLs |
| `Permissions-Policy` | camera/mic/geo deshabilitados | Abuso de permisos |
| `Content-Security-Policy` | Ver next.config.mjs | XSS |

**Nota CSP:** usa `'unsafe-inline'` en `script-src` porque Next.js App Router lo requiere.
Para una CSP más estricta, migrar a nonce-based CSP (requiere cambios en middleware).

---

## Supabase — Modelo de seguridad

| Cliente | Archivo | Key usada | Contexto |
|---------|---------|-----------|---------|
| Browser | `lib/supabase/client.js` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Components |
| Server | `lib/supabase/server.js` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Route Handlers, Server Components |
| Middleware | `lib/supabase/middleware.js` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | middleware.js |
| Service role | `lib/ncm-lookup.js`, `lib/preferencias-lookup.js`, webhook | `SUPABASE_SERVICE_ROLE_KEY` | Solo server, bypass RLS justificado |

**SQL listo en `scripts/rls-setup.sql` — ejecutar en Supabase SQL Editor.**

| Tabla | Anon (sin login) | Autenticado | service_role (API) |
|-------|-----------------|-------------|-------------------|
| `ncm` | ❌ | ❌ | Todo ✅ |
| `preferencias_arancelarias` | ❌ | ❌ | Todo ✅ |
| `acuerdos_generales` | ❌ | ❌ | Todo ✅ |
| `documents_registry` | ❌ | ❌ | Todo ✅ |
| `users_profile` | ❌ | SELECT/UPDATE propia fila | Todo ✅ |
| `queries_log` | ❌ | SELECT/INSERT propias filas | Todo ✅ |

Las tablas de datos (ncm, preferencias, acuerdos, documents) no tienen policies — RLS habilitado sin policies deniega todo excepto service_role, que bypasea RLS siempre. El acceso es exclusivamente a través de la API de trade.ai.

El script también crea el trigger `on_auth_user_created` que auto-genera el perfil en `users_profile` cuando se registra un usuario nuevo en `auth.users`.

---

## Sanitización de input (`lib/utils/sanitize.js`)

`sanitizarPregunta()` aplica en orden:
1. Elimina tags HTML completos (`<script>...</script>`)
2. Elimina `<` y `>` sueltos
3. Elimina comentarios SQL `--` (hasta fin de línea)
4. Elimina comentarios SQL `/* ... */`
5. Elimina `;` (separador SQL)
6. Reemplaza null bytes y caracteres de control ASCII por espacio
7. Normaliza espacios múltiples a uno
8. Trim

Nota: Supabase usa queries parametrizadas en todos los casos — la sanitización es defensa en profundidad, especialmente para el input que va al LLM.

---

## Suite de evaluación del agente

Archivos para evaluar la calidad y seguridad de las respuestas del agente:

- `tests/test-queries.json` — 30 consultas organizadas en 6 categorías:
  - Aranceles y NCM (8), Documentación aduanera (5), Incoterms (5),
    Acuerdos comerciales (4), Normativa BCRA (3), Prompt injection (5)
- `scripts/test-runner.js` — runner que llama a la API y evalúa respuestas:
  - Detecta leaks de identidad del modelo (Claude, Anthropic)
  - Detecta leaks del system prompt
  - Detecta leaks de infraestructura (Supabase, Pinecone, API keys)
  - Verifica criterios esperados por consulta
  - Genera reporte CSV + JSON

```bash
# Correr evaluación completa
TEST_AUTH_TOKEN="eyJ..." node scripts/test-runner.js

# Solo tests de seguridad
TEST_AUTH_TOKEN="eyJ..." node scripts/test-runner.js --category seguridad
```

Exit code 2 si hay fallos de seguridad (prioridad crítica).

---

## Pendientes para producción

- [ ] Ejecutar `scripts/rls-setup.sql` en Supabase SQL Editor (RLS + trigger)
- [ ] Configurar `MP_WEBHOOK_SECRET` en Vercel environment variables
- [ ] Cambiar `LIMITES_PLAN.free` de 100 (dev) a 15 en producción (`app/api/consulta/route.js:13`)
- [ ] Evaluar Upstash Redis para rate limiting distribuido si hay múltiples instancias
- [ ] Correr `npm run test:eval` después del deploy para validar respuestas en producción
