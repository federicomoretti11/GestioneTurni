import { createClient } from '@/lib/supabase/server'
import { SidebarManager } from '@/components/layout/SidebarManager'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const NAV_ITEMS = [
  { label: 'Home', href: '/home', icon: '🏠' },
  { label: 'Calendario', href: '/manager/calendario', icon: '📅' },
  { label: 'Per posto', href: '/manager/calendario-posti', icon: '📍' },
  { label: 'Programmazione', href: '/manager/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per posto', href: '/manager/calendario-programmazione-posti', icon: '📝' },
  { label: 'Turni', href: '/manager/template', icon: '🏷️' },
  { label: 'Task', href: '/manager/task', icon: '✅' },
  { label: 'Export', href: '/manager/export', icon: '📤' },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  return (
    <div className="flex h-screen bg-[#FAFAF8]">
      <SidebarManager />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="manager" userId={user!.id} navItems={NAV_ITEMS} />
        <main className="flex-1 overflow-auto">
          <div className="min-h-full flex flex-col px-4 sm:px-6 pt-6 pb-8">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  )
}
