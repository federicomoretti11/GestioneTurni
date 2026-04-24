'use client'
import { useState } from 'react'
import { formatDateIT } from '@/lib/utils/date'

interface Props {
  open: boolean
  destinazione: { inizio: string; fine: string }
  onConferma: (origineInizio: string, origineFine: string) => void
  onAnnulla: () => void
  loading: boolean
}

export function ModaleCopiaDaPeriodo({ open, destinazione, onConferma, onAnnulla, loading }: Props) {
  // Default: periodo origine = stesso range traslato all'indietro.
  const durata = (new Date(destinazione.fine).getTime() - new Date(destinazione.inizio).getTime()) / 86400000
  const defaultInizio = new Date(destinazione.inizio)
  defaultInizio.setDate(defaultInizio.getDate() - (durata + 1))
  const defaultFine = new Date(defaultInizio)
  defaultFine.setDate(defaultFine.getDate() + durata)

  const toStr = (d: Date) => d.toISOString().slice(0, 10)
  const [inizio, setInizio] = useState(toStr(defaultInizio))
  const [fine, setFine] = useState(toStr(defaultFine))

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Copia da periodo ufficiale</h2>
        <p className="text-sm text-gray-700 mt-3">
          Copia i turni ufficiali selezionati nella bozza del periodo{' '}
          <strong>{formatDateIT(destinazione.inizio)} → {formatDateIT(destinazione.fine)}</strong>.
          Le date verranno shiftate automaticamente.
        </p>
        <div className="mt-4 space-y-2">
          <label className="text-xs text-gray-600 flex items-center gap-2">
            Origine da
            <input type="date" value={inizio} onChange={e => setInizio(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="text-xs text-gray-600 flex items-center gap-2">
            Origine a
            <input type="date" value={fine} onChange={e => setFine(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm" />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onAnnulla} disabled={loading} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
            Annulla
          </button>
          <button onClick={() => onConferma(inizio, fine)} disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50">
            {loading ? 'Copia in corso…' : 'Copia'}
          </button>
        </div>
      </div>
    </div>
  )
}
