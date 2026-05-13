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
  paghe?: boolean
  staffing?: boolean
  whiteLabelAbilitato?: boolean
}

interface Branding { logoUrl?: string; nomeApp?: string; colorePrimario?: string }

const SUPER_ADMIN_ITEMS = [
  { section: 'Super Admin', label: 'Tenant', href: '/super-admin/tenants', icon: '🏢' },
]

export function SidebarAdmin({ moduli }: { moduli?: Moduli }) {
  const [mounted, setMounted] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [tenantName, setTenantName] = useState<string>('')
  const [branding, setBranding] = useState<Branding | undefined>(undefined)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('is_super_admin, tenants(nome, nome_app, colore_primario, logo_url)').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.is_super_admin) setIsSuperAdmin(true)
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
    ...(moduli?.tasks !== false ? [{ label: 'Task', href: '/admin/task', icon: '✅' }] : []),
  ].map(item => ({ ...item, section: 'Operatività' }))

  const contItems = [
    ...(moduli?.cedolini ? [{ label: 'Cedolini', href: '/admin/cedolini', icon: '💰' }] : []),
    ...(moduli?.paghe    ? [{ label: 'Paghe',     href: '/admin/paghe',     icon: '🧾' }] : []),
  ].map(item => ({ ...item, section: 'Contabilità' }))

  const items = [
    { label: 'Home', href: '/home', icon: '🏠' },

    { section: 'Calendario', label: 'Calendario',     href: '/admin/calendario',               icon: '📅', altHrefs: ['/admin/calendario-posti'] },
    { section: 'Calendario', label: 'Programmazione', href: '/admin/calendario-programmazione', icon: '📝', altHrefs: ['/admin/calendario-programmazione-posti'],
      badge: mounted && pathname !== '/admin/calendario-programmazione' && pathname !== '/admin/calendario-programmazione-posti' ? bozza : 0 },

    ...opItems,

    ...contItems,

    { section: 'Gestione', label: 'Richieste',  href: '/admin/richieste',  icon: '📋',
      badge: mounted && pathname !== '/admin/richieste' ? richieste : 0 },
    ...(moduli?.analytics           ? [{ section: 'Gestione', label: 'Analytics', href: '/admin/analytics', icon: '📊' }] : []),
    ...(moduli?.staffing            ? [{ section: 'Gestione', label: 'Staffing',  href: '/admin/staffing',  icon: '👥' }] : []),
    ...(moduli?.documenti !== false  ? [{ section: 'Gestione', label: 'Documenti', href: '/admin/documenti', icon: '🗄️' }] : []),

    { section: 'Impostazioni', label: 'Profilo',       href: '/admin/profilo',       icon: '👤' },
    { section: 'Impostazioni', label: 'Impostazioni',  href: '/admin/impostazioni',  icon: '⚙️' },

    ...(isSuperAdmin ? SUPER_ADMIN_ITEMS : []),
  ]

  return <Sidebar items={items} title="Opero Hub" ruolo="admin" tenantName={tenantName} branding={branding} />
}
