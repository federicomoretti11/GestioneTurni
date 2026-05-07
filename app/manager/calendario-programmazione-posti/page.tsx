'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ViewSwitcher } from '@/components/calendario/ViewSwitcher'
import { GrigliaCalendarioPosti } from '@/components/calendario/GrigliaCalendarioPosti'
import { GrigliaCalendarioPostiMobile } from '@/components/calendario/GrigliaCalendarioPostiMobile'
import { HeaderProgrammazione } from '@/components/programmazione/HeaderProgrammazione'
import { TurnoConDettagli, PostoDiServizio } from '@/lib/types'
import { getDaysBetween } from '@/lib/utils/date'
import { presetPeriodo, type Periodo } from '@/lib/utils/periodi'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'
import { SkeletonCalendarioMobile } from '@/components/ui/SkeletonCalendarioMobile'
import { AlertErrore } from '@/components/ui/AlertErrore'

export default function ManagerProgrammazionePostiPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => presetPeriodo('mese-corrente'))
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [filtroPosto, setFiltroPosto] = useState('')
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')

  const giorni = useMemo(() => getDaysBetween(periodo.inizio, periodo.fine), [periodo])

  const caricaDati = useCallback(async () => {
    setLoading(true)
    setErrore('')
    try {
      const [trn, pst] = await Promise.all([
        fetch(`/api/turni?stato=bozza&data_inizio=${periodo.inizio}&data_fine=${periodo.fine}`).then(r => r.json()),
        fetch('/api/posti').then(r => r.json()),
      ])
      setTurni(Array.isArray(trn) ? trn : [])
      setPosti(Array.isArray(pst) ? pst : [])
    } catch {
      setErrore('Errore nel caricamento dei dati.')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { caricaDati() }, [caricaDati])

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
      <ViewSwitcher attiva="posto" hrefDipendente="/manager/calendario-programmazione" hrefPosto="/manager/calendario-programmazione-posti" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Programmazione per Sito</h1>
      </div>

      <HeaderProgrammazione
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onConferma={() => {}}
        onCopiaDaPeriodo={() => {}}
        onSvuotaBozza={() => {}}
        bozzeNelPeriodo={turni.length}
        readOnly
      />

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

      {errore && <AlertErrore messaggio={errore} onRetry={caricaDati} />}

      <div className="hidden md:block bg-white rounded-xl border border-slate-900/20 p-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        {loading ? <SkeletonCalendario righe={3} colonne={giorni.length} /> : (
          <GrigliaCalendarioPosti giorni={giorni} turni={turniFiltrati} posti={postiFiltrati} />
        )}
      </div>
      <div className="md:hidden">
        {loading ? <SkeletonCalendarioMobile /> : (
          <GrigliaCalendarioPostiMobile giorni={giorni} turni={turniFiltrati} />
        )}
      </div>
    </div>
  )
}
