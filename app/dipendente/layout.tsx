import { createClient } from '@/lib/supabase/server'
import { getImpostazioni, moduliPerRuolo } from '@/lib/impostazioni'
import { SidebarDipendente } from '@/components/layout/SidebarDipendente'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const BASE_NAV_ITEMS = [
  { label: 'Home', href: '/home', icon: '🏠' },
  { label: 'I miei turni', href: '/dipendente/turni', icon: '📅' },
  { label: 'Richieste', href: '/dipendente/richieste', icon: '📋' },
  { label: 'Profilo', href: '/dipendente/profilo', icon: '👤' },
]

export default async function DipendenteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome, tenants(nome)').eq('id', user!.id).single()
  const tenantName = (profile?.tenants as { nome?: string } | null)?.nome ?? ''

  const imp = await getImpostazioni()
  const moduli = moduliPerRuolo(imp, 'dipendente')
  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(moduli.modulo_tasks_abilitato    ? [{ label: 'Task',     href: '/dipendente/task',     icon: '✅' }] : []),
    ...(moduli.modulo_cedolini_abilitato ? [{ label: 'Cedolini', href: '/dipendente/cedolini', icon: '💰' }] : []),
  ]

  return (
    <div className="flex h-screen bg-[#FAFAF8]">
      <SidebarDipendente moduli={{ tasks: moduli.modulo_tasks_abilitato, cedolini: moduli.modulo_cedolini_abilitato, whiteLabelAbilitato: imp.white_label_abilitato }} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="dipendente" userId={user!.id} navItems={navItems} tenantName={tenantName} chatUserId={user!.id} />
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
