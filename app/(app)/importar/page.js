import { createClient } from '@/lib/supabase/server'
import ImportarClient from './ImportarClient'

export const metadata = { title: 'Importar — trade.ai' }

export default async function ImportarPage() {
  const supabase = await createClient()

  const { data: paises } = await supabase
    .from('country_codes')
    .select('iso3, name_es')
    .order('name_es')

  return <ImportarClient paises={paises ?? []} />
}
