'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useBozzaCount } from './BozzaCounter'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'
import { createClient } from '@/lib/supabase/client'

const BASE_ITEMS = [
  { label: 'Home',             href: '/home',                                    icon: '🏠' },
  { label: 'Dashboard',        href: '/admin/dashboard',                         icon: '📊' },
  { section: 'Calendario',     label: 'Per dipendente', href: '/admin/calendario',                        icon: '📅' },
  {                             label: 'Per posto',      href: '/admin/calendario-posti',                  icon: '📍' },
  { section: 'Programmazione', label: 'Per dipendente', href: '/admin/calendario-programmazione',         icon: '📝' },
  {                             label: 'Per posto',      href: '/admin/calendario-programmazione-posti',   icon: '🗂️' },
  { section: 'Gestione',       label: 'Richieste',      href: '/admin/richieste',                         icon: '📋' },
  {                             label: 'Export',         href: '/admin/export',                            icon: '📤' },
  {                             label: 'Documenti',      href: '/admin/documenti',                         icon: '🗄️' },
  {                             label: 'Impostazioni',   href: '/admin/impostazioni',                      icon: '⚙️' },
]

const SUPER_ADMIN_ITEMS = [
  { section: 'Super Admin', label: 'Tenant', href: '/super-admin/tenants', icon: '🏢' },
]

export function SidebarAdmin() {
  const [mounted, setMounted] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
        .then(({ data }) => { if (data?.is_super_admin) setIsSuperAdmin(true) })
    })
  }, [])
  const bozza = useBozzaCount()
  const richieste = useRichiesteCount()
  const pathname = usePathname()

  const items = [
    ...BASE_ITEMS,
    ...(isSuperAdmin ? SUPER_ADMIN_ITEMS : []),
  ].map(it => {
    if (it.href === '/admin/calendario-programmazione' && mounted) {
      const badge = pathname === '/admin/calendario-programmazione' ? 0 : bozza
      return { ...it, badge }
    }
    if (it.href === '/admin/richieste' && mounted) {
      const badge = pathname === '/admin/richieste' ? 0 : richieste
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="GestioneTurni" ruolo="admin" />
}
