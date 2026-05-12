'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from '@/components/chat/ChatMessage'

interface Utente {
  id: string
  nome: string
  cognome: string
  ruolo: string
  tenant: { nome: string } | null
}

interface ConvListItem {
  id: string
  titolo: string | null
  stato: string
  updated_at: string
  messaggi_non_letti: number
  utente: Utente
}

interface Messaggio {
  id: string
  conversazione_id: string
  mittente_id: string
  testo: string
  letto_superadmin: boolean
  created_at: string
}

export default function SuperAdminChatPage() {
  const [conversazioni, setConversazioni] = useState<ConvListItem[]>([])
  const [selezionata, setSelezionata] = useState<ConvListItem | null>(null)
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [invio, setInvio] = useState(false)
  const [mioId, setMioId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setMioId(user?.id ?? null))
    caricaConversazioni()
    audioRef.current = new Audio('/sounds/chat-notification.mp3')
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('chat-superadmin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi' },
        payload => {
          const msg = payload.new as Messaggio
          if (selezionata && msg.conversazione_id === selezionata.id) {
            setMessaggi(prev => [...prev, msg])
          }
          if (!msg.letto_superadmin) {
            audioRef.current?.play().catch(() => {})
            caricaConversazioni()
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selezionata?.id])

  async function caricaConversazioni() {
    const r = await fetch('/api/super-admin/chat/conversazioni')
    if (r.ok) setConversazioni(await r.json())
  }

  async function selezionaConversazione(conv: ConvListItem) {
    setSelezionata(conv)
    setMessaggi([])
    const r = await fetch(`/api/chat/messaggi?conversazione_id=${conv.id}`)
    if (r.ok) setMessaggi(await r.json())
    if (conv.messaggi_non_letti > 0) {
      await fetch('/api/super-admin/chat/messaggi/letti', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversazione_id: conv.id }),
      })
      setConversazioni(prev => prev.map(c =>
        c.id === conv.id ? { ...c, messaggi_non_letti: 0 } : c
      ))
    }
  }

  async function handleInvia() {
    if (!selezionata || !testo.trim() || invio) return
    setInvio(true)
    const r = await fetch('/api/chat/messaggi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversazione_id: selezionata.id, testo: testo.trim() }),
    })
    if (r.ok) setTesto('')
    setInvio(false)
  }

  async function handleArchivia() {
    if (!selezionata) return
    const r = await fetch(`/api/chat/conversazione/${selezionata.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'archiviata' }),
    })
    if (r.ok) {
      setSelezionata(prev => prev ? { ...prev, stato: 'archiviata' } : null)
      caricaConversazioni()
    }
  }

  const aperte = conversazioni.filter(c => c.stato === 'aperta')
  const archiviate = conversazioni.filter(c => c.stato === 'archiviata')
  const totaleNonLetti = conversazioni.reduce((s, c) => s + c.messaggi_non_letti, 0)

  return (
    <div className="flex h-[calc(100vh-120px)] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Lista conversazioni */}
      <div className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="bg-slate-900 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Chat Supporto</h2>
          {totaleNonLetti > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{totaleNonLetti} non {totaleNonLetti === 1 ? 'letto' : 'letti'}</p>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {aperte.map(conv => (
            <button
              key={conv.id}
              onClick={() => selezionaConversazione(conv)}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors ${selezionata?.id === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm text-slate-800 ${conv.messaggi_non_letti > 0 ? 'font-bold' : 'font-semibold'} truncate`}>
                  {conv.titolo ?? '—'}
                </span>
                {conv.messaggi_non_letti > 0 && (
                  <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 ml-1 flex-shrink-0">
                    {conv.messaggi_non_letti}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{conv.utente.nome} {conv.utente.cognome}</p>
              <p className="text-xs text-blue-600 font-medium">{conv.utente.tenant?.nome ?? ''} · {conv.utente.ruolo}</p>
            </button>
          ))}

          {archiviate.length > 0 && (
            <>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Archiviate</span>
              </div>
              {archiviate.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selezionaConversazione(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 opacity-60 hover:opacity-80 transition-opacity ${selezionata?.id === conv.id ? 'bg-blue-50' : ''}`}
                >
                  <p className="text-sm text-slate-600 truncate">{conv.titolo ?? '—'}</p>
                  <p className="text-xs text-slate-400">{conv.utente.nome} {conv.utente.cognome} · {conv.utente.tenant?.nome ?? ''}</p>
                </button>
              ))}
            </>
          )}

          {conversazioni.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-8 px-4">Nessuna conversazione ancora.</p>
          )}
        </div>
      </div>

      {/* Area chat */}
      {selezionata ? (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{selezionata.titolo ?? 'Segnalazione'}</h3>
              <p className="text-xs text-slate-500">{selezionata.utente.nome} {selezionata.utente.cognome} · <span className="text-blue-600">{selezionata.utente.tenant?.nome ?? ''}</span> · {selezionata.utente.ruolo}</p>
            </div>
            {selezionata.stato === 'aperta' && (
              <button onClick={handleArchivia} className="text-slate-400 hover:text-slate-600 text-sm" title="Archivia">
                🗄
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messaggi.map(m => (
              <ChatMessage
                key={m.id}
                testo={m.testo}
                mittente={m.mittente_id === mioId ? 'io' : 'altro'}
                timestamp={m.created_at}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {selezionata.stato === 'aperta' && (
            <div className="border-t border-slate-100 p-3 flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={testo}
                onChange={e => setTesto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleInvia()}
                placeholder="Rispondi…"
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={handleInvia}
                disabled={invio || !testo.trim()}
                className="w-9 h-9 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg flex items-center justify-center flex-shrink-0"
              >
                →
              </button>
            </div>
          )}
          {selezionata.stato === 'archiviata' && (
            <p className="text-xs text-slate-400 text-center py-3 border-t border-slate-100">Conversazione archiviata</p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-400">Seleziona una conversazione</p>
        </div>
      )}
    </div>
  )
}
