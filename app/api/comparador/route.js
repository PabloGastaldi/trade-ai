import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { calcularImportacion } from '@/lib/calculadora/calc-importacion'
import { verificarLimite, registrarUso } from '@/lib/usage-limiter'
import { normalizarCodigoNCM } from '@/lib/ncm-lookup'

// Cantidad de medidas NTM que Argentina aplica a importaciones, por país de origen.
async function fetchNtmCounts(supabase, hs6, paisesISO3) {
  const { data } = await supabase
    .from('ntm_measures_applied_by_argentina')
    .select('pais_afectado')
    .eq('hs_code', hs6)
    .in('pais_afectado', paisesISO3)

  const counts = {}
  for (const row of data ?? []) {
    const p = row.pais_afectado
    counts[p] = (counts[p] ?? 0) + 1
  }
  return counts
}

function ntmSemaforo(count) {
  if (count <= 2) return 'verde'
  if (count <= 5) return 'amarillo'
  return 'rojo'
}

// POST /api/comparador
// Compara el costo de importación de un NCM desde múltiples países de origen.
// Cuenta como 1 cálculo del plan (no uno por país).
//   Body: { ncm_code, valor_fob, flete_impo?, paises[] }

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

  const { ncm_code, paises = [], valor_fob, flete_impo = 0 } = body

  if (!ncm_code) {
    return NextResponse.json({ error: 'ncm_code requerido' }, { status: 400 })
  }
  if (!Array.isArray(paises) || paises.length === 0) {
    return NextResponse.json({ error: 'paises debe ser un array no vacío' }, { status: 400 })
  }
  if (typeof valor_fob !== 'number' || valor_fob < 0) {
    return NextResponse.json({ error: 'valor_fob debe ser mayor o igual a 0' }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const paisesUnicos = [...new Set(paises)].slice(0, MAX_PAISES)
  const normalizado = normalizarCodigoNCM(ncm_code)
  const hs6 = normalizado ? normalizado.codigoNCM.slice(0, 6) : null

  const [resultados, ntmCounts] = await Promise.all([
    Promise.all(
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
    ),
    hs6
      ? fetchNtmCounts(supabase, hs6, paisesUnicos).catch(() => ({}))
      : Promise.resolve({}),
  ])

  const resultadosConNtm = resultados.map(r => {
    const count = ntmCounts[r.pais_iso3] ?? 0
    return { ...r, ntm: { count, semaforo: ntmSemaforo(count) } }
  })

  await registrarUso(supabase, user.id, 'comparador')
  return NextResponse.json({ ok: true, resultados: resultadosConNtm })
}
