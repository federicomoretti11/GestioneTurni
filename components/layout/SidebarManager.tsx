'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'

const BASE_ITEMS = [
  { label: 'Calendario',                  href: '/manager/calendario',                      icon: '📅' },
  { label: 'Per posto',                   href: '/manager/calendario-posti',                icon: '📍' },
  { label: 'Programmazione',              href: '/manager/calendario-programmazione',       icon: '📝' },
  { label: 'Programmazione per posto',    href: '/manager/calendario-programmazione-posti', icon: '📝' },
  { label: 'Richieste',                   href: '/manager/richieste',                       icon: '📋' },
  { label: 'Turni',                       href: '/manager/template',                        icon: '🏷️' },
  { label: 'Export',                      href: '/manager/export',                          icon: '📤' },
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
  return <Sidebar items={items} title="GestioneTurni" ruolo="manager" />
}
