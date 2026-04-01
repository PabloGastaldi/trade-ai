import { NextResponse } from 'next/server'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { normalizarCodigoNCM } from '@/lib/ncm-lookup'
import { verificarLimite, registrarUso } from '@/lib/usage-limiter'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

const REGIMENES_VALIDOS = ['general', 'courier', 'puerta_a_puerta', 'exporta_simple', 'muestras', 'rancho', 'equipaje']
const TIPOS_VALIDOS = ['importacion', 'exportacion']

// Verifica si el capítulo NCM matchea un patrón tipo "01%,02%,03%"
function capituloMatcheaPatron(capitulo, patron) {
  if (!patron || patron === 'nan' || patron === '') return false
  const caps = patron.split(',').map(p => p.trim().replace('%', '').padStart(2, '0'))
  return caps.includes(capitulo.padStart(2, '0'))
}

export async function POST(request) {
  // Verificar autenticación
  const authSupabase = await createAuthClient()
  const { data: { user }, error: authError } = await authSupabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Verificar límite del plan
  const { permitido, motivo, limitAlcanzado } = await verificarLimite(authSupabase, user.id, 'simulador')
  if (!permitido) {
    return NextResponse.json({ error: motivo, limitAlcanzado }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { codigo_ncm: rawNcm, pais_iso3, tipo_operacion, regimen } = body

  // Validaciones
  if (!rawNcm) return NextResponse.json({ error: 'codigo_ncm requerido' }, { status: 400 })
  if (!pais_iso3) return NextResponse.json({ error: 'pais_iso3 requerido' }, { status: 400 })
  if (!TIPOS_VALIDOS.includes(tipo_operacion)) {
    return NextResponse.json({ error: 'tipo_operacion debe ser "importacion" o "exportacion"' }, { status: 400 })
  }
  if (!REGIMENES_VALIDOS.includes(regimen)) {
    return NextResponse.json({ error: `regimen inválido: ${regimen}` }, { status: 400 })
  }

  const normalizado = normalizarCodigoNCM(rawNcm)
  if (!normalizado || normalizado.esParcial) {
    return NextResponse.json({ error: 'Código NCM inválido o incompleto (se requieren 11 dígitos)' }, { status: 400 })
  }
  const codigo_ncm = normalizado.codigoNCM
  const capitulo = codigo_ncm.slice(0, 2)

  const supabase = getServiceClient()

  // PASO 1: Resolver ISO3 → nombre en español (requerido para queries de acuerdos)
  const { data: countryRow, error: countryError } = await supabase
    .from('country_codes')
    .select('iso3, name_es, name_en')
    .eq('iso3', pais_iso3.toUpperCase())
    .single()

  if (countryError || !countryRow) {
    return NextResponse.json({ error: `País no encontrado: ${pais_iso3}` }, { status: 400 })
  }

  const nombre_pais_es = countryRow.name_es

  // PASO 2: Todas las queries en paralelo
  const [
    ncmResult,
    arancelesImpoResult,
    arancelesExpoResult,
    acuerdosResult,
    acuerdosGeneralesResult,
    documentosResult,
    intervencionesResult,
    restriccionesResult,
    ntmResult,
    destinoTariffsResult,
  ] = await Promise.all([
    // 1. Datos base NCM
    supabase.from('ncm')
      .select('codigo_ncm, descripcion, seccion, capitulo, partida')
      .eq('codigo_ncm', codigo_ncm)
      .single(),

    // 2. Aranceles importación
    tipo_operacion === 'importacion'
      ? supabase.from('aranceles_importacion')
          .select('aec, die, dii, te, iva, iva_ad, gan, iibb')
          .eq('codigo_ncm', codigo_ncm)
          .single()
      : Promise.resolve({ data: null }),

    // 3. Aranceles exportación
    tipo_operacion === 'exportacion'
      ? supabase.from('aranceles_exportacion')
          .select('derecho_exportacion, reintegro')
          .eq('codigo_ncm', codigo_ncm)
          .single()
      : Promise.resolve({ data: null }),

    // 4. Acuerdos/preferencias con ese país
    supabase.from(tipo_operacion === 'importacion' ? 'acuerdos_importacion' : 'acuerdos_exportacion')
      .select('bloque, pais, codigo_acuerdo, porcentaje, nomenclatura, ncm_acuerdo')
      .eq('codigo_ncm', codigo_ncm)
      .ilike('pais', `%${nombre_pais_es}%`)
      .order('porcentaje', { ascending: false })
      .limit(10),

    // 5. TLC generales (cobertura total, sin NCM específico)
    supabase.from('acuerdos_generales')
      .select('acuerdo_id, pais, tipo, notas')
      .ilike('pais', `%${nombre_pais_es}%`),

    // 6. Documentos requeridos
    supabase.from('documentos_requeridos')
      .select('*')
      .eq('tipo_operacion', tipo_operacion)
      .eq('regimen', regimen)
      .order('sort_order'),

    // 7. Organismos que intervienen
    supabase.from('regimen_intervenciones')
      .select('*')
      .eq('operacion', tipo_operacion)
      .eq('regimen', regimen),

    // 8. Restricciones del régimen
    supabase.from('restricciones_regimenes')
      .select('*')
      .eq('regimen', regimen),

    // 9. Barreras NTM (Argentina aplica a importaciones)
    tipo_operacion === 'importacion'
      ? supabase.from('ntm_measures')
          .select('reporter, partner, ntm_code, ntm_full_coverage, ntm_partial_coverage')
          .eq('reporter', 'ARG')
          .eq('partner', pais_iso3.toUpperCase())
          .eq('hs_code', codigo_ncm.slice(0, 6))
          .eq('ntm_all', 1)
          .limit(20)
      : supabase.from('ntm_measures')
          .select('reporter, partner, ntm_code, ntm_full_coverage, ntm_partial_coverage')
          .eq('reporter', pais_iso3.toUpperCase())
          .eq('partner', 'ARG')
          .eq('hs_code', codigo_ncm.slice(0, 6))
          .eq('ntm_all', 1)
          .limit(20),

    // 10. Aranceles en destino (solo exportación)
    tipo_operacion === 'exportacion'
      ? supabase.from('destination_tariffs')
          .select('hs_code, partner_iso3, ave_pct, source')
          .eq('partner_iso3', pais_iso3.toUpperCase())
          .eq('hs_code', codigo_ncm.slice(0, 6))
          .limit(5)
      : Promise.resolve({ data: null }),
  ])

  if (ncmResult.error || !ncmResult.data) {
    return NextResponse.json({ error: `NCM no encontrado: ${codigo_ncm}` }, { status: 404 })
  }

  const ncm = ncmResult.data
  const ai = arancelesImpoResult.data ?? {}
  const ae = arancelesExpoResult.data ?? {}
  const acuerdos = acuerdosResult.data ?? []
  const acuerdosGenerales = acuerdosGeneralesResult.data ?? []
  const documentosTodos = documentosResult.data ?? []
  const intervencionesTodas = intervencionesResult.data ?? []
  const restricciones = restriccionesResult.data ?? []
  const ntmMedidas = ntmResult.data ?? []
  const destinoTariffs = destinoTariffsResult.data ?? []

  // ── Post-procesamiento: filtrar documentos por NCM y país ──
  const documentosFiltrados = documentosTodos.filter(doc => {
    if (doc.ncm_patron && doc.ncm_patron !== 'nan' && doc.ncm_patron !== '') {
      if (!capituloMatcheaPatron(capitulo, doc.ncm_patron)) return false
    }
    if (doc.pais_patron && doc.pais_patron !== 'nan' && doc.pais_patron !== '') {
      if (!doc.pais_patron.toLowerCase().includes(pais_iso3.toLowerCase())) return false
    }
    return true
  })

  // ── Post-procesamiento: filtrar intervenciones por NCM ──
  const intervencionesFiltradas = intervencionesTodas.filter(inter => {
    if (inter.ncm_patron && inter.ncm_patron !== 'nan' && inter.ncm_patron !== '') {
      return capituloMatcheaPatron(capitulo, inter.ncm_patron)
    }
    return true
  })

  // ── Calcular preferencia arancelaria ──
  const mejorAcuerdo = acuerdos.length > 0 ? acuerdos[0] : null
  const tlcGeneral = acuerdosGenerales.length > 0 ? acuerdosGenerales[0] : null

  let arancelBase = 0
  let arancelEfectivo = 0

  if (tipo_operacion === 'importacion') {
    const MERCOSUR = ['BRA', 'PRY', 'URY']
    arancelBase = MERCOSUR.includes(pais_iso3.toUpperCase())
      ? (ai.dii ?? 0)
      : (ai.die ?? ai.aec ?? 0)

    if (mejorAcuerdo) {
      arancelEfectivo = arancelBase * (1 - mejorAcuerdo.porcentaje / 100)
    } else if (tlcGeneral) {
      arancelEfectivo = 0  // TLC de cobertura total → arancel 0
    } else {
      arancelEfectivo = arancelBase
    }
  }

  // ── Aranceles en destino ──
  const arancelDestino = destinoTariffs.length > 0 ? destinoTariffs[0] : null

  // ── Warnings ──
  const warnings = []

  // Organismos obligatorios importantes
  const organismos = intervencionesFiltradas.filter(i => i.estado === 'obligatorio')
  if (organismos.length > 0) {
    const nombres = organismos.map(o => o.organismo).join(', ')
    warnings.push(`Intervención obligatoria: ${nombres}`)
  }

  // Restricciones de régimen
  if (restricciones.length > 0 && regimen !== 'general') {
    restricciones.forEach(r => {
      if (r.valor && r.valor !== 'nan') {
        warnings.push(`${r.restriccion}: ${r.valor}`)
      }
    })
  }

  // NTM categories map
  const NTM_CATEGORIAS = {
    A: 'Sanitaria/Fitosanitaria (SPS)',
    B: 'Barrera técnica (TBT)',
    C: 'Inspección previa al embarque',
    D: 'Medidas contingentes de comercio',
    E: 'Licencias, cuotas, prohibiciones',
    F: 'Control de precios',
    G: 'Medidas financieras',
    H: 'Medidas anticompetitivas',
    P: 'Medida de exportación',
  }

  const ntmProcesadas = ntmMedidas.map(m => ({
    codigo: m.ntm_code,
    tipo: NTM_CATEGORIAS[m.ntm_code?.charAt(0)?.toUpperCase()] ?? `Categoría ${m.ntm_code?.charAt(0) ?? '?'}`,
    cobertura: m.ntm_full_coverage === 1 ? 'total' : m.ntm_partial_coverage === 1 ? 'parcial' : 'específica',
  }))

  // Agrupar documentos por categoría
  const docsPorCategoria = {
    criticos:    documentosFiltrados.filter(d => d.documento_categoria === 'critico'),
    importantes: documentosFiltrados.filter(d => d.documento_categoria === 'importante'),
    opcionales:  documentosFiltrados.filter(d => !['critico', 'importante'].includes(d.documento_categoria)),
  }

  // Agrupar organismos por estado
  const organismosPorEstado = {
    obligatorios:  intervencionesFiltradas.filter(i => i.estado === 'obligatorio'),
    condicionales: intervencionesFiltradas.filter(i => i.estado !== 'obligatorio'),
  }

  const response = {
    ncm: {
      codigo_ncm: ncm.codigo_ncm,
      descripcion: ncm.descripcion,
      seccion: ncm.seccion,
      capitulo: ncm.capitulo,
      partida: ncm.partida,
    },
    pais: {
      iso3: countryRow.iso3,
      nombre: countryRow.name_en,
      nombre_es: countryRow.name_es,
    },
    tipo_operacion,
    regimen,

    aranceles: tipo_operacion === 'importacion'
      ? {
          aec:  ai.aec  ?? null,
          die:  ai.die  ?? null,
          dii:  ai.dii  ?? null,
          te:   ai.te   ?? null,
          iva:  ai.iva  ?? null,
          iva_ad: ai.iva_ad ?? null,
          gan:  ai.gan  ?? null,
          iibb: ai.iibb ?? null,
          arancel_base: arancelBase,
        }
      : {
          derecho_exportacion: ae.derecho_exportacion ?? null,
          reintegro: ae.reintegro ?? null,
        },

    preferencias: {
      tiene_preferencia: mejorAcuerdo !== null || tlcGeneral !== null,
      acuerdos: acuerdos,
      mejor_preferencia: mejorAcuerdo?.porcentaje ?? null,
      arancel_efectivo: tipo_operacion === 'importacion' ? Math.round(arancelEfectivo * 100) / 100 : null,
      tlc_general: tlcGeneral,
    },

    documentos: docsPorCategoria,

    organismos: organismosPorEstado,

    restricciones: restricciones.map(r => ({
      ...r,
      notas: r.notas === 'nan' ? null : r.notas,
    })),

    barreras_ntm: ntmProcesadas,

    aranceles_destino: tipo_operacion === 'exportacion' && arancelDestino
      ? {
          hs_code: arancelDestino.hs_code,
          ave_pct: arancelDestino.ave_pct,
          fuente: arancelDestino.source,
        }
      : null,

    warnings,
  }

  await registrarUso(authSupabase, user.id, 'simulador')
  return NextResponse.json(response)
}
