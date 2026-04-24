'use client'
import { Sidebar } from './Sidebar'

const ITEMS = [
  { label: 'Calendario', href: '/manager/calendario', icon: '📅' },
  { label: 'Per posto', href: '/manager/calendario-posti', icon: '📍' },
  { label: 'Programmazione', href: '/manager/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per posto', href: '/manager/calendario-programmazione-posti', icon: '📝' },
  { label: 'Template', href: '/manager/template', icon: '🏷️' },
  { label: 'Export', href: '/manager/export', icon: '📤' },
]

export function SidebarManager() {
  return <Sidebar items={ITEMS} title="GestioneTurni" ruolo="manager" />
}
