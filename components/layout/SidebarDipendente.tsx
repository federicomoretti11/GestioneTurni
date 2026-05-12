'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'
import { createClient } from '@/lib/supabase/client'

const BASE_ITEMS = [
  { label: 'Home',         href: '/home',                   icon: '🏠' },
  { label: 'I miei turni', href: '/dipendente/turni',       icon: '📅' },
  { label: 'Richieste',    href: '/dipendente/richieste',   icon: '📋' },
  { label: 'Profilo',      href: '/dipendente/profilo',     icon: '👤' },
]

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

  const extra = [
    ...(moduli?.tasks    !== false ? [{ label: 'Task',     href: '/dipendente/task',     icon: '✅' }] : []),
    ...(moduli?.cedolini           ? [{ label: 'Cedolini', href: '/dipendente/cedolini', icon: '💰' }] : []),
  ]
  // Inserisci extra dopo Richieste (prima di Profilo)
  const allItems = BASE_ITEMS.flatMap(item =>
    item.href === '/dipendente/profilo' && extra.length > 0 ? [...extra, item] : [item]
  )

  const items = allItems.map(it => {
    if (it.href === '/dipendente/richieste' && mounted) {
      const badge = pathname === '/dipendente/richieste' ? 0 : count
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="I Miei Turni" ruolo="dipendente" tenantName={tenantName} branding={branding} />
}
