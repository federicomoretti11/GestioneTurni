'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SuperAdminChatCount() {
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
      .channel('chat-count-home')
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

  if (count === 0) return null
  return (
    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
      {count}
    </span>
  )
}
