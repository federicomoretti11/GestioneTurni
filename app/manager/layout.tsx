import { createClient } from '@/lib/supabase/server'
import { getImpostazioni, moduliPerRuolo } from '@/lib/impostazioni'
import { SidebarManager } from '@/components/layout/SidebarManager'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const BASE_NAV_ITEMS = [
  { label: 'Home', href: '/home', icon: '🏠' },
  { label: 'Calendario', href: '/manager/calendario', icon: '📅' },
  { label: 'Per sito', href: '/manager/calendario-posti', icon: '📍' },
  { label: 'Programmazione', href: '/manager/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per sito', href: '/manager/calendario-programmazione-posti', icon: '📝' },
  { label: 'Turni', href: '/manager/template', icon: '🏷️' },
  { label: 'Export', href: '/manager/export', icon: '📤' },
  { label: 'Utenti', href: '/manager/utenti', icon: '👥' },
  { label: 'Posti', href: '/manager/posti', icon: '📍' },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome, is_super_admin, tenants(nome)').eq('id', user!.id).single()
  const tenantName = (profile?.tenants as { nome?: string } | null)?.nome ?? ''

  const imp = await getImpostazioni()
  const moduli = moduliPerRuolo(imp, 'manager')
  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(moduli.modulo_tasks_abilitato    ? [{ label: 'Task',      href: '/manager/task',      icon: '✅' }] : []),
    ...(moduli.modulo_documenti_abilitato ? [{ label: 'Documenti', href: '/manager/documenti', icon: '🗄️' }] : []),
    ...(moduli.modulo_cedolini_abilitato  ? [{ label: 'Cedolini',  href: '/manager/cedolini',  icon: '💰' }] : []),
    ...(moduli.modulo_analytics_abilitato ? [{ label: 'Analytics', href: '/manager/analytics', icon: '📊' }] : []),
  ]

  return (
    <div className="flex h-screen bg-[#FAFAF8]">
      <SidebarManager moduli={{ tasks: moduli.modulo_tasks_abilitato, documenti: moduli.modulo_documenti_abilitato, cedolini: moduli.modulo_cedolini_abilitato, analytics: moduli.modulo_analytics_abilitato, whiteLabelAbilitato: imp.white_label_abilitato }} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="manager" userId={user!.id} navItems={navItems} tenantName={tenantName} chatUserId={user!.id} isSuperAdmin={!!(profile as { is_super_admin?: boolean } | null)?.is_super_admin} />
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
