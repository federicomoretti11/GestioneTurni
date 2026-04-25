'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { useBozzaCount } from './BozzaCounter'

const BASE_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { label: 'Calendario', href: '/admin/calendario', icon: '📅' },
  { label: 'Per posto', href: '/admin/calendario-posti', icon: '📍' },
  { label: 'Programmazione', href: '/admin/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per posto', href: '/admin/calendario-programmazione-posti', icon: '📝' },
  { label: 'Turni', href: '/admin/template', icon: '🏷️' },
  { label: 'Export', href: '/admin/export', icon: '📤' },
  { label: 'Utenti', href: '/admin/utenti', icon: '👥' },
  { label: 'Posti', href: '/admin/posti', icon: '📍' },
  { label: 'Festivi', href: '/admin/festivi', icon: '🎉' },
]

export function SidebarAdmin() {
  // Il badge viene valorizzato solo dopo mount per evitare mismatch di hydration
  // (useBozzaCount fa fetch+realtime, il primo render lato server non può ancora averli).
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const bozza = useBozzaCount()

  const items = BASE_ITEMS.map(it => it.href === '/admin/calendario-programmazione' && mounted
    ? { ...it, badge: bozza }
    : it)
  return <Sidebar items={items} title="GestioneTurni" ruolo="admin" />
}
