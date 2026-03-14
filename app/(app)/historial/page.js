import { createClient } from '@/lib/supabase/server'
import HistorialClient from './HistorialClient'

const POR_PAGINA = 20

export default async function HistorialPage() {
  const supabase = await createClient()

  // Carga inicial SSR — RLS filtra automáticamente por usuario
  const { data: consultas, count, error } = await supabase
    .from('queries_log')
    .select('id, query_text, response_text, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, POR_PAGINA - 1)

  if (error) {
    console.error('Error cargando historial:', error.message)
  }

  return (
    <HistorialClient
      consultasIniciales={consultas ?? []}
      totalInicial={count ?? 0}
      porPagina={POR_PAGINA}
    />
  )
}
