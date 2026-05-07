'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ViewSwitcher } from '@/components/calendario/ViewSwitcher'
import { GrigliaCalendarioPosti } from '@/components/calendario/GrigliaCalendarioPosti'
import { GrigliaCalendarioPostiMobile } from '@/components/calendario/GrigliaCalendarioPostiMobile'
import { SwitcherVista } from '@/components/calendario/SwitcherVista'
import { TurnoConDettagli, PostoDiServizio } from '@/lib/types'
import { getWeekDays, getMonthDays, toDateString } from '@/lib/utils/date'

export default function CalendarioPostiPage() {
  const [vista, setVista] = useState<'settimana' | 'mese'>('settimana')
  const [dataCorrente, setDataCorrente] = useState(new Date())
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [filtroPosto, setFiltroPosto] = useState('')

  const giorni = vista === 'settimana'
    ? getWeekDays(dataCorrente)
    : getMonthDays(dataCorrente.getFullYear(), dataCorrente.getMonth())

  const caricaDati = useCallback(async () => {
    const [turniRes, postiRes] = await Promise.all([
      fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
      fetch('/api/posti'),
    ])
    const [trn, pst] = await Promise.all([turniRes.json(), postiRes.json()])
    setTurni(Array.isArray(trn) ? trn : [])
    setPosti(Array.isArray(pst) ? pst : [])
  }, [dataCorrente, vista])

  useEffect(() => { caricaDati() }, [caricaDati])

  function spostaData(direzione: 1 | -1) {
    const d = new Date(dataCorrente)
    if (vista === 'settimana') d.setDate(d.getDate() + direzione * 7)
    else d.setMonth(d.getMonth() + direzione)
    setDataCorrente(d)
  }

  const postiDisponibili = useMemo(() =>
    posti.filter(p => p.attivo)
  , [posti])

  const turniFiltrati = useMemo(() => {
    if (!filtroPosto) return turni
    return turni.filter(t => t.posto_id === filtroPosto)
  }, [turni, filtroPosto])

  const postiFiltrati = useMemo(() =>
    filtroPosto ? postiDisponibili.filter(p => p.id === filtroPosto) : postiDisponibili
  , [postiDisponibili, filtroPosto])

  return (
    <div className="space-y-4">
      <ViewSwitcher attiva="posto" hrefDipendente="/manager/calendario" hrefPosto="/manager/calendario-posti" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Calendario per Posto</h1>
        <SwitcherVista
          vista={vista}
          onChange={setVista}
          dataCorrente={dataCorrente}
          onPrev={() => spostaData(-1)}
          onNext={() => spostaData(1)}
          onOggi={() => setDataCorrente(new Date())}
        />
      </div>

      {postiDisponibili.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 bg-white rounded-xl border border-slate-900/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap shrink-0">Posto di servizio</label>
            <select
              value={filtroPosto}
              onChange={e => setFiltroPosto(e.target.value)}
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti</option>
              {postiDisponibili.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          {filtroPosto && (
            <button onClick={() => setFiltroPosto('')} className="text-sm text-blue-600 hover:underline">
              Rimuovi filtro
            </button>
          )}
        </div>
      )}

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-900/20 p-4">
        <GrigliaCalendarioPosti giorni={giorni} turni={turniFiltrati} posti={postiFiltrati} />
      </div>
      <div className="md:hidden">
        <GrigliaCalendarioPostiMobile giorni={giorni} turni={turniFiltrati} />
      </div>
    </div>
  )
}
