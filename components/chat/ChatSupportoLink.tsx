'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function ChatSupportoLink({ userId }: { userId: string }) {
  const [nonLetti, setNonLetti] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`supporto-link-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi' },
        payload => {
          const msg = payload.new as { mittente_id: string }
          if (msg.mittente_id !== userId) setNonLetti(prev => prev + 1)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])

  return (
    <Link
      href="/supporto"
      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors relative"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      Hai bisogno di aiuto?
      {nonLetti > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
          {nonLetti > 9 ? '9+' : nonLetti}
        </span>
      )}
    </Link>
  )
}
