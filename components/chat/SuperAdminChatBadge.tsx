'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SuperAdminChatBadge() {
  const pathname = usePathname()
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function carica() {
      const r = await fetch('/api/super-admin/chat/conversazioni')
      if (!r.ok) return
      const data = await r.json()
      const tot = data.reduce((s: number, c: { messaggi_non_letti: number }) => s + c.messaggi_non_letti, 0)
      setCount(tot)
    }
    carica()

    const supabase = createClient()
    const channel = supabase
      .channel('chat-badge-superadmin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi' },
        () => carica()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (pathname === '/super-admin/chat') return null

  return (
    <a href="/super-admin/chat" className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors">
      💬 Chat
      {count > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
          {count}
        </span>
      )}
    </a>
  )
}
