'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useBozzaCount } from './BozzaCounter'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'

const BASE_ITEMS = [
  { label: 'Dashboard',        href: '/admin/dashboard',                         icon: '📊' },
  { section: 'Calendario',     label: 'Per dipendente', href: '/admin/calendario',                        icon: '📅' },
  {                             label: 'Per posto',      href: '/admin/calendario-posti',                  icon: '📍' },
  { section: 'Programmazione', label: 'Per dipendente', href: '/admin/calendario-programmazione',         icon: '📝' },
  {                             label: 'Per posto',      href: '/admin/calendario-programmazione-posti',   icon: '🗂️' },
  { section: 'Gestione',       label: 'Richieste',      href: '/admin/richieste',                         icon: '📋' },
  {                             label: 'Export',         href: '/admin/export',                            icon: '📤' },
  {                             label: 'Impostazioni',   href: '/admin/impostazioni',                      icon: '⚙️' },
]

export function SidebarAdmin() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const bozza = useBozzaCount()
  const richieste = useRichiesteCount()
  const pathname = usePathname()

  const items = BASE_ITEMS.map(it => {
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
