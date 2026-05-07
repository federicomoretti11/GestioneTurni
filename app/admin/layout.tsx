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
  const { data: profile } = await supabase.from('profiles').select('nome, cognome, tenants(nome)').eq('id', user!.id).single()
  const tenantName = (profile?.tenants as { nome?: string } | null)?.nome ?? ''

  return (
    <div className="flex h-screen bg-[#FAFAF8]">
      <SidebarAdmin />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="admin" userId={user!.id} navItems={NAV_ITEMS} tenantName={tenantName} />
        <main className="flex-1 overflow-auto flex flex-col" style={{ backgroundImage: 'url(/circuit-pattern.svg)', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
          <div className="flex-1 flex flex-col px-4 sm:px-6 pt-6 pb-8">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  )
}
