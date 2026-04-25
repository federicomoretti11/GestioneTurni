import { TurnoConDettagli } from '@/lib/types'
import { formatDayLabel, toDateString } from '@/lib/utils/date'
import { calcolaOreTurno, statoTimbratura } from '@/lib/utils/turni'
import { PallinoTimbratura } from '@/components/ui/PallinoTimbratura'
import { EmptyState } from '@/components/ui/EmptyState'

const oggi = toDateString(new Date())

interface GrigliaCalendarioPostiProps {
  giorni: Date[]
  turni: TurnoConDettagli[]
  onAddTurno?: (postoId: string, data: string) => void
  onEditTurno?: (turno: TurnoConDettagli) => void
}

function oreLabel(ore: number) {
  if (ore === 0) return ''
  return `${ore % 1 === 0 ? ore : ore.toFixed(1)}h`
}

export function GrigliaCalendarioPosti({ giorni, turni, onAddTurno, onEditTurno }: GrigliaCalendarioPostiProps) {
  const posti = Array.from(new Map(
    turni
      .filter(t => t.posto)
      .map(t => [t.posto_id, t.posto!])
  ).values()).sort((a, b) => a.nome.localeCompare(b.nome))

  function getTurniCella(postoId: string, data: string) {
    return turni.filter(t => t.posto_id === postoId && t.data === data)
  }

  function orePosto(postoId: string) {
    return turni
      .filter(t => t.posto_id === postoId)
      .reduce((sum, t) => sum + calcolaOreTurno(t.ora_inizio, t.ora_fine), 0)
  }

  function oreColonna(data: string) {
    return turni
      .filter(t => t.data === data)
      .reduce((sum, t) => sum + calcolaOreTurno(t.ora_inizio, t.ora_fine), 0)
  }

  const oreTotale = turni.reduce((sum, t) => sum + calcolaOreTurno(t.ora_inizio, t.ora_fine), 0)

  if (posti.length === 0) {
    return <EmptyState icon="📍" title="Nessun turno nel periodo" description="Cambia l'intervallo o crea dei turni per vedere i dati." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm w-full" style={{ minWidth: 720 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 min-w-[160px]">
              Posto di servizio
            </th>
            {giorni.map(g => {
              const isOggi = toDateString(g) === oggi
              return (
                <th key={g.toISOString()} className={`border border-gray-200 px-2 py-2 text-center font-medium min-w-[100px] ${isOggi ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                  {formatDayLabel(g)}
                  {isOggi && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-0.5" />}
                </th>
              )
            })}
            <th className="border border-gray-200 bg-blue-50 px-3 py-2 text-center font-medium text-blue-700 min-w-[70px]">
              Totale
            </th>
          </tr>
        </thead>
        <tbody>
          {posti.map(posto => (
            <tr key={posto.id} className="group hover:bg-gray-50">
              <td className="sticky left-0 z-10 border border-gray-200 bg-white group-hover:bg-gray-50 px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                {posto.nome}
              </td>
              {giorni.map(g => {
                const data = toDateString(g)
                const turniCella = getTurniCella(posto.id, data)
                return (
                  <td key={data} className={`border border-gray-200 p-1 align-top min-w-[100px] relative group/cella ${data === oggi ? 'bg-blue-50/40' : ''}`}>
                    <div className="space-y-0.5">
                      {turniCella.map(t => {
                        const ore = calcolaOreTurno(t.ora_inizio, t.ora_fine)
                        const isRiposo = ore === 0
                        const stato = isRiposo ? 'non_iniziato' : statoTimbratura({
                          ora_ingresso_effettiva: t.ora_ingresso_effettiva,
                          ora_uscita_effettiva: t.ora_uscita_effettiva,
                        })
                        return (
                          <div
                            key={t.id}
                            onClick={() => onEditTurno?.(t)}
                            className={`relative rounded px-1.5 py-0.5 text-white text-xs ${onEditTurno ? 'cursor-pointer hover:opacity-80' : ''}`}
                            style={{ backgroundColor: t.template?.colore ?? '#6b7280' }}
                          >
                            <div className="font-medium truncate">
                              {t.profile.cognome} {t.profile.nome}
                            </div>
                            {t.ora_inizio !== t.ora_fine && (
                              <div className="opacity-90">{t.ora_inizio.slice(0,5)}–{t.ora_fine.slice(0,5)}</div>
                            )}
                            <PallinoTimbratura
                              stato={stato}
                              oraIngresso={t.ora_ingresso_effettiva}
                              oraUscita={t.ora_uscita_effettiva}
                              size="sm"
                              className="absolute -top-0.5 -right-0.5"
                            />
                          </div>
                        )
                      })}
                      {turniCella.length === 0 && onAddTurno && (
                        <button
                          onClick={() => onAddTurno(posto.id, data)}
                          className="absolute inset-0 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 text-xl font-light transition-colors w-full"
                        >
                          +
                        </button>
                      )}
                      {turniCella.length === 0 && !onAddTurno && (
                        <span className="text-gray-200 text-lg flex items-center justify-center h-8">—</span>
                      )}
                    </div>
                  </td>
                )
              })}
              <td className="border border-gray-200 bg-blue-50 px-3 py-2 text-center font-semibold text-blue-700 whitespace-nowrap">
                {oreLabel(orePosto(posto.id))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td className="sticky left-0 z-10 border border-gray-200 bg-gray-50 px-3 py-2 font-semibold text-gray-600">Totale giorno</td>
            {giorni.map(g => {
              const data = toDateString(g)
              const ore = oreColonna(data)
              return (
                <td key={data} className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-600">
                  {oreLabel(ore)}
                </td>
              )
            })}
            <td className="border border-gray-200 bg-blue-100 px-3 py-2 text-center font-bold text-blue-800">
              {oreLabel(oreTotale)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
