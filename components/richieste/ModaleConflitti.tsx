'use client'
import { useState } from 'react'
import { formatDateIT } from '@/lib/utils/date'

interface Conflitto {
  data: string
  turno_id: string
  ora_inizio: string
  ora_fine: string
}

interface Props {
  nomeDipendente: string
  conflitti: Conflitto[]
  onConferma: (sovrascrivi: boolean) => void
  onAnnulla: () => void
}

export function ModaleConflitti({ nomeDipendente, conflitti, onConferma, onAnnulla }: Props) {
  const [scelta, setScelta] = useState<'sovrascrivi' | 'mantieni'>('mantieni')
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-2" />
        <div className="flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <div>
            <h2 className="font-semibold text-slate-900">Conflitti calendario</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {nomeDipendente} ha già turni assegnati nei giorni:
            </p>
          </div>
        </div>

        <ul className="bg-amber-50 rounded-lg p-3 space-y-1">
          {conflitti.map(c => (
            <li key={c.turno_id} className="text-sm text-amber-900">
              • {formatDateIT(c.data)} — {c.ora_inizio.slice(0,5)}–{c.ora_fine.slice(0,5)}
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="radio" name="scelta" value="sovrascrivi"
              checked={scelta === 'sovrascrivi'} onChange={() => setScelta('sovrascrivi')}
              className="mt-0.5" />
            <span className="text-sm">Sovrascrivi i turni esistenti</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="radio" name="scelta" value="mantieni"
              checked={scelta === 'mantieni'} onChange={() => setScelta('mantieni')}
              className="mt-0.5" />
            <span className="text-sm">Approva e crea solo nei giorni liberi — i conflitti li risolvo a mano</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={onAnnulla}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg">
            Annulla
          </button>
          <button onClick={() => onConferma(scelta === 'sovrascrivi')}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700">
            Conferma
          </button>
        </div>
      </div>
    </div>
  )
}
