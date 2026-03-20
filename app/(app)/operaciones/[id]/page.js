import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DetalleClient from './DetalleClient'

export async function generateMetadata({ params }) {
  return { title: 'Detalle de operación — trade.ai' }
}

export default async function DetalleOperacionPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  // Operación principal
  const { data: operacion, error } = await supabase
    .from('operations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !operacion) notFound()

  // Documentos del checklist
  const { data: documentos } = await supabase
    .from('operation_documents')
    .select('*')
    .eq('operation_id', id)
    .order('sort_order')

  // Timeline de cambios de estado
  const { data: timeline } = await supabase
    .from('operation_timeline')
    .select('*')
    .eq('operation_id', id)
    .order('changed_at', { ascending: false })

  // País de la contraparte
  const { data: paises } = await supabase
    .from('country_codes')
    .select('iso3, name_es')
    .order('name_es')

  return (
    <DetalleClient
      operacion={operacion}
      documentosIniciales={documentos ?? []}
      timelineInicial={timeline ?? []}
      paises={paises ?? []}
    />
  )
}
