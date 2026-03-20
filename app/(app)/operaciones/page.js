import { createClient } from '@/lib/supabase/server'
import OperacionesClient from './OperacionesClient'

export const metadata = { title: 'Operaciones — trade.ai' }

export default async function OperacionesPage() {
  const supabase = await createClient()

  // Operaciones con conteo de documentos completos/total
  const { data: operaciones, error } = await supabase
    .from('operations')
    .select(`
      *,
      docs_total:operation_documents(count),
      docs_completos:operation_documents(count)
    `)
    .order('created_at', { ascending: false })

  // Supabase no soporta filtros en aggregates inline, cargamos docs por separado
  const { data: operacionesBase } = await supabase
    .from('operations')
    .select('*')
    .order('created_at', { ascending: false })

  // Conteo de documentos por operación
  let docsMap = {}
  if (operacionesBase && operacionesBase.length > 0) {
    const ids = operacionesBase.map(o => o.id)
    const { data: docs } = await supabase
      .from('operation_documents')
      .select('operation_id, is_completed')
      .in('operation_id', ids)

    if (docs) {
      for (const d of docs) {
        if (!docsMap[d.operation_id]) docsMap[d.operation_id] = { total: 0, completos: 0 }
        docsMap[d.operation_id].total++
        if (d.is_completed) docsMap[d.operation_id].completos++
      }
    }
  }

  // Productos del catálogo para autocompletar el formulario
  const { data: productos } = await supabase
    .from('user_products')
    .select('id, name, ncm_code, incoterm, currency, unit_price, operation_type, default_destination, default_origin')
    .eq('is_active', true)
    .order('name')

  // Países para los selects
  const { data: paises } = await supabase
    .from('country_codes')
    .select('iso3, name_es')
    .order('name_es')

  if (error) {
    console.error('Error cargando operaciones:', error.message)
  }

  const operacionesConDocs = (operacionesBase ?? []).map(op => ({
    ...op,
    docs_total: docsMap[op.id]?.total ?? 0,
    docs_completos: docsMap[op.id]?.completos ?? 0,
  }))

  return (
    <OperacionesClient
      operacionesIniciales={operacionesConDocs}
      productos={productos ?? []}
      paises={paises ?? []}
    />
  )
}
