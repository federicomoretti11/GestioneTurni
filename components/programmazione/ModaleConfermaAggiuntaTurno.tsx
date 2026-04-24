'use client'
import { formatDateIT } from '@/lib/utils/date'

interface Props {
  open: boolean
  data: string
  dipendenteNome: string
  turniEsistenti: { dipendente: string; orario: string }[]
  onConferma: () => void
  onAnnulla: () => void
}

export function ModaleConfermaAggiuntaTurno({ open, data, dipendenteNome, turniEsistenti, onConferma, onAnnulla }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Turni già presenti</h2>
        <p className="text-sm text-gray-700 mt-3">
          Il <strong>{formatDateIT(data)}</strong> hanno già un turno assegnato:
        </p>
        <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {turniEsistenti.map((t, i) => (
            <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="font-medium">{t.dipendente}</span>
              {t.orario && <span className="text-gray-500">{t.orario}</span>}
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-700 mt-4">
          Vuoi aggiungere un turno anche per <strong>{dipendenteNome}</strong>?
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onAnnulla}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            onClick={onConferma}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold"
          >
            Aggiungi comunque
          </button>
        </div>
      </div>
    </div>
  )
}
