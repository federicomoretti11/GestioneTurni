import { createClient } from '@/lib/supabase/server'
import { SidebarAdmin } from '@/components/layout/SidebarAdmin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const NAV_ITEMS = [
  { label: 'Home', href: '/home', icon: '🏠' },
  { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { label: 'Calendario', href: '/admin/calendario', icon: '📅' },
  { label: 'Per posto', href: '/admin/calendario-posti', icon: '📍' },
  { label: 'Programmazione', href: '/admin/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per posto', href: '/admin/calendario-programmazione-posti', icon: '📝' },
  { label: 'Turni', href: '/admin/template', icon: '🏷️' },
  { label: 'Task', href: '/admin/task', icon: '✅' },
  { label: 'Export', href: '/admin/export', icon: '📤' },
  { label: 'Utenti', href: '/admin/utenti', icon: '👥' },
  { label: 'Posti', href: '/admin/posti', icon: '📍' },
  { label: 'Festivi', href: '/admin/festivi', icon: '🎉' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarAdmin />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="admin" userId={user!.id} navItems={NAV_ITEMS} />
        <main className="flex-1 overflow-auto">
          <div className="min-h-full flex flex-col p-4">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  )
}
