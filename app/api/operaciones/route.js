import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verificarLimite, registrarUso } from '@/lib/usage-limiter'
import { normalizarCodigoNCM } from '@/lib/ncm-lookup'
import { INCOTERMS, CURRENCIES, TRANSPORT_MODES } from '@/lib/constants'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

const VALID_OPERATION_TYPES = ['importacion']
const VALID_INCOTERMS = INCOTERMS
const VALID_CURRENCIES = CURRENCIES
const VALID_TRANSPORT = TRANSPORT_MODES

// POST /api/operaciones — crea una operación validando el límite del plan
export async function POST(request) {
  try {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Verificar límite del plan
  try {
    const { permitido, motivo, limitAlcanzado } = await verificarLimite(supabase, user.id, 'operaciones')
    if (!permitido) {
      return NextResponse.json({ error: motivo, limitAlcanzado }, { status: 429 })
    }
  } catch (limErr) {
    console.error('[operaciones] verificarLimite exception:', limErr?.message)
    // No bloquear por error técnico en verificación
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const {
    operation_type,
    regimen = 'general',
    product_id = null,
    ncm_code = null,
    product_description = null,
    counterpart_name = null,
    counterpart_country = null,
    incoterm = null,
    payment_method = null,
    currency = 'USD',
    total_value = null,
    estimated_ship_date = null,
    transport_mode = null,
    customs_broker = null,
    notes = null,
  } = body

  if (!VALID_OPERATION_TYPES.includes(operation_type)) {
    return NextResponse.json({ error: 'operation_type inválido' }, { status: 400 })
  }
  if (incoterm && !VALID_INCOTERMS.includes(incoterm)) {
    return NextResponse.json({ error: 'incoterm inválido' }, { status: 400 })
  }
  if (currency && !VALID_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: 'currency inválida' }, { status: 400 })
  }
  if (transport_mode && !VALID_TRANSPORT.includes(transport_mode)) {
    return NextResponse.json({ error: 'transport_mode inválido' }, { status: 400 })
  }

  const status = 'impo_orden_compra'

  const { data, error: insertError } = await supabase
    .from('operations')
    .insert({
      user_id:             user.id,
      operation_type,
      regimen,
      status,
      product_id,
      ncm_code:            ncm_code?.trim() || null,
      product_description: product_description?.trim() || null,
      counterpart_name:    counterpart_name?.trim() || null,
      counterpart_country,
      incoterm,
      payment_method,
      currency,
      total_value:         total_value ? Number(total_value) : null,
      estimated_ship_date: estimated_ship_date || null,
      transport_mode,
      customs_broker:      customs_broker?.trim() || null,
      notes:               notes?.trim() || null,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[operaciones] Error al insertar:', insertError.message)
    return NextResponse.json({ error: 'Error al crear la operación', detail: insertError.message }, { status: 500 })
  }

  try {
    await registrarUso(supabase, user.id, 'operaciones')
  } catch (regErr) {
    console.error('[operaciones] registrarUso exception:', regErr?.message)
  }

  // Generar checklist automático (espera hasta 5s, no bloquea si falla)
  if (data.ncm_code && data.operation_type) {
    try {
      const operacionId = data.id
      const normalizado = normalizarCodigoNCM(data.ncm_code)
      const ncm = normalizado?.codigoNCM ?? data.ncm_code
      const tipoOp = data.operation_type

      const svc = getServiceClient()

      // Para courier_comercial/courier_personal: llamar también con 'courier' genérico
      const regimenEsEspecificoCourier = regimen.startsWith('courier_')
      const llamadas = regimenEsEspecificoCourier
        ? [
            svc.rpc('documentos_por_operacion', { p_tipo: tipoOp, p_regimen: regimen, p_ncm: ncm }),
            svc.rpc('documentos_por_operacion', { p_tipo: tipoOp, p_regimen: 'courier', p_ncm: ncm }),
            svc.rpc('intervenciones_por_operacion', { p_operacion: tipoOp, p_regimen: regimen, p_ncm: ncm }),
            svc.rpc('intervenciones_por_operacion', { p_operacion: tipoOp, p_regimen: 'courier', p_ncm: ncm }),
          ]
        : [
            svc.rpc('documentos_por_operacion', { p_tipo: tipoOp, p_regimen: regimen, p_ncm: ncm }),
            null,
            svc.rpc('intervenciones_por_operacion', { p_operacion: tipoOp, p_regimen: regimen, p_ncm: ncm }),
            null,
          ]

      const [docRes, docResCourier, intRes, intResCourier] = await Promise.all(
        llamadas.map(p => p ?? Promise.resolve({ data: [] }))
      )

      // Deduplicar por documento_nombre
      const docNombresVistos = new Set()
      const docsUnicos = [...(docRes.data ?? []), ...(docResCourier.data ?? [])].filter(d => {
        if (docNombresVistos.has(d.documento_nombre)) return false
        docNombresVistos.add(d.documento_nombre)
        return true
      })

      // Deduplicar organismos por organismo
      const orgNombresVistos = new Set()
      const orgsUnicos = [...(intRes.data ?? []), ...(intResCourier.data ?? [])].filter(o => {
        if (orgNombresVistos.has(o.organismo)) return false
        orgNombresVistos.add(o.organismo)
        return true
      })

      const rows = []
      for (const doc of docsUnicos) {
        rows.push({
          operation_id:      operacionId,
          document_name:     doc.documento_nombre,
          document_category: doc.documento_categoria,
          sort_order:        doc.sort_order ?? 0,
          is_completed:      false,
        })
      }
      for (const org of orgsUnicos) {
        rows.push({
          operation_id:      operacionId,
          document_name:     `[Organismo] ${org.organismo}`,
          document_category: org.estado === 'obligatorio' ? 'critico' : 'opcional',
          sort_order:        100,
          is_completed:      false,
        })
      }

      if (rows.length > 0) {
        const { error: insertErr } = await svc.from('operation_documents').insert(rows)
        if (insertErr) console.error('[checklist] insert error:', insertErr.message)
      }
    } catch (chkErr) {
      console.error('[checklist] excepcion:', chkErr?.message)
    }
  }

  return NextResponse.json({ operacion: data }, { status: 201 })
  } catch (err) {
    console.error('[operaciones] Unhandled exception:', err?.message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
