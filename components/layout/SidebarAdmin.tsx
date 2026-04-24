'use client'
import { Sidebar } from './Sidebar'
import { useBozzaCount } from './BozzaCounter'

const BASE_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { label: 'Calendario', href: '/admin/calendario', icon: '📅' },
  { label: 'Per posto', href: '/admin/calendario-posti', icon: '📍' },
  { label: 'Programmazione', href: '/admin/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per posto', href: '/admin/calendario-programmazione-posti', icon: '📝' },
  { label: 'Template', href: '/admin/template', icon: '🏷️' },
  { label: 'Export', href: '/admin/export', icon: '📤' },
  { label: 'Utenti', href: '/admin/utenti', icon: '👥' },
  { label: 'Posti', href: '/admin/posti', icon: '📍' },
  { label: 'Festivi', href: '/admin/festivi', icon: '🎉' },
]

export function SidebarAdmin() {
  const bozza = useBozzaCount()
  const items = BASE_ITEMS.map(it => it.href === '/admin/calendario-programmazione'
    ? { ...it, badge: bozza }
    : it)
  return <Sidebar items={items} title="GestioneTurni" ruolo="admin" />
}
