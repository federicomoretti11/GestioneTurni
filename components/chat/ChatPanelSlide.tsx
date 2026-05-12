'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from './ChatMessage'

interface Messaggio {
  id: string
  conversazione_id: string
  mittente_id: string
  testo: string
  letto_superadmin: boolean
  created_at: string
}

interface Conversazione {
  id: string
  stato: string
}

export function ChatPanelSlide({ userId }: { userId: string }) {
  const [aperto, setAperto] = useState(false)
  const [conv, setConv] = useState<Conversazione | null>(null)
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [caricamento, setCaricamento] = useState(true)
  const [invio, setInvio] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/chat/conversazione')
      .then(r => r.json())
      .then(data => {
        setConv(data)
        setCaricamento(false)
        if (data?.id) caricaMessaggi(data.id)
      })
      .catch(() => setCaricamento(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  useEffect(() => {
    if (!conv?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-conv-${conv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi', filter: `conversazione_id=eq.${conv.id}` },
        payload => {
          setMessaggi(prev => [...prev, payload.new as Messaggio])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conv?.id])

  async function caricaMessaggi(convId: string) {
    const r = await fetch(`/api/chat/messaggi?conversazione_id=${convId}`)
    if (r.ok) setMessaggi(await r.json())
  }

  async function handleInvia() {
    if (!testo.trim() || invio) return
    setInvio(true)

    let convId = conv?.id
    if (!convId) {
      const r = await fetch('/api/chat/conversazione', { method: 'POST' })
      if (!r.ok) { setInvio(false); return }
      const nuovaConv = await r.json()
      setConv(nuovaConv)
      convId = nuovaConv.id
      if (convId) caricaMessaggi(convId)
    }

    const r = await fetch('/api/chat/messaggi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversazione_id: convId, testo: testo.trim() }),
    })
    if (r.ok) setTesto('')
    setInvio(false)
  }

  async function handleArchivia() {
    if (!conv?.id) return
    const r = await fetch(`/api/chat/conversazione/${conv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'archiviata' }),
    })
    if (r.ok) setConv(prev => prev ? { ...prev, stato: 'archiviata' } : null)
  }

  return (
    <>
      <button
        onClick={() => setAperto(v => !v)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-blue-500 text-white text-xs px-1.5 py-3 rounded-l-lg shadow-lg"
        style={{ writingMode: 'vertical-rl' } as React.CSSProperties}
        aria-label="Apri chat di supporto"
      >
        💬 Aiuto
      </button>

      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ${aperto ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold">💬 Supporto OperoHub</span>
          <button onClick={() => setAperto(false)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {caricamento && (
            <p className="text-xs text-slate-400 text-center mt-4">Caricamento…</p>
          )}
          {!caricamento && messaggi.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-4">
              Scrivi per iniziare la conversazione con il supporto.
            </p>
          )}
          {messaggi.map(m => (
            <ChatMessage
              key={m.id}
              testo={m.testo}
              mittente={m.mittente_id === userId ? 'io' : 'altro'}
              timestamp={m.created_at}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-100 p-2 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={testo}
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleInvia()}
            placeholder="Scrivi un messaggio…"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
            disabled={conv?.stato === 'archiviata'}
          />
          <button
            onClick={handleInvia}
            disabled={invio || !testo.trim() || conv?.stato === 'archiviata'}
            className="w-9 h-9 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg flex items-center justify-center flex-shrink-0"
            aria-label="Invia"
          >
            →
          </button>
        </div>

        {conv?.stato === 'aperta' && (
          <div className="px-3 pb-2 flex-shrink-0">
            <button
              onClick={handleArchivia}
              className="text-xs text-slate-400 hover:text-slate-600 underline w-full text-right"
            >
              🗄 Archivia conversazione
            </button>
          </div>
        )}
        {conv?.stato === 'archiviata' && (
          <p className="text-xs text-slate-400 text-center pb-2">Conversazione archiviata</p>
        )}
      </div>
    </>
  )
}
