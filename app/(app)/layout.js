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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <AppHeader user={user} />
      <main style={{ paddingTop: '60px' }}>
        {children}
      </main>
    </div>
  )
}
