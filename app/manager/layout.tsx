import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'

const NAV_ITEMS = [
  { label: 'Calendario', href: '/manager/calendario', icon: '📅' },
  { label: 'Per posto', href: '/manager/calendario-posti', icon: '📍' },
  { label: 'Template', href: '/manager/template', icon: '🏷️' },
  { label: 'Export', href: '/manager/export', icon: '📤' },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar items={NAV_ITEMS} title="GestioneTurni" ruolo="manager" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="manager" />
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}
