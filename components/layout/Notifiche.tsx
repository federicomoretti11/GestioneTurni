'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Notifica, RuoloUtente } from '@/lib/types'
import { formatDateIT } from '@/lib/utils/date'

interface Props {
  userId: string
  ruolo: RuoloUtente
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ora'
  if (min < 60) return `${min} min fa`
  const ore = Math.floor(min / 60)
  if (ore < 24) return `${ore} h fa`
  const giorni = Math.floor(ore / 24)
  if (giorni < 7) return `${giorni} g fa`
  return formatDateIT(iso.slice(0, 10))
}

const iconaPerTipo: Record<Notifica['tipo'], string> = {
  turno_assegnato: '📅',
  turno_modificato: '✏️',
  turno_eliminato: '🗑️',
  settimana_pianificata: '🗓️',
  check_in: '🟢',
  check_out: '🔴',
}

export function Notifiche({ userId, ruolo }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [aperto, setAperto] = useState(false)
  const [notifiche, setNotifiche] = useState<Notifica[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const nonLette = notifiche.filter(n => !n.letta).length

  const carica = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifiche?limit=20')
      if (res.ok) setNotifiche(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carica() }, [carica])

  useEffect(() => {
    const canale = supabase
      .channel(`notifiche_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifiche', filter: `destinatario_id=eq.${userId}` },
        payload => {
          setNotifiche(prev => [payload.new as Notifica, ...prev].slice(0, 20))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(canale) }
  }, [supabase, userId])

  useEffect(() => {
    if (!aperto) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAperto(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [aperto])

  async function handleClickNotifica(n: Notifica) {
    if (!n.letta) {
      setNotifiche(prev => prev.map(x => x.id === n.id ? { ...x, letta: true } : x))
      fetch(`/api/notifiche/${n.id}`, { method: 'PATCH' }).catch(() => {})
    }
    setAperto(false)
    const base = ruolo === 'dipendente' ? '/dipendente/turni' : `/${ruolo}/calendario`
    const destinazione = n.data_turno ? `${base}?data=${n.data_turno}` : base
    router.push(destinazione)
  }

  async function handleSegnaTutte() {
    setNotifiche(prev => prev.map(n => ({ ...n, letta: true })))
    fetch('/api/notifiche/segna-tutte-lette', { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAperto(v => !v)}
        aria-label="Notifiche"
        className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {nonLette > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {nonLette > 9 ? '9+' : nonLette}
          </span>
        )}
      </button>

      {aperto && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-900">Notifiche</span>
            {nonLette > 0 && (
              <button onClick={handleSegnaTutte} className="text-xs text-blue-600 hover:underline">
                Segna tutte come lette
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && notifiche.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Caricamento…</div>
            ) : notifiche.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Nessuna notifica</div>
            ) : (
              notifiche.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotifica(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 flex gap-3 ${
                    !n.letta ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <span className="text-lg leading-none pt-0.5">{iconaPerTipo[n.tipo]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${!n.letta ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.titolo}
                      </span>
                      {!n.letta && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5 truncate">{n.messaggio}</div>
                    <div className="text-[11px] text-gray-400 mt-1">{tempoRelativo(n.created_at)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
