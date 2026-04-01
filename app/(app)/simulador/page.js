import { createClient } from '@/lib/supabase/server'
import SimuladorClient from './SimuladorClient'

export const metadata = { title: 'Simulador de operación — trade.ai' }

export default async function SimuladorPage() {
  const supabase = await createClient()

  const { data: paises } = await supabase
    .from('country_codes')
    .select('iso3, name_es')
    .order('name_es')

  return <SimuladorClient paises={paises ?? []} />
}
