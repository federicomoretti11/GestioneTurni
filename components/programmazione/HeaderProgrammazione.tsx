'use client'
import { useState } from 'react'
import { presetPeriodo, type PresetPeriodo, type Periodo } from '@/lib/utils/periodi'
import { formatDateIT } from '@/lib/utils/date'

interface Props {
  periodo: Periodo
  onPeriodoChange: (p: Periodo) => void
  onConferma: () => void
  onCopiaDaPeriodo: () => void
  onSvuotaBozza: () => void
  readOnly?: boolean
  bozzeNelPeriodo: number
}

const PRESETS: { id: PresetPeriodo; label: string }[] = [
  { id: 'settimana-corrente', label: 'Questa settimana' },
  { id: 'settimana-prossima', label: 'Prossima settimana' },
  { id: 'mese-corrente', label: 'Mese corrente' },
  { id: 'mese-prossimo', label: 'Prossimo mese' },
]

export function HeaderProgrammazione({
  periodo, onPeriodoChange, onConferma, onCopiaDaPeriodo, onSvuotaBozza, readOnly, bozzeNelPeriodo
}: Props) {
  const [custom, setCustom] = useState(false)

  function applicaPreset(id: PresetPeriodo) {
    onPeriodoChange(presetPeriodo(id))
    setCustom(false)
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-900">
        📝 <strong>Modalità bozza</strong> — i turni non sono visibili ai dipendenti finché non li confermi.
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => applicaPreset(p.id)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setCustom(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${custom ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            Personalizzato
          </button>
        </div>

        {custom && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-gray-600 flex items-center gap-2">
              Da
              <input
                type="date"
                value={periodo.inizio}
                onChange={e => onPeriodoChange({ ...periodo, inizio: e.target.value })}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-gray-600 flex items-center gap-2">
              a
              <input
                type="date"
                value={periodo.fine}
                onChange={e => onPeriodoChange({ ...periodo, fine: e.target.value })}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              />
            </label>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            Periodo: <strong>{formatDateIT(periodo.inizio)} → {formatDateIT(periodo.fine)}</strong>
            {' · '}
            <span className="text-gray-500">{bozzeNelPeriodo} turni bozza</span>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <button onClick={onCopiaDaPeriodo} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                Copia da ufficiale
              </button>
              <button
                onClick={onSvuotaBozza}
                disabled={bozzeNelPeriodo === 0}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Svuota bozza
              </button>
              <button
                onClick={onConferma}
                disabled={bozzeNelPeriodo === 0}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
              >
                Conferma periodo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
