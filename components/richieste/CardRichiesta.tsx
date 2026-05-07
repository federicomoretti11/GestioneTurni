'use client'
import type { Richiesta } from '@/lib/types'
import { formatDateIT } from '@/lib/utils/date'

const STATO_CONFIG = {
  pending:            { label: 'In attesa',                       color: 'bg-amber-100 text-amber-800' },
  approvata_manager:  { label: 'Approvata — in attesa convalida', color: 'bg-blue-100 text-blue-800'   },
  approvata:          { label: 'Approvata',                       color: 'bg-green-100 text-green-800' },
  comunicata:         { label: 'Ricevuta',                        color: 'bg-green-100 text-green-800' },
  rifiutata:          { label: 'Rifiutata',                       color: 'bg-red-100 text-red-800'     },
  annullata:          { label: 'Annullata',                       color: 'bg-slate-100 text-slate-500' },
}

const TIPO_LABEL = {
  ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', cambio_turno: 'Cambio turno', sblocco_checkin: 'Sblocco check-in',
}

function dateRange(r: Richiesta): string {
  if (r.data_fine) return `${formatDateIT(r.data_inizio)} – ${formatDateIT(r.data_fine)}`
  return formatDateIT(r.data_inizio)
}

interface Props {
  richiesta: Richiesta
  onCancella?: (id: string) => void
  actions?: React.ReactNode
}

export function CardRichiesta({ richiesta, onCancella, actions }: Props) {
  const cfg = STATO_CONFIG[richiesta.stato]
  return (
    <div className="bg-white rounded-xl border border-slate-900/20 p-4 flex flex-col gap-2" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-sm text-slate-900">{TIPO_LABEL[richiesta.tipo]}</span>
          <span className="ml-2 text-xs text-slate-500">{dateRange(richiesta)}</span>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {richiesta.note_dipendente && (
        <p className="text-xs text-slate-600 italic">&quot;{richiesta.note_dipendente}&quot;</p>
      )}

      {richiesta.stato === 'rifiutata' && richiesta.motivazione_decisione && (
        <p className="text-xs text-red-700 bg-red-50 rounded p-2">
          Motivazione: {richiesta.motivazione_decisione}
        </p>
      )}

      {richiesta.turno && (
        <p className="text-xs text-slate-500">
          Turno: {formatDateIT(richiesta.turno.data)} · {richiesta.turno.ora_inizio?.slice(0,5)}–{richiesta.turno.ora_fine?.slice(0,5)}
        </p>
      )}

      <div className="flex items-center justify-between mt-1">
        {actions ?? null}
        {onCancella && (richiesta.stato === 'pending' || richiesta.stato === 'comunicata') && (
          <button
            onClick={() => onCancella(richiesta.id)}
            className="text-xs text-red-600 hover:underline ml-auto"
          >
            Annulla richiesta
          </button>
        )}
      </div>
    </div>
  )
}
