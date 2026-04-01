import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { calcularExportacion } from '@/lib/calculadora/calc-exportacion'
import { calcularImportacion } from '@/lib/calculadora/calc-importacion'
import { verificarLimite, registrarUso } from '@/lib/usage-limiter'

// POST /api/comparador
// Calcula exportación o importación para múltiples países en paralelo.
// Cuenta como 1 cálculo del plan (no uno por país).
//
// Body para exportación:
//   { tipo:'exportacion', ncm_code, precio_producto, incoterm_base?, paises[] }
// Body para importación:
//   { tipo:'importacion', ncm_code, valor_fob, flete_impo?, paises[] }

const MAX_PAISES = 40

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { permitido, motivo, limitAlcanzado } = await verificarLimite(supabase, user.id, 'comparador')
  if (!permitido) {
    return NextResponse.json({ error: motivo, limitAlcanzado }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { tipo, ncm_code, paises = [] } = body

  if (!tipo || !['exportacion', 'importacion'].includes(tipo)) {
    return NextResponse.json({ error: 'tipo debe ser "exportacion" o "importacion"' }, { status: 400 })
  }
  if (!ncm_code) {
    return NextResponse.json({ error: 'ncm_code requerido' }, { status: 400 })
  }
  if (!Array.isArray(paises) || paises.length === 0) {
    return NextResponse.json({ error: 'paises debe ser un array no vacío' }, { status: 400 })
  }

  if (tipo === 'exportacion') {
    const { precio_producto, incoterm_base = 'FOB' } = body
    if (typeof precio_producto !== 'number' || precio_producto <= 0) {
      return NextResponse.json({ error: 'precio_producto debe ser mayor a 0' }, { status: 400 })
    }

    const paisesUnicos = [...new Set(paises)].slice(0, MAX_PAISES)
    const resultados = await Promise.all(
      paisesUnicos.map(async (pais_iso3) => {
        try {
          const data = await calcularExportacion({
            ncm_code,
            precio_producto,
            incoterm_base,
            incoterm_deseado: 'CIF',
            pais_destino: pais_iso3,
          })
          return { pais_iso3, ok: true, data }
        } catch (err) {
          return { pais_iso3, ok: false, error: err.message }
        }
      })
    )
    await registrarUso(supabase, user.id, 'comparador')
    return NextResponse.json({ ok: true, resultados })
  }

  // importacion
  const { valor_fob, flete_impo = 0 } = body
  if (typeof valor_fob !== 'number' || valor_fob < 0) {
    return NextResponse.json({ error: 'valor_fob debe ser mayor o igual a 0' }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const paisesUnicos = [...new Set(paises)].slice(0, MAX_PAISES)
  const resultados = await Promise.all(
    paisesUnicos.map(async (pais_iso3) => {
      try {
        const data = await calcularImportacion(serviceClient, {
          ncm_code,
          valor_fob,
          flete_internacional: flete_impo,
          pais_origen_iso3: pais_iso3,
          condicion_iva: 'responsable_inscripto',
        })
        if (data.error) return { pais_iso3, ok: false, error: data.error }
        return { pais_iso3, ok: true, data }
      } catch (err) {
        return { pais_iso3, ok: false, error: err.message }
      }
    })
  )
  await registrarUso(supabase, user.id, 'comparador')
  return NextResponse.json({ ok: true, resultados })
}
