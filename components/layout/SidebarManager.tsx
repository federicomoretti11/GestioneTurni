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
}

const BASE_ITEMS = [
  { label: 'Home',             href: '/home',                                                              icon: '🏠' },
  { section: 'Calendario',     label: 'Calendario',     href: '/manager/calendario',               icon: '📅', altHrefs: ['/manager/calendario-posti'] },
  { section: 'Programmazione', label: 'Programmazione', href: '/manager/calendario-programmazione', icon: '📝', altHrefs: ['/manager/calendario-programmazione-posti'] },
  { section: 'Gestione',       label: 'Richieste',      href: '/manager/richieste',                 icon: '📋' },
  // Task e Documenti inseriti dinamicamente qui
  {                             label: 'Utenti',         href: '/manager/utenti',                    icon: '👥' },
  {                             label: 'Posti',          href: '/manager/posti',                     icon: '📍' },
  {                             label: 'Modelli turno',  href: '/manager/template',                  icon: '🏷️' },
  {                             label: 'Impostazioni',   href: '/manager/impostazioni',              icon: '⚙️' },
  { section: 'Account',         label: 'Profilo',        href: '/manager/profilo',                   icon: '👤' },
]

export function SidebarManager({ moduli }: { moduli?: Moduli }) {
  const [mounted, setMounted] = useState(false)
  const [tenantName, setTenantName] = useState<string>('')
  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('tenants(nome)').eq('id', user.id).single()
        .then(({ data }) => {
          const t = data?.tenants as { nome?: string } | null
          if (t?.nome) setTenantName(t.nome)
        })
    })
  }, [])
  const bozza = useBozzaCount()
  const richieste = useRichiesteCount()
  const pathname = usePathname()

  const gestioneExtra = [
    ...(moduli?.tasks     !== false ? [{ label: 'Task',      href: '/manager/task',      icon: '✅' }] : []),
    ...(moduli?.documenti !== false ? [{ label: 'Documenti', href: '/manager/documenti', icon: '🗄️' }] : []),
    ...(moduli?.cedolini            ? [{ label: 'Cedolini',  href: '/manager/cedolini',  icon: '💰' }] : []),
    ...(moduli?.analytics           ? [{ label: 'Analytics', href: '/manager/analytics', icon: '📊' }] : []),
  ]

  // Inserisci extra dopo Richieste (prima di Utenti)
  const baseWithExtra = BASE_ITEMS.flatMap(item =>
    item.href === '/manager/utenti' && gestioneExtra.length > 0
      ? [...gestioneExtra, item]
      : [item]
  )

  const items = baseWithExtra.map(it => {
    if (it.href === '/manager/calendario-programmazione' && mounted) {
      const badge = (pathname === '/manager/calendario-programmazione' || pathname === '/manager/calendario-programmazione-posti') ? 0 : bozza
      return { ...it, badge }
    }
    if (it.href === '/manager/richieste' && mounted) {
      const badge = pathname === '/manager/richieste' ? 0 : richieste
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="Opero Hub" ruolo="manager" tenantName={tenantName} />
}
