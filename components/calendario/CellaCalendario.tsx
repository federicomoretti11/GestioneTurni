import { TurnoConDettagli } from '@/lib/types'
import { BadgeTurno } from '@/components/ui/Badge'

interface CellaProps {
  turni: TurnoConDettagli[]
  onAdd: () => void
  onEdit: (turno: TurnoConDettagli) => void
  readonly?: boolean
  onReadonlyClick?: (turno: TurnoConDettagli) => void
  isOggi?: boolean
  isPassato?: boolean
  compact?: boolean
}

export function CellaCalendario({ turni, onAdd, onEdit, readonly = false, onReadonlyClick, isOggi = false, isPassato = false, compact }: CellaProps) {
  const sfondo = isOggi ? 'bg-blue-50/40' : (isPassato && turni.length === 0 ? 'bg-slate-50' : '')
  return (
    <td className={`border border-slate-200 p-1 align-top min-w-[72px] min-h-[48px] group relative ${sfondo}`}>
      <div className="space-y-0.5">
        {turni.map(t => (
          <BadgeTurno
            key={t.id}
            label={t.template?.nome ?? 'Custom'}
            oraInizio={t.ora_inizio}
            oraFine={t.ora_fine}
            colore={t.template?.colore ?? '#6b7280'}
            posto={t.posto?.nome ?? ''}
            onClick={readonly ? (onReadonlyClick ? () => onReadonlyClick(t) : undefined) : () => onEdit(t)}
            oraIngressoEffettiva={t.ora_ingresso_effettiva}
            oraUscitaEffettiva={t.ora_uscita_effettiva}
            statoBozza={t.stato === 'bozza'}
            compact={compact}
          />
        ))}
      </div>
      {!readonly && turni.length === 0 && (
        <button
          onClick={onAdd}
          className="absolute inset-0 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 text-xl font-light transition-colors"
        >
          +
        </button>
      )}
      {turni.length === 0 && <div className="min-h-[36px]" />}
    </td>
  )
}
