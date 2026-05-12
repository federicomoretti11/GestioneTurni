'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatPanelSlide } from './ChatPanelSlide'

export function ChatWidget({ userId }: { userId: string }) {
  const [aperto, setAperto] = useState(false)
  const [nonLetti, setNonLetti] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-widget-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi' },
        payload => {
          const msg = payload.new as { mittente_id: string }
          if (msg.mittente_id !== userId) {
            setNonLetti(prev => prev + 1)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  function handleApri() {
    setAperto(true)
    setNonLetti(0)
  }

  return (
    <>
      <button
        onClick={handleApri}
        aria-label="Apri chat di supporto"
        className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {nonLetti > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {nonLetti > 9 ? '9+' : nonLetti}
          </span>
        )}
      </button>
      <ChatPanelSlide userId={userId} aperto={aperto} onClose={() => setAperto(false)} />
    </>
  )
}
