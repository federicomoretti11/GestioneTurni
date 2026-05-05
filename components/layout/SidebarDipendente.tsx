'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'

const BASE_ITEMS = [
  { label: 'Home',         href: '/home',                icon: '🏠' },
  { label: 'I miei turni', href: '/dipendente/turni', icon: '📅' },
  { label: 'Richieste',    href: '/dipendente/richieste', icon: '📋' },
  { label: 'Profilo',      href: '/dipendente/profilo', icon: '👤' },
]

export function SidebarDipendente() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const count = useRichiesteCount()
  const pathname = usePathname()

  const items = BASE_ITEMS.map(it => {
    if (it.href === '/dipendente/richieste' && mounted) {
      const badge = pathname === '/dipendente/richieste' ? 0 : count
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="I Miei Turni" ruolo="dipendente" />
}
