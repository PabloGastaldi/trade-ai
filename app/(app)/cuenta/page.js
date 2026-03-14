import { createClient } from '@/lib/supabase/server'
import CuentaClient from './CuentaClient'

export default async function CuentaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('users_profile')
    .select('full_name, company_name, plan_type, queries_this_month, queries_reset_date')
    .eq('id', user.id)
    .single()

  return (
    <CuentaClient
      user={{ id: user.id, email: user.email }}
      perfil={perfil ?? {
        full_name: '',
        company_name: '',
        plan_type: 'free',
        queries_this_month: 0,
        queries_reset_date: null,
      }}
    />
  )
}
