import { calcolaOreTurno, statoTimbratura } from '@/lib/utils/turni'
import { PallinoTimbratura } from './PallinoTimbratura'

interface BadgeProps {
  label: string
  oraInizio: string
  oraFine: string
  colore: string
  posto: string
  onClick?: () => void
  oraIngressoEffettiva?: string | null
  oraUscitaEffettiva?: string | null
}

export function BadgeTurno({
  label, oraInizio, oraFine, colore, posto, onClick,
  oraIngressoEffettiva, oraUscitaEffettiva,
}: BadgeProps) {
  const ore = calcolaOreTurno(oraInizio, oraFine)
  const isRiposo = ore === 0
  const stato = isRiposo ? 'non_iniziato' : statoTimbratura({
    ora_ingresso_effettiva: oraIngressoEffettiva ?? null,
    ora_uscita_effettiva: oraUscitaEffettiva ?? null,
  })
  return (
    <div
      onClick={onClick}
      className={`relative rounded px-1.5 py-0.5 text-xs cursor-pointer hover:opacity-80 transition-opacity select-none border ${isRiposo ? 'border-dashed text-gray-500 bg-gray-100 border-gray-300' : 'text-white border-transparent'}`}
      style={isRiposo ? undefined : { backgroundColor: colore }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className={`font-medium truncate ${isRiposo ? 'text-gray-400' : ''}`}>{label}</span>
        {ore > 0 && <span className="opacity-90 flex-shrink-0">{ore % 1 === 0 ? ore : ore.toFixed(1)}h</span>}
      </div>
      {oraInizio !== oraFine && (
        <div className="opacity-90">{oraInizio.slice(0,5)}–{oraFine.slice(0,5)}</div>
      )}
      {posto && <div className="opacity-90 truncate">{posto}</div>}
      <PallinoTimbratura
        stato={stato}
        oraIngresso={oraIngressoEffettiva}
        oraUscita={oraUscitaEffettiva}
        size="sm"
        className="absolute -top-0.5 -right-0.5"
      />
    </div>
  )
}
