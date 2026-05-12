'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function SuperAdminChatBadgeHeader() {
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
    const ch = supabase
      .channel('chat-badge-header-superadmin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messaggi' },
        payload => {
          const msg = payload.new as { letto_superadmin: boolean }
          if (!msg.letto_superadmin) setCount(prev => prev + 1)
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messaggi' },
        () => carica()
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  return (
    <Link
      href="/super-admin/chat"
      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      Chat di supporto
      {count > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
