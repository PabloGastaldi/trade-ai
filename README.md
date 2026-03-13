# trade.ai

Plataforma web de consulta inteligente para comercio exterior argentino.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Base de datos estructurada | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Base de datos vectorial | Pinecone |
| Motor de IA | Claude API (Anthropic) |
| Pagos | MercadoPago (Checkout Pro) |
| Deploy | Vercel |

---

## Requisitos previos

- Node.js 18 o superior
- npm
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Pinecone](https://pinecone.io)
- Cuenta en [Anthropic](https://console.anthropic.com)
- Cuenta en [MercadoPago Developers](https://www.mercadopago.com.ar/developers)
- Cuenta en [Vercel](https://vercel.com)

---

## Instalación y uso local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/trade-ai.git
cd trade-ai

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editá .env.local con tus claves reales (ver sección Variables de entorno)

# 4. Correr en desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el browser.

---

## Estructura del proyecto

```
trade-ai/
├── app/                        # App Router — páginas y layouts
│   ├── (auth)/                 # Rutas públicas de autenticación
│   ├── (app)/                  # Rutas protegidas (requieren sesión)
│   └── api/                    # Route Handlers — endpoints del backend
├── components/                 # Componentes React reutilizables
│   ├── ui/                     # Componentes de interfaz genéricos
│   ├── chat/                   # Componentes del flujo de consulta
│   ├── layout/                 # Navbar, Sidebar
│   └── planes/                 # Cards de planes y suscripciones
├── lib/                        # Clientes y lógica de negocio
│   ├── supabase/               # Cliente Supabase (browser + servidor)
│   ├── pinecone/               # Cliente Pinecone y búsqueda vectorial
│   ├── anthropic/              # Cliente Claude API
│   ├── mercadopago/            # Cliente MercadoPago
│   └── utils/                  # Orquestador de consulta y lógica de planes
├── middleware.js               # Protección de rutas autenticadas
├── .env.example                # Plantilla de variables de entorno
└── SECURITY.md                 # Política de seguridad del proyecto
```

---

## Variables de entorno

Copiá `.env.example` como `.env.local` y completá cada valor:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase (segura para el browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase (solo servidor, nunca al browser) |
| `PINECONE_API_KEY` | API key de Pinecone |
| `PINECONE_INDEX_NAME` | Nombre del índice vectorial en Pinecone |
| `PINECONE_ENVIRONMENT` | Región del índice Pinecone (ej: us-east-1) |
| `ANTHROPIC_API_KEY` | API key de Anthropic para acceder a Claude |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Public key de MercadoPago (usada en el frontend) |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de MercadoPago (solo servidor) |
| `NEXT_PUBLIC_SITE_URL` | URL base del sitio (localhost en desarrollo, dominio en producción) |

---

## Deploy en Vercel

1. Importá el repositorio desde [vercel.com/new](https://vercel.com/new)
2. Vercel detecta Next.js automáticamente — no requiere configuración de build
3. En **Environment Variables**, agregá todas las variables de `.env.example` con sus valores reales
4. Hacé click en **Deploy**

Para deploys posteriores, cada `git push` a `main` dispara un deploy automático.

> ⚠️ Acordate de actualizar `NEXT_PUBLIC_SITE_URL` con el dominio real de producción.

---

## Licencia

Privado / Propietario — todos los derechos reservados.
