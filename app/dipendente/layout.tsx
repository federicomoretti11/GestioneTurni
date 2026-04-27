import { createClient } from '@/lib/supabase/server'
import { SidebarDipendente } from '@/components/layout/SidebarDipendente'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'

const BOTTOM_NAV_ITEMS = [
  { label: 'I miei turni', href: '/dipendente/turni', icon: '📅' },
  { label: 'Richieste',    href: '/dipendente/richieste', icon: '📋' },
  { label: 'Profilo',      href: '/dipendente/profilo', icon: '👤' },
]

export default async function DipendenteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarDipendente />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="dipendente" userId={user!.id} />
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <BottomNav items={BOTTOM_NAV_ITEMS} />
    </div>
  )
}
