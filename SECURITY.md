# Política de Seguridad — trade.ai

Documento de referencia interna. Revisarlo antes de cada deploy.

---

## 1. Manejo de API Keys y Secrets

**Regla fundamental:** ninguna clave secreta sale del servidor.

- Todas las API keys viven en `.env.local` (excluido de Git por `.gitignore`)
- `.env.example` existe como plantilla sin valores — es el único archivo de entorno que va a Git
- En Vercel, las variables se cargan desde el panel de Environment Variables — nunca en código
- Si una clave se expone accidentalmente, rotarla de inmediato en el servicio correspondiente

---

## 2. Variables públicas vs. secretas

### Públicas — prefijo `NEXT_PUBLIC_`
Visibles en el browser del usuario. Solo van aquí valores que son seguros de exponer.

| Variable | Por qué es seguro exponerla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Es una URL, no una clave. Las RLS de Supabase protegen los datos |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Diseñada para el browser — las RLS limitan su acceso |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Requerida por el SDK de MP en el frontend |
| `NEXT_PUBLIC_SITE_URL` | URL del sitio, no es un secret |

### Secretas — sin prefijo `NEXT_PUBLIC_`
Solo disponibles en el servidor (Route Handlers, Server Components, middleware).
**Nunca importarlas en componentes cliente (`'use client'`).**

| Variable | Por qué es secreta |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Saltea las RLS — acceso total a la base de datos |
| `ANTHROPIC_API_KEY` | Clave de facturación de Claude API |
| `PINECONE_API_KEY` | Acceso a la base de datos vectorial |
| `MERCADOPAGO_ACCESS_TOKEN` | Permite crear y gestionar cobros reales |

---

## 3. Row Level Security (RLS) en Supabase

Todas las tablas tienen RLS activado por defecto. Política base:

- **usuarios**: cada usuario solo puede leer y escribir sus propios datos (`auth.uid() = user_id`)
- **consultas**: cada usuario solo accede a su propio historial
- **planes**: lectura pública, escritura solo desde servidor con `service_role`
- **webhooks de pago**: procesados exclusivamente desde el servidor con `service_role`

> Nunca deshabilitar RLS en tablas que contengan datos de usuarios.

---

## 4. Rutas públicas vs. protegidas

El archivo `middleware.js` intercepta todas las peticiones y controla el acceso.

### Rutas públicas (sin sesión requerida)
```
/                   → Landing page
/login              → Página de login
/registro           → Página de registro
/api/auth/callback  → Callback OAuth de Supabase
/api/pagos/webhook  → Webhook de MercadoPago (validado por firma)
```

### Rutas protegidas (requieren sesión activa)
```
/consulta           → Chat de consulta
/historial          → Historial del usuario
/cuenta             → Configuración de cuenta
/api/consulta       → Endpoint de IA
/api/pagos/crear-preferencia → Endpoint de pagos
```

Si un usuario no autenticado intenta acceder a una ruta protegida, el middleware lo redirige a `/login`.

---

## 5. Autenticación — Supabase Auth

- Métodos habilitados: email/contraseña y Google OAuth
- Las sesiones se manejan con cookies HTTP-only (via `@supabase/ssr`)
- El cliente del browser (`lib/supabase/client.js`) usa `createBrowserClient`
- El cliente del servidor (`lib/supabase/server.js`) usa `createServerClient` con cookies de Next.js
- Los tokens se renuevan automáticamente — no se almacenan en localStorage

---

## 6. Validación del Webhook de MercadoPago

El endpoint `/api/pagos/webhook` es público pero valida cada notificación antes de procesarla:

1. Verificar que el header `x-signature` coincide con el `MERCADOPAGO_ACCESS_TOKEN`
2. Consultar la API de MercadoPago para confirmar el estado real del pago
3. Nunca actualizar el plan de un usuario basándose solo en el payload del webhook sin verificar
4. Registrar todos los eventos recibidos para auditoría

---

## 7. Headers de seguridad

Configurados en `next.config.mjs`:

```js
Content-Security-Policy        // Restringe recursos externos permitidos
X-Frame-Options: DENY          // Previene clickjacking
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy             // Deshabilita APIs del browser no usadas
```

---

## 8. Checklist de seguridad — antes de cada deploy

- [ ] `.env.local` NO está en Git (`git status` no lo muestra)
- [ ] Todas las variables de producción están cargadas en Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` apunta al dominio de producción
- [ ] RLS activado en todas las tablas de Supabase
- [ ] No hay `console.log()` con datos sensibles en el código
- [ ] Los endpoints de API validan que el usuario tiene sesión activa
- [ ] El webhook de MercadoPago verifica la firma antes de procesar
- [ ] No hay claves hardcodeadas en ningún archivo del repositorio
- [ ] `npm audit` sin vulnerabilidades críticas o altas sin resolver

---

## 9. Reporte de vulnerabilidades

Para reportar una vulnerabilidad de seguridad en este proyecto, contactar a:

**Email:** gastaldipablo1@gmail.com

No reportar vulnerabilidades en issues públicos de GitHub.
