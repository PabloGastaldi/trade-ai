import { createClient } from '@/lib/supabase/server'
import CatalogoClient from './CatalogoClient'

export const metadata = { title: 'Catálogo de productos — trade.ai' }

export default async function CatalogoPage() {
  const supabase = await createClient()

  const { data: productos, error } = await supabase
    .from('user_products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const { data: paises } = await supabase
    .from('country_codes')
    .select('iso3, name_es')
    .order('name_es')

  if (error) {
    console.error('Error cargando catálogo:', error.message)
  }

  return (
    <CatalogoClient
      productosIniciales={productos ?? []}
      paises={paises ?? []}
    />
  )
}
