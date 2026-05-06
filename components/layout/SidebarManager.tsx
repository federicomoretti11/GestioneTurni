'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useBozzaCount } from './BozzaCounter'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'

const BASE_ITEMS = [
  { label: 'Home',             href: '/home',                                                              icon: '🏠' },
  { section: 'Calendario',     label: 'Calendario',     href: '/manager/calendario',               icon: '📅', altHrefs: ['/manager/calendario-posti'] },
  { section: 'Programmazione', label: 'Programmazione', href: '/manager/calendario-programmazione', icon: '📝', altHrefs: ['/manager/calendario-programmazione-posti'] },
  { section: 'Gestione',       label: 'Richieste',      href: '/manager/richieste',                 icon: '📋' },
  {                             label: 'Task',           href: '/manager/task',                      icon: '✅' },
  {                             label: 'Utenti',         href: '/manager/utenti',                    icon: '👥' },
  {                             label: 'Posti',          href: '/manager/posti',                     icon: '📍' },
  {                             label: 'Documenti',      href: '/manager/documenti',                 icon: '🗄️' },
  {                             label: 'Modelli turno',  href: '/manager/template',                  icon: '🏷️' },
  {                             label: 'Impostazioni',   href: '/manager/impostazioni',              icon: '⚙️' },
]

export function SidebarManager() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const bozza = useBozzaCount()
  const richieste = useRichiesteCount()
  const pathname = usePathname()

  const items = BASE_ITEMS.map(it => {
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
  return <Sidebar items={items} title="Opero Hub" ruolo="manager" logoSrc="/logo-white.svg" />
}
