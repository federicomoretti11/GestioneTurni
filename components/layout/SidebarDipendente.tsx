'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'
import { createClient } from '@/lib/supabase/client'

interface Moduli { tasks?: boolean; cedolini?: boolean; whiteLabelAbilitato?: boolean }
interface Branding { logoUrl?: string; nomeApp?: string; colorePrimario?: string }

export function SidebarDipendente({ moduli }: { moduli?: Moduli }) {
  const [mounted, setMounted] = useState(false)
  const [tenantName, setTenantName] = useState<string>('')
  const [branding, setBranding] = useState<Branding | undefined>(undefined)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('tenants(nome, nome_app, colore_primario, logo_url)').eq('id', user.id).single()
        .then(({ data }) => {
          const t = data?.tenants as { nome?: string; nome_app?: string; colore_primario?: string; logo_url?: string } | null
          if (t?.nome) setTenantName(t.nome)
          if (moduli?.whiteLabelAbilitato && t) {
            setBranding({ logoUrl: t.logo_url, nomeApp: t.nome_app, colorePrimario: t.colore_primario })
          }
        })
    })
  }, [])

  const count = useRichiesteCount()
  const pathname = usePathname()

  const opItems = [
    ...(moduli?.tasks !== false ? [{ label: 'Task', href: '/dipendente/task', icon: '✅' }] : []),
    { label: 'Richieste', href: '/dipendente/richieste', icon: '📋',
      badge: mounted && pathname !== '/dipendente/richieste' ? count : 0 },
  ].map(item => ({ ...item, section: 'Operatività' }))

  const contItems = [
    ...(moduli?.cedolini ? [{ label: 'Cedolini', href: '/dipendente/cedolini', icon: '💰' }] : []),
  ].map(item => ({ ...item, section: 'Contabilità' }))

  const items = [
    { label: 'Home', href: '/home', icon: '🏠' },

    { section: 'Calendario', label: 'I miei turni', href: '/dipendente/turni', icon: '📅' },

    ...opItems,

    ...contItems,

    { section: 'Impostazioni', label: 'Profilo', href: '/dipendente/profilo', icon: '👤' },
  ]

  return <Sidebar items={items} title="I Miei Turni" ruolo="dipendente" tenantName={tenantName} branding={branding} />
}
