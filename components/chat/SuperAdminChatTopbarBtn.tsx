'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function SuperAdminChatTopbarBtn() {
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
      .channel('chat-topbar-home')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi' },
        payload => {
          const msg = payload.new as { letto_superadmin: boolean }
          if (!msg.letto_superadmin) setCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messaggi' },
        () => carica()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <Link
      href="/super-admin/chat"
      aria-label="Chat supporto"
      className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
