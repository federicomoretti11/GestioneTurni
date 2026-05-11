import { createClient } from '@/lib/supabase/server'
import { getImpostazioni, moduliPerRuolo } from '@/lib/impostazioni'
import { SidebarAdmin } from '@/components/layout/SidebarAdmin'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const BASE_NAV_ITEMS = [
  { label: 'Home', href: '/home', icon: '🏠' },
  { label: 'Calendario', href: '/admin/calendario', icon: '📅' },
  { label: 'Per sito', href: '/admin/calendario-posti', icon: '📍' },
  { label: 'Programmazione', href: '/admin/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per sito', href: '/admin/calendario-programmazione-posti', icon: '📝' },
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

  const imp = await getImpostazioni()
  const moduli = moduliPerRuolo(imp, 'admin')
  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(moduli.modulo_cedolini_abilitato ? [{ label: 'Cedolini', href: '/admin/cedolini', icon: '💰' }] : []),
    ...(moduli.modulo_paghe_abilitato ? [{ label: 'Paghe', href: '/admin/paghe', icon: '📊' }] : []),
  ]

  return (
    <div className="flex h-screen bg-[#FAFAF8]">
      <SidebarAdmin moduli={{ tasks: moduli.modulo_tasks_abilitato, documenti: moduli.modulo_documenti_abilitato, cedolini: moduli.modulo_cedolini_abilitato, analytics: moduli.modulo_analytics_abilitato }} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="admin" userId={user!.id} navItems={navItems} tenantName={tenantName} />
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
