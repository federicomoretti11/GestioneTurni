'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useBozzaCount } from './BozzaCounter'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'
import { createClient } from '@/lib/supabase/client'

interface Moduli {
  tasks?: boolean
  documenti?: boolean
  cedolini?: boolean
  analytics?: boolean
  whiteLabelAbilitato?: boolean
}

interface Branding { logoUrl?: string; nomeApp?: string; colorePrimario?: string }

export function SidebarManager({ moduli }: { moduli?: Moduli }) {
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

  const bozza = useBozzaCount()
  const richieste = useRichiesteCount()
  const pathname = usePathname()

  const opItems = [
    ...(moduli?.tasks !== false ? [{ label: 'Task', href: '/manager/task', icon: '✅' }] : []),
  ].map(item => ({ ...item, section: 'Operatività' }))

  const contItems = [
    ...(moduli?.cedolini ? [{ label: 'Cedolini', href: '/manager/cedolini', icon: '💰' }] : []),
  ].map(item => ({ ...item, section: 'Contabilità' }))

  const items = [
    { label: 'Home', href: '/home', icon: '🏠' },

    { section: 'Calendario', label: 'Calendario',     href: '/manager/calendario',               icon: '📅', altHrefs: ['/manager/calendario-posti'] },
    { section: 'Calendario', label: 'Programmazione', href: '/manager/calendario-programmazione', icon: '📝', altHrefs: ['/manager/calendario-programmazione-posti'],
      badge: mounted && pathname !== '/manager/calendario-programmazione' && pathname !== '/manager/calendario-programmazione-posti' ? bozza : 0 },

    ...opItems,

    ...contItems,

    { section: 'Gestione', label: 'Richieste',     href: '/manager/richieste',    icon: '📋',
      badge: mounted && pathname !== '/manager/richieste' ? richieste : 0 },
    ...(moduli?.analytics           ? [{ section: 'Gestione', label: 'Analytics', href: '/manager/analytics', icon: '📊' }] : []),
    ...(moduli?.documenti !== false  ? [{ section: 'Gestione', label: 'Documenti', href: '/manager/documenti', icon: '🗄️' }] : []),
    { section: 'Gestione', label: 'Utenti',        href: '/manager/utenti',       icon: '👥' },
    { section: 'Gestione', label: 'Posti',         href: '/manager/posti',        icon: '📍' },
    { section: 'Gestione', label: 'Modelli turno', href: '/manager/template',     icon: '🏷️' },

    { section: 'Impostazioni', label: 'Profilo',      href: '/manager/profilo',      icon: '👤' },
    { section: 'Impostazioni', label: 'Impostazioni', href: '/manager/impostazioni', icon: '⚙️' },
  ]

  return <Sidebar items={items} title="Opero Hub" ruolo="manager" tenantName={tenantName} branding={branding} />
}
