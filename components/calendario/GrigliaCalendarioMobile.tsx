'use client'
import { useState, useMemo, useEffect } from 'react'
import { Profile, TurnoConDettagli } from '@/lib/types'
import { toDateString } from '@/lib/utils/date'
import { calcolaOreTurno, statoTimbratura } from '@/lib/utils/turni'
import { PallinoTimbratura } from '@/components/ui/PallinoTimbratura'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'

interface GrigliaMobileProps {
  giorni: Date[]
  dipendenti: Profile[]
  turni: TurnoConDettagli[]
  onAddTurno: (dipendenteId: string, data: string) => void
  onEditTurno: (turno: TurnoConDettagli) => void
  onDataSelezionataChange?: (data: string) => void
  readonly?: boolean
}

function giornoBreve(d: Date) {
  return d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '').slice(0, 3)
}

function giornoLungo(d: Date) {
  return d.toLocaleDateString('it-IT', { weekday: 'long' })
}

function oreLabel(ore: number) {
  if (ore === 0) return ''
  return `${ore % 1 === 0 ? ore : ore.toFixed(1)}h`
}

export function GrigliaCalendarioMobile({ giorni, dipendenti, turni, onAddTurno, onEditTurno, onDataSelezionataChange, readonly }: GrigliaMobileProps) {
  const oggi = toDateString(new Date())
  const indiceOggiNeiGiorni = giorni.findIndex(g => toDateString(g) === oggi)
  const [dataSelezionata, setDataSelezionata] = useState<string>(() =>
    toDateString(giorni[indiceOggiNeiGiorni >= 0 ? indiceOggiNeiGiorni : 0])
  )

  useEffect(() => {
    if (!giorni.some(g => toDateString(g) === dataSelezionata)) {
      const idx = giorni.findIndex(g => toDateString(g) === oggi)
      setDataSelezionata(toDateString(giorni[idx >= 0 ? idx : 0]))
    }
  }, [giorni, dataSelezionata, oggi])

  useEffect(() => {
    onDataSelezionataChange?.(dataSelezionata)
  }, [dataSelezionata, onDataSelezionataChange])

  const giornoSelezionato = useMemo(
    () => giorni.find(g => toDateString(g) === dataSelezionata) ?? giorni[0],
    [giorni, dataSelezionata]
  )

  const turniDelGiorno = useMemo(
    () => turni.filter(t => t.data === dataSelezionata),
    [turni, dataSelezionata]
  )

  const turniPerDipendente = useMemo(() => {
    const m = new Map<string, TurnoConDettagli[]>()
    for (const t of turniDelGiorno) {
      if (!m.has(t.dipendente_id)) m.set(t.dipendente_id, [])
      m.get(t.dipendente_id)!.push(t)
    }
    return m
  }, [turniDelGiorno])

  const oreGiorno = turniDelGiorno.reduce(
    (sum, t) => sum + calcolaOreTurno(t.ora_inizio, t.ora_fine),
    0
  )

  const isOggi = dataSelezionata === oggi

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
        {giorni.map(g => {
          const dataStr = toDateString(g)
          const isSel = dataStr === dataSelezionata
          const isToday = dataStr === oggi
          const hasTurni = turni.some(t => t.data === dataStr)
          return (
            <button
              key={dataStr}
              onClick={() => setDataSelezionata(dataStr)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-2 px-2.5 rounded-lg min-w-[52px] transition-colors ${
                isSel ? 'bg-blue-600' : isToday ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <span className={`text-[10px] font-medium uppercase ${isSel ? 'text-blue-100' : isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                {giornoBreve(g)}
              </span>
              <span className={`text-base font-bold leading-none ${isSel ? 'text-white' : isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                {g.getDate()}
              </span>
              <span className={`w-1 h-1 rounded-full ${isSel ? 'bg-white/60' : hasTurni ? 'bg-blue-500' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>

      <div className="flex items-end justify-between px-1">
        <div>
          <div className={`text-base font-bold capitalize ${isOggi ? 'text-blue-700' : 'text-gray-800'}`}>
            {giornoLungo(giornoSelezionato)} {giornoSelezionato.getDate()}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {turniDelGiorno.length} {turniDelGiorno.length === 1 ? 'turno' : 'turni'}
            {oreGiorno > 0 && ` · ${oreLabel(oreGiorno)}`}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {dipendenti.length === 0 && (
          <EmptyState icon="👥" title="Nessun dipendente" description="Non ci sono dipendenti con i filtri correnti." />
        )}
        {dipendenti.map(d => {
          const turniDip = turniPerDipendente.get(d.id) ?? []
          if (turniDip.length === 0 && readonly) return null
          return (
            <div
              key={d.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)] divide-y divide-gray-50"
            >
              {turniDip.map(t => {
                const ore = calcolaOreTurno(t.ora_inizio, t.ora_fine)
                const isRiposo = ore === 0
                const colore = t.template?.colore ?? '#6b7280'
                return (
                  <button
                    key={t.id}
                    onClick={readonly ? undefined : () => onEditTurno(t)}
                    disabled={readonly}
                    className="w-full flex items-stretch gap-3 pr-3 py-2.5 text-left hover:bg-gray-50 disabled:hover:bg-transparent transition-colors"
                  >
                    <div
                      className="w-1 rounded-full flex-shrink-0 my-0.5"
                      style={{ backgroundColor: isRiposo ? '#cbd5e1' : colore }}
                    />
                    <Avatar nome={d.nome} cognome={d.cognome} size={34} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] text-gray-800 truncate leading-tight">
                        {d.cognome} {d.nome}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isRiposo ? 'bg-gray-100 text-gray-500 border border-dashed border-gray-300' : ''
                          }`}
                          style={isRiposo ? undefined : { backgroundColor: `${colore}22`, color: colore }}
                        >
                          {!isRiposo && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colore }} />}
                          {t.template?.nome ?? 'Custom'}
                        </span>
                        {!isRiposo && (
                          <PallinoTimbratura
                            stato={statoTimbratura({
                              ora_ingresso_effettiva: t.ora_ingresso_effettiva,
                              ora_uscita_effettiva: t.ora_uscita_effettiva,
                            })}
                            size="md"
                          />
                        )}
                        {ore > 0 && (
                          <span className="text-[11px] text-gray-500">
                            {t.ora_inizio.slice(0, 5)}–{t.ora_fine.slice(0, 5)} · {oreLabel(ore)}
                          </span>
                        )}
                      </div>
                      {t.posto && (
                        <div className="text-[11px] text-gray-500 mt-0.5 truncate">{t.posto.nome}</div>
                      )}
                    </div>
                  </button>
                )
              })}
              {turniDip.length === 0 && !readonly && (
                <button
                  onClick={() => onAddTurno(d.id, dataSelezionata)}
                  className="w-full flex items-center justify-between gap-3 pl-3 pr-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nome={d.nome} cognome={d.cognome} size={34} />
                    <span className="text-[13px] text-gray-600 truncate">{d.cognome} {d.nome}</span>
                  </div>
                  <span className="text-blue-600 text-[13px] font-semibold flex-shrink-0">+ Aggiungi</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
