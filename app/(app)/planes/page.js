import { createClient } from '@/lib/supabase/server'
import PlanesClient from './PlanesClient'

export const metadata = { title: 'Planes — trade.ai' }

export default async function PlanesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('users_profile')
    .select('plan_type')
    .eq('id', user.id)
    .single()

  return (
    <PlanesClient planActual={perfil?.plan_type ?? 'free'} />
  )
}
