import { Profile, TurnoConDettagli } from '@/lib/types'
import { CellaCalendario } from './CellaCalendario'
import { formatDayLabel, toDateString } from '@/lib/utils/date'
import { calcolaOreTurno } from '@/lib/utils/turni'

const oggi = toDateString(new Date())

interface GrigliaProps {
  giorni: Date[]
  dipendenti: Profile[]
  turni: TurnoConDettagli[]
  onAddTurno: (dipendenteId: string, data: string) => void
  onEditTurno: (turno: TurnoConDettagli) => void
  readonly?: boolean
}

function oreLabel(ore: number) {
  if (ore === 0) return ''
  return `${ore % 1 === 0 ? ore : ore.toFixed(1)}h`
}

export function GrigliaCalendario({ giorni, dipendenti, turni, onAddTurno, onEditTurno, readonly }: GrigliaProps) {
  function getTurniCella(dipendenteId: string, data: string) {
    return turni.filter(t => t.dipendente_id === dipendenteId && t.data === data)
  }

  function oreCella(dipendenteId: string, data: string) {
    return getTurniCella(dipendenteId, data)
      .reduce((sum, t) => sum + calcolaOreTurno(t.ora_inizio, t.ora_fine), 0)
  }

  function oreRiga(dipendenteId: string) {
    return giorni.reduce((sum, g) => sum + oreCella(dipendenteId, toDateString(g)), 0)
  }

  function oreColonna(data: string) {
    return dipendenti.reduce((sum, d) => sum + oreCella(d.id, data), 0)
  }

  const oreTotale = dipendenti.reduce((sum, d) => sum + oreRiga(d.id), 0)

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm w-full" style={{ minWidth: 720 }}>
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 min-w-[140px]">
              Dipendente
            </th>
            {giorni.map(g => {
              const isOggi = toDateString(g) === oggi
              return (
                <th key={g.toISOString()} className={`border border-gray-200 px-2 py-2 text-center font-medium min-w-[80px] ${isOggi ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
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
          {dipendenti.map(d => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                {d.nome} {d.cognome}
              </td>
              {giorni.map(g => {
                const data = toDateString(g)
                return (
                  <CellaCalendario
                    key={data}
                    turni={getTurniCella(d.id, data)}
                    onAdd={() => onAddTurno(d.id, data)}
                    onEdit={onEditTurno}
                    readonly={readonly}
                    isOggi={data === oggi}
                    isPassato={data < oggi}
                  />
                )
              })}
              <td className="border border-gray-200 bg-blue-50 px-3 py-2 text-center font-semibold text-blue-700 whitespace-nowrap">
                {oreLabel(oreRiga(d.id))}
              </td>
            </tr>
          ))}
        </tbody>
        {dipendenti.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50">
              <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-600">Totale giorno</td>
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
        )}
      </table>
    </div>
  )
}
