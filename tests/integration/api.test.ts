import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────
// MOCKS — deben declararse antes de los imports
// Vitest los hoistea al inicio del módulo.
// ─────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(),
}))

vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: vi.fn(),
}))

vi.mock('@/lib/ncm-lookup', () => ({
  buscarNCM: vi.fn().mockResolvedValue([]),
  formatearResultadosNCM: vi.fn().mockReturnValue(''),
}))

vi.mock('@/lib/preferencias-lookup', () => ({
  buscarPreferencias: vi.fn().mockResolvedValue({
    tiene_preferencias: false,
    preferencias_especificas: [],
    acuerdos_cobertura_total: [],
  }),
  formatearPreferencias: vi.fn().mockReturnValue(''),
}))

// ─────────────────────────────────────────────
// IMPORTS (después de los mocks)
// ─────────────────────────────────────────────
import { POST } from '@/app/api/consulta/route.js'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function crearRequest(body: unknown) {
  return new Request('http://localhost/api/consulta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Mock de Supabase que simula usuario autenticado con plan free
function mockSupabaseAutenticado(overrides: Record<string, unknown> = {}) {
  // Fecha de reset en el futuro para que el endpoint no resetee el contador
  const proximoMes = new Date()
  proximoMes.setMonth(proximoMes.getMonth() + 1)

  const perfil = {
    plan_type: 'free',
    queries_this_month: 0,
    queries_reset_date: proximoMes.toISOString(),
    ...overrides,
  }

  const mockSingle = vi.fn().mockResolvedValue({ data: perfil, error: null })
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: mockSingle,
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    order: vi.fn().mockReturnThis(),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-test-123' } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue(mockChain),
  }
}

// Mock mínimo de Anthropic que emite un chunk de texto y cierra el stream
function mockAnthropic() {
  const mockStream = {
    async *[Symbol.asyncIterator]() {
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Respuesta de prueba.' },
      }
    },
  }
  vi.mocked(Anthropic).mockImplementation(() => ({
    messages: { stream: vi.fn().mockReturnValue(mockStream) },
  }) as any)
}

// ─────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────
describe('POST /api/consulta — validación de input', () => {
  it('devuelve 400 cuando el body no es JSON válido', async () => {
    const req = new Request('http://localhost/api/consulta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'esto no es json{{{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('JSON')
  })

  it('devuelve 400 cuando falta el campo pregunta', async () => {
    const res = await POST(crearRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('pregunta')
  })

  it('devuelve 400 cuando pregunta no es string', async () => {
    const res = await POST(crearRequest({ pregunta: 123 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('pregunta')
  })

  it('devuelve 400 cuando la pregunta supera 2000 caracteres', async () => {
    const res = await POST(crearRequest({ pregunta: 'a'.repeat(2001) }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('2000')
  })

  it('acepta exactamente 2000 caracteres (no devuelve 400)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      // Retorna 401 (sin auth) — solo nos interesa que no sea 400
      { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) }, from: vi.fn() } as any
    )
    const res = await POST(crearRequest({ pregunta: 'a'.repeat(2000) }))
    expect(res.status).not.toBe(400)
  })
})

describe('POST /api/consulta — autenticación', () => {
  it('devuelve 401 cuando el usuario no está autenticado', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const res = await POST(crearRequest({ pregunta: '¿Qué arancel tiene el vino?' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toContain('autorizad')
  })

  it('devuelve 401 cuando Supabase retorna error de auth', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Token inválido' },
        }),
      },
      from: vi.fn(),
    } as any)

    const res = await POST(crearRequest({ pregunta: '¿Qué arancel tiene el vino?' }))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/consulta — límite de plan', () => {
  it('devuelve 403 cuando se alcanza el límite mensual del plan free (100 consultas en dev)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabaseAutenticado({ queries_this_month: 100, plan_type: 'free' }) as any
    )

    const res = await POST(crearRequest({ pregunta: '¿Qué arancel tiene el vino?' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('100')
    expect(json.error).toContain('free')
  })

  it('devuelve 403 cuando se supera el límite del plan pro (200 consultas)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabaseAutenticado({ queries_this_month: 200, plan_type: 'pro' }) as any
    )

    const res = await POST(crearRequest({ pregunta: '¿Qué arancel tiene el vino?' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('200')
  })
})

describe('POST /api/consulta — respuesta exitosa', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAutenticado() as any)
    mockAnthropic()
  })

  it('devuelve 200 con Content-Type text/event-stream para consulta válida', async () => {
    const res = await POST(crearRequest({ pregunta: '¿Qué documentos necesito para exportar?' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
  })

  it('el stream contiene el evento [DONE] al finalizar', async () => {
    const res = await POST(crearRequest({ pregunta: '¿Qué documentos necesito para exportar?' }))
    const text = await res.text()
    expect(text).toContain('[DONE]')
  })

  it('el stream contiene el texto de la respuesta', async () => {
    const res = await POST(crearRequest({ pregunta: '¿Qué documentos necesito para exportar?' }))
    const text = await res.text()
    expect(text).toContain('Respuesta de prueba')
  })
})
