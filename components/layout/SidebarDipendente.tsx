'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'
import { createClient } from '@/lib/supabase/client'

const BASE_ITEMS = [
  { label: 'Home',         href: '/home',                icon: '🏠' },
  { label: 'I miei turni', href: '/dipendente/turni', icon: '📅' },
  { label: 'Richieste',    href: '/dipendente/richieste', icon: '📋' },
  { label: 'Task',         href: '/dipendente/task',      icon: '✅' },
  { label: 'Profilo',      href: '/dipendente/profilo',   icon: '👤' },
]

export function SidebarDipendente() {
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
  const count = useRichiesteCount()
  const pathname = usePathname()

  const items = BASE_ITEMS.map(it => {
    if (it.href === '/dipendente/richieste' && mounted) {
      const badge = pathname === '/dipendente/richieste' ? 0 : count
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="I Miei Turni" ruolo="dipendente" tenantName={tenantName} />
}
