'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useBozzaCount } from './BozzaCounter'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'
import { createClient } from '@/lib/supabase/client'

const BASE_ITEMS = [
  { label: 'Home',             href: '/home',                                    icon: '🏠' },
  { section: 'Calendario',     label: 'Calendario',     href: '/admin/calendario',               icon: '📅', altHrefs: ['/admin/calendario-posti'] },
  { section: 'Programmazione', label: 'Programmazione', href: '/admin/calendario-programmazione', icon: '📝', altHrefs: ['/admin/calendario-programmazione-posti'] },
  { section: 'Gestione',       label: 'Richieste',      href: '/admin/richieste',                icon: '📋' },
  {                             label: 'Impostazioni',   href: '/admin/impostazioni',             icon: '⚙️' },
  { section: 'Account',        label: 'Profilo',        href: '/admin/profilo',                  icon: '👤' },
]

interface Moduli {
  tasks?: boolean
  documenti?: boolean
  cedolini?: boolean
  analytics?: boolean
  paghe?: boolean
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

  // Voci Gestione condizionali — default true per tasks e documenti
  const gestioneExtra = [
    ...(moduli?.tasks      !== false ? [{ label: 'Task',      href: '/admin/task',      icon: '✅' }] : []),
    ...(moduli?.documenti  !== false ? [{ label: 'Documenti', href: '/admin/documenti', icon: '🗄️' }] : []),
    ...(moduli?.cedolini             ? [{ label: 'Cedolini',  href: '/admin/cedolini',  icon: '💰' }] : []),
    ...(moduli?.analytics            ? [{ label: 'Analytics', href: '/admin/analytics', icon: '📊' }] : []),
    ...(moduli?.paghe                ? [{ label: 'Paghe',     href: '/admin/paghe',     icon: '🧾' }] : []),
  ]

  // Inserisci voci extra nella sezione Gestione (prima di Impostazioni)
  const baseWithExtra = BASE_ITEMS.flatMap(item =>
    item.href === '/admin/impostazioni' && gestioneExtra.length > 0
      ? [...gestioneExtra, item]
      : [item]
  )

  const items = [
    ...baseWithExtra,
    ...(isSuperAdmin ? SUPER_ADMIN_ITEMS : []),
  ].map(it => {
    if (it.href === '/admin/calendario-programmazione' && mounted) {
      const badge = (pathname === '/admin/calendario-programmazione' || pathname === '/admin/calendario-programmazione-posti') ? 0 : bozza
      return { ...it, badge }
    }
    if (it.href === '/admin/richieste' && mounted) {
      const badge = pathname === '/admin/richieste' ? 0 : richieste
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="Opero Hub" ruolo="admin" tenantName={tenantName} branding={branding} />
}
