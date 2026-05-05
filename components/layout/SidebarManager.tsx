'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'

const BASE_ITEMS = [
  { label: 'Home',             href: '/home',                                                              icon: '🏠' },
  { section: 'Calendario',     label: 'Per dipendente', href: '/manager/calendario',                       icon: '📅' },
  {                             label: 'Per posto',       href: '/manager/calendario-posti',                icon: '📍' },
  { section: 'Programmazione', label: 'Per dipendente', href: '/manager/calendario-programmazione',       icon: '📝' },
  {                             label: 'Per posto',       href: '/manager/calendario-programmazione-posti', icon: '🗂️' },
  { section: 'Gestione',       label: 'Richieste',       href: '/manager/richieste',                       icon: '📋' },
  {                             label: 'Modelli turno',   href: '/manager/template',                        icon: '🏷️' },
  {                             label: 'Export',          href: '/manager/export',                          icon: '📤' },
]

export function SidebarManager() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const richieste = useRichiesteCount()
  const pathname = usePathname()

  const items = BASE_ITEMS.map(it => {
    if (it.href === '/manager/richieste' && mounted) {
      const badge = pathname === '/manager/richieste' ? 0 : richieste
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="Opero Hub" ruolo="manager" />
}
