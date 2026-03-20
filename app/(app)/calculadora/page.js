import { createClient } from '@/lib/supabase/server'
import CalculadoraClient from './CalculadoraClient'

export const metadata = { title: 'Calculadora de costos — trade.ai' }

export default async function CalculadoraPage() {
  const supabase = await createClient()

  // Productos activos del usuario (para el selector)
  const { data: productos } = await supabase
    .from('user_products')
    .select('id, name, ncm_code, unit_price, currency, incoterm, operation_type, default_origin, default_destination')
    .eq('is_active', true)
    .order('name')

  // Países para los selects
  const { data: paises } = await supabase
    .from('country_codes')
    .select('iso3, name_es')
    .order('name_es')

  return (
    <CalculadoraClient
      productos={productos ?? []}
      paises={paises ?? []}
    />
  )
}
