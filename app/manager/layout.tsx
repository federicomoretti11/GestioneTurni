import { createClient } from '@/lib/supabase/server'
import { SidebarManager } from '@/components/layout/SidebarManager'
import { Header } from '@/components/layout/Header'

const NAV_ITEMS = [
  { label: 'Home', href: '/home', icon: '🏠' },
  { label: 'Calendario', href: '/manager/calendario', icon: '📅' },
  { label: 'Per posto', href: '/manager/calendario-posti', icon: '📍' },
  { label: 'Programmazione', href: '/manager/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per posto', href: '/manager/calendario-programmazione-posti', icon: '📝' },
  { label: 'Turni', href: '/manager/template', icon: '🏷️' },
  { label: 'Export', href: '/manager/export', icon: '📤' },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarManager />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="manager" userId={user!.id} navItems={NAV_ITEMS} />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  )
}
