trade-ai/
│
├── app/                                        // App Router — todo lo que el usuario ve
│   ├── layout.js                               // Layout raíz: fuentes, metadata global, providers
│   ├── page.js                                 // Landing page pública (home)
│   ├── globals.css                             // Estilos globales + variables Tailwind
│   │
│   ├── (auth)/                                 // Grupo de rutas — no afecta la URL
│   │   ├── login/
│   │   │   └── page.js                         // Página de login
│   │   └── registro/
│   │       └── page.js                         // Página de registro
│   │
│   ├── (app)/                                  // Rutas protegidas — requieren sesión activa
│   │   ├── layout.js                           // Layout compartido para rutas autenticadas
│   │   ├── consulta/
│   │   │   └── page.js                         // Página principal del chat de consulta
│   │   ├── historial/
│   │   │   └── page.js                         // Historial de consultas del usuario
│   │   └── cuenta/
│   │       └── page.js                         // Configuración de cuenta y plan activo
│   │
│   └── api/                                    // Route Handlers — endpoints del backend
│       ├── consulta/
│       │   └── route.js                        // POST: recibe consulta, llama a Claude, devuelve respuesta
│       ├── auth/
│       │   └── callback/
│       │       └── route.js                    // GET: callback OAuth de Supabase (Google login)
│       └── pagos/
│           ├── crear-preferencia/
│           │   └── route.js                    // POST: crea preferencia de pago en MercadoPago
│           └── webhook/
│               └── route.js                    // POST: recibe notificaciones de MercadoPago
│
├── components/                                 // Componentes React reutilizables
│   ├── ui/                                     // Componentes de interfaz genéricos
│   │   ├── Button.js                           // Botón con variantes (primary, secondary, ghost)
│   │   ├── Input.js                            // Input de texto estilizado
│   │   └── Modal.js                            // Modal reutilizable
│   ├── chat/                                   // Componentes del flujo de consulta
│   │   ├── ChatInput.js                        // Caja de texto donde el usuario escribe su consulta
│   │   ├── ChatMessage.js                      // Burbuja de mensaje (usuario o IA)
│   │   └── ChatWindow.js                       // Contenedor del historial de mensajes
│   ├── layout/                                 // Componentes estructurales
│   │   ├── Navbar.js                           // Barra de navegación superior
│   │   └── Sidebar.js                          // Panel lateral con historial de consultas
│   └── planes/                                 // Componentes del modelo de negocio
│       └── PlanesCard.js                       // Card de cada plan (Free, Pro, Empresa)
│
├── lib/                                        // Lógica de negocio y clientes de servicios
│   ├── supabase/
│   │   ├── client.js                           // Cliente Supabase para el browser (componentes cliente)
│   │   └── server.js                           // Cliente Supabase para el servidor (SSR, API routes)
│   ├── pinecone/
│   │   └── client.js                           // Cliente Pinecone + función de búsqueda vectorial
│   ├── anthropic/
│   │   └── client.js                           // Cliente Claude API + función principal de consulta
│   ├── mercadopago/
│   │   └── client.js                           // Cliente MercadoPago + helpers de pago
│   └── utils/
│       ├── consulta.js                         // Orquestador: combina Supabase + Pinecone + Claude
│       └── planes.js                           // Lógica de límites y validación de planes
│
├── middleware.js                               // Protección de rutas: redirige si no hay sesión activa
│
├── .env.local                                  // Variables de entorno reales (nunca a Git)
├── .env.example                                // Plantilla de variables sin valores (sí va a Git)
├── .gitignore
├── jsconfig.json
├── next.config.mjs
├── package.json
├── postcss.config.mjs
└── tailwind.config.js
