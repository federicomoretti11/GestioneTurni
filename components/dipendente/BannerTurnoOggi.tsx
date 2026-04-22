'use client'
import { useState } from 'react'
import { TurnoConDettagli } from '@/lib/types'
import { formatTimeShort } from '@/lib/utils/date'

interface Props {
  turno: TurnoConDettagli | null
  onRefresh: () => void
}

function oraDaISO(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function salutoOggi(): string {
  const today = new Date()
  return today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function BannerTurnoOggi({ turno, onRefresh }: Props) {
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function chiama(endpoint: 'check-in' | 'check-out') {
    if (!turno) return
    setLoading(true)
    setErrore('')
    const res = await fetch(`/api/turni/${turno.id}/${endpoint}`, { method: 'POST' })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setErrore(d.error ?? 'Errore durante la timbratura')
      return
    }
    onRefresh()
  }

  if (!turno) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-5">
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Oggi · {salutoOggi()}</p>
        <p className="mt-2 text-sm text-slate-600">Nessun turno in programma oggi.</p>
      </div>
    )
  }

  const haIngresso = !!turno.ora_ingresso_effettiva
  const haUscita = !!turno.ora_uscita_effettiva
  const statoTerminato = haIngresso && haUscita

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5">
      <p className="text-xs uppercase tracking-wider font-semibold text-indigo-600">Oggi · {salutoOggi()}</p>

      <div className="mt-2 flex items-baseline gap-3 flex-wrap">
        <p className="text-lg font-bold text-slate-900">
          {formatTimeShort(turno.ora_inizio)} – {formatTimeShort(turno.ora_fine)}
        </p>
        {turno.posto && (
          <p className="text-sm text-slate-600">· {turno.posto.nome}</p>
        )}
      </div>

      {(haIngresso || haUscita) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {haIngresso && (
            <span className="text-slate-700">
              <span className="text-slate-400">Iniziato alle </span>
              <span className="font-semibold">{oraDaISO(turno.ora_ingresso_effettiva!)}</span>
            </span>
          )}
          {haUscita && (
            <span className="text-slate-700">
              <span className="text-slate-400">Terminato alle </span>
              <span className="font-semibold">{oraDaISO(turno.ora_uscita_effettiva!)}</span>
            </span>
          )}
        </div>
      )}

      {errore && <p className="mt-3 text-sm text-red-600">{errore}</p>}

      <div className="mt-4">
        {!haIngresso && (
          <button
            onClick={() => chiama('check-in')}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-sm active:scale-95 transition"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            {loading ? 'Avvio…' : 'Inizia turno'}
          </button>
        )}
        {haIngresso && !haUscita && (
          <button
            onClick={() => chiama('check-out')}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-sm active:scale-95 transition"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            {loading ? 'Chiusura…' : 'Termina turno'}
          </button>
        )}
        {statoTerminato && (
          <span className="inline-flex items-center gap-2 bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-full">
            ✓ Turno completato
          </span>
        )}
      </div>
    </div>
  )
}
