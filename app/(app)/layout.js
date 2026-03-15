import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8edf5' }}>
      <AppHeader user={user} />
      <main style={{ paddingTop: '64px' }}>
        {children}
      </main>
    </div>
  )
}
