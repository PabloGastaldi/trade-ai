import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InicioClient from './InicioClient'

export const metadata = {
  title: 'Inicio — trade.ai',
}

export default async function InicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const nombre = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null

  // Últimas consultas — queries_log
  const { data: ultimasConsultas } = await supabase
    .from('queries_log')
    .select('id, query_text, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Cantidad de productos en catálogo
  const { count: cantProductos } = await supabase
    .from('user_products')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Última operación
  const { data: operaciones } = await supabase
    .from('operations')
    .select('id, operation_type, country, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  // Plan del usuario
  const { data: perfil } = await supabase
    .from('users_profile')
    .select('plan_type, queries_this_month')
    .eq('id', user.id)
    .single()

  return (
    <InicioClient
      nombre={nombre}
      ultimasConsultas={ultimasConsultas ?? []}
      cantProductos={cantProductos ?? 0}
      ultimaOperacion={operaciones?.[0] ?? null}
      perfil={perfil ?? { plan_type: 'free', queries_this_month: 0 }}
    />
  )
}
