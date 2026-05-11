'use client'
import { useRef, useEffect } from 'react'
import { Profile, TurnoConDettagli } from '@/lib/types'
import { CellaCalendario } from './CellaCalendario'
import { BloccoAssenza, TipoAssenza } from './BloccoAssenza'
import { formatDayLabel, toDateString } from '@/lib/utils/date'
import { calcolaOreTurno } from '@/lib/utils/turni'

const oggi = toDateString(new Date())

export interface AssenzaCalendario {
  id: string
  dipendente_id: string
  tipo: TipoAssenza
  data_inizio: string
  data_fine: string
}

interface GrigliaProps {
  giorni: Date[]
  dipendenti: Profile[]
  turni: TurnoConDettagli[]
  onAddTurno: (dipendenteId: string, data: string) => void
  onEditTurno: (turno: TurnoConDettagli) => void
  readonly?: boolean
  onTurnoClick?: (turno: TurnoConDettagli) => void
  compact?: boolean
  assenze?: AssenzaCalendario[]
  onAssenzaClick?: (assenza: AssenzaCalendario) => void
}

function oreLabel(ore: number) {
  if (ore === 0) return ''
  return `${ore % 1 === 0 ? ore : ore.toFixed(1)}h`
}

export function GrigliaCalendario({ giorni, dipendenti, turni, onAddTurno, onEditTurno, readonly, onTurnoClick, compact, assenze, onAssenzaClick }: GrigliaProps) {
  const todayRef = useRef<HTMLTableCellElement>(null)
  useEffect(() => {
    todayRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [giorni])

  function getTurniCella(dipendenteId: string, data: string) {
    return turni.filter(t => t.dipendente_id === dipendenteId && t.data === data)
  }

  function getAssenzaCella(dipendenteId: string, data: string): AssenzaCalendario | null {
    return (assenze ?? []).find(
      a => a.dipendente_id === dipendenteId && a.data_inizio <= data && a.data_fine >= data
    ) ?? null
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
      <table className="border-collapse text-sm w-full" style={{ minWidth: 640 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border border-slate-200/60 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600 min-w-[130px]">
              Dipendente
            </th>
            {giorni.map(g => {
              const isOggi = toDateString(g) === oggi
              return (
                <th ref={isOggi ? todayRef : undefined} key={g.toISOString()} className={`border border-slate-200/60 px-1 py-2 text-center font-medium min-w-[72px] text-xs ${isOggi ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'}`}>
                  {formatDayLabel(g)}
                  {isOggi && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-0.5" />}
                </th>
              )
            })}
            <th className="border border-slate-200/60 bg-blue-50 px-3 py-2 text-center font-medium text-blue-700 min-w-[60px]">
              Tot.
            </th>
          </tr>
        </thead>
        <tbody>
          {dipendenti.map(d => (
            <tr key={d.id} className="group hover:bg-slate-50/50">
              <td className="sticky left-0 z-10 border border-slate-200/60 bg-white group-hover:bg-slate-50/50 px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap text-sm">
                {d.cognome} {d.nome}
              </td>
              {giorni.map(g => {
                const data = toDateString(g)
                const assenza = getAssenzaCella(d.id, data)
                if (assenza) {
                  return (
                    <td key={data} className="border border-slate-200/60 px-1 py-1">
                      <BloccoAssenza
                        tipo={assenza.tipo}
                        onClick={() => onAssenzaClick?.(assenza)}
                        compact={compact}
                      />
                    </td>
                  )
                }
                return (
                  <CellaCalendario
                    key={data}
                    turni={getTurniCella(d.id, data)}
                    onAdd={() => onAddTurno(d.id, data)}
                    onEdit={onEditTurno}
                    readonly={readonly}
                    onReadonlyClick={onTurnoClick}
                    isOggi={data === oggi}
                    isPassato={data < oggi}
                    compact={compact}
                  />
                )
              })}
              <td className="border border-slate-200/60 bg-blue-50 px-2 py-1.5 text-center font-semibold text-blue-700 whitespace-nowrap text-xs">
                {oreLabel(oreRiga(d.id))}
              </td>
            </tr>
          ))}
        </tbody>
        {dipendenti.length > 0 && (
          <tfoot>
            <tr className="bg-slate-50">
              <td className="sticky left-0 z-10 border border-slate-200/60 bg-slate-50 px-3 py-1.5 font-semibold text-slate-500 text-xs">Totale</td>
              {giorni.map(g => {
                const data = toDateString(g)
                const ore = oreColonna(data)
                return (
                  <td key={data} className="border border-slate-200/60 px-1 py-1.5 text-center font-semibold text-slate-500 text-xs">
                    {oreLabel(ore)}
                  </td>
                )
              })}
              <td className="border border-slate-200/60 bg-blue-100 px-2 py-1.5 text-center font-bold text-blue-800 text-xs">
                {oreLabel(oreTotale)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
