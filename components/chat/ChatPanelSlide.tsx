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
  titolo: string | null
  stato: string
  updated_at: string
}

type Vista = 'lista' | 'chat' | 'nuova'

interface Props {
  userId: string
  aperto: boolean
  onClose: () => void
}

export function ChatPanelSlide({ userId, aperto, onClose }: Props) {
  const [conversazioni, setConversazioni] = useState<Conversazione[]>([])
  const [selezionata, setSelezionata] = useState<Conversazione | null>(null)
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [vista, setVista] = useState<Vista>('lista')
  const [testo, setTesto] = useState('')
  const [nuovoTitolo, setNuovoTitolo] = useState('')
  const [caricamento, setCaricamento] = useState(true)
  const [invio, setInvio] = useState(false)
  const [creazione, setCreazione] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const titoloInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aperto) return
    caricaConversazioni()
  }, [aperto])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  useEffect(() => {
    if (vista === 'nuova') titoloInputRef.current?.focus()
  }, [vista])

  useEffect(() => {
    if (!selezionata?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-conv-${selezionata.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi', filter: `conversazione_id=eq.${selezionata.id}` },
        payload => {
          setMessaggi(prev => [...prev, payload.new as Messaggio])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selezionata?.id])

  async function caricaConversazioni() {
    setCaricamento(true)
    const r = await fetch('/api/chat/conversazione')
    if (r.ok) setConversazioni(await r.json())
    setCaricamento(false)
  }

  async function apriConversazione(conv: Conversazione) {
    setSelezionata(conv)
    setMessaggi([])
    setVista('chat')
    const r = await fetch(`/api/chat/messaggi?conversazione_id=${conv.id}`)
    if (r.ok) setMessaggi(await r.json())
  }

  async function handleCrea() {
    if (!nuovoTitolo.trim() || creazione) return
    setCreazione(true)
    const r = await fetch('/api/chat/conversazione', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titolo: nuovoTitolo.trim() }),
    })
    if (r.ok) {
      const nuova: Conversazione = await r.json()
      setConversazioni(prev => [nuova, ...prev])
      setNuovoTitolo('')
      apriConversazione(nuova)
    }
    setCreazione(false)
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
      const aggiornata = { ...selezionata, stato: 'archiviata' }
      setSelezionata(aggiornata)
      setConversazioni(prev => prev.map(c => c.id === selezionata.id ? aggiornata : c))
    }
  }

  function tornaSuLista() {
    setVista('lista')
    setSelezionata(null)
    setMessaggi([])
    caricaConversazioni()
  }

  const aperte = conversazioni.filter(c => c.stato === 'aperta')
  const archiviate = conversazioni.filter(c => c.stato === 'archiviata')

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-50 w-80 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ${aperto ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {(vista === 'chat' || vista === 'nuova') && (
            <button onClick={tornaSuLista} className="text-slate-400 hover:text-white flex-shrink-0" aria-label="Torna alla lista">
              ←
            </button>
          )}
          <span className="text-sm font-semibold truncate">
            {vista === 'chat' && selezionata
              ? (selezionata.titolo ?? 'Segnalazione')
              : vista === 'nuova'
              ? 'Nuova segnalazione'
              : '💬 Supporto OperoHub'}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none flex-shrink-0 ml-2">×</button>
      </div>

      {/* ── Vista: Lista segnalazioni ── */}
      {vista === 'lista' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex-shrink-0">
            <button
              onClick={() => setVista('nuova')}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              + Nuova segnalazione
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {caricamento && (
              <p className="text-xs text-slate-400 text-center mt-6">Caricamento…</p>
            )}

            {!caricamento && conversazioni.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-500">Nessuna segnalazione ancora.</p>
                <p className="text-xs text-slate-400 mt-1">Crea una nuova segnalazione per contattare il supporto.</p>
              </div>
            )}

            {aperte.length > 0 && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Aperte</span>
                </div>
                {aperte.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => apriConversazione(conv)}
                    className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{conv.titolo ?? 'Segnalazione'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(conv.updated_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className="text-slate-300 text-sm flex-shrink-0">›</span>
                  </button>
                ))}
              </>
            )}

            {archiviate.length > 0 && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Archiviate</span>
                </div>
                {archiviate.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => apriConversazione(conv)}
                    className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-3 opacity-60"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-600 truncate">{conv.titolo ?? 'Segnalazione'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(conv.updated_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className="text-slate-300 text-sm flex-shrink-0">›</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Vista: Nuova segnalazione ── */}
      {vista === 'nuova' && (
        <div className="flex-1 flex flex-col p-4">
          <p className="text-sm text-slate-600 mb-4">
            Descrivi brevemente l&apos;argomento. Potrai aggiungere i dettagli nella chat.
          </p>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Titolo
          </label>
          <input
            ref={titoloInputRef}
            type="text"
            value={nuovoTitolo}
            onChange={e => setNuovoTitolo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCrea()}
            placeholder="Es. Problema con i turni di maggio"
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
            maxLength={80}
          />
          <p className="text-[11px] text-slate-400 mt-1 text-right">{nuovoTitolo.length}/80</p>
          <button
            onClick={handleCrea}
            disabled={!nuovoTitolo.trim() || creazione}
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {creazione ? 'Creazione…' : 'Crea segnalazione'}
          </button>
          <button
            onClick={() => setVista('lista')}
            className="mt-2 w-full text-slate-500 hover:text-slate-700 text-sm py-2"
          >
            Annulla
          </button>
        </div>
      )}

      {/* ── Vista: Chat ── */}
      {vista === 'chat' && selezionata && (
        <>
          {selezionata.stato === 'archiviata' && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex-shrink-0">
              <p className="text-xs text-amber-700">Segnalazione archiviata — non puoi inviare nuovi messaggi.</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {messaggi.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-4">
                Nessun messaggio ancora. Scrivi per iniziare.
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

          {selezionata.stato === 'aperta' && (
            <>
              <div className="border-t border-slate-100 p-2 flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={testo}
                  onChange={e => setTesto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleInvia()}
                  placeholder="Scrivi un messaggio…"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={handleInvia}
                  disabled={invio || !testo.trim()}
                  className="w-9 h-9 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg flex items-center justify-center flex-shrink-0"
                  aria-label="Invia"
                >
                  →
                </button>
              </div>
              <div className="px-3 pb-2 flex-shrink-0">
                <button
                  onClick={handleArchivia}
                  className="text-xs text-slate-400 hover:text-slate-600 underline w-full text-right"
                >
                  🗄 Archivia segnalazione
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
