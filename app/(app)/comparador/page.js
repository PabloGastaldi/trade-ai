import { createClient } from '@/lib/supabase/server'
import ComparadorClient from './ComparadorClient'

export const metadata = { title: 'Comparador por país — trade.ai' }

export default async function ComparadorPage() {
  const supabase = await createClient()

  const { data: productos } = await supabase
    .from('user_products')
    .select('id, name, ncm_code, unit_price, currency, incoterm, operation_type, default_origin, default_destination')
    .eq('is_active', true)
    .order('name')

  const { data: paises } = await supabase
    .from('country_codes')
    .select('iso3, name_es')
    .order('name_es')

  return (
    <ComparadorClient
      productos={productos ?? []}
      paises={paises ?? []}
    />
  )
}
