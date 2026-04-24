'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { GrigliaCalendarioPosti } from '@/components/calendario/GrigliaCalendarioPosti'
import { GrigliaCalendarioPostiMobile } from '@/components/calendario/GrigliaCalendarioPostiMobile'
import { HeaderProgrammazione } from '@/components/programmazione/HeaderProgrammazione'
import { ModaleConfermaPeriodo } from '@/components/programmazione/ModaleConfermaPeriodo'
import { ModaleCopiaDaPeriodo } from '@/components/programmazione/ModaleCopiaDaPeriodo'
import { ModaleSvuotaBozza } from '@/components/programmazione/ModaleSvuotaBozza'
import { TurnoConDettagli, PostoDiServizio } from '@/lib/types'
import { getDaysBetween } from '@/lib/utils/date'
import { presetPeriodo, type Periodo } from '@/lib/utils/periodi'

export default function CalendarioProgrammazionePostiPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => presetPeriodo('mese-corrente'))
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [filtroPosto, setFiltroPosto] = useState('')
  const [modaleConferma, setModaleConferma] = useState(false)
  const [modaleCopia, setModaleCopia] = useState(false)
  const [modaleSvuota, setModaleSvuota] = useState(false)
  const [loadingAzione, setLoadingAzione] = useState(false)

  const giorni = useMemo(() => getDaysBetween(periodo.inizio, periodo.fine), [periodo])

  const caricaDati = useCallback(async () => {
    const [trn, pst] = await Promise.all([
      fetch(`/api/turni?stato=bozza&data_inizio=${periodo.inizio}&data_fine=${periodo.fine}`).then(r => r.json()),
      fetch('/api/posti').then(r => r.json()),
    ])
    setTurni(Array.isArray(trn) ? trn : [])
    setPosti(Array.isArray(pst) ? pst : [])
  }, [periodo])

  useEffect(() => { caricaDati() }, [caricaDati])

  const postiDisponibili = useMemo(() =>
    posti.filter(p => turni.some(t => t.posto_id === p.id))
  , [turni, posti])

  const turniFiltrati = useMemo(() => {
    if (!filtroPosto) return turni
    return turni.filter(t => t.posto_id === filtroPosto)
  }, [turni, filtroPosto])

  async function handleConferma() {
    setLoadingAzione(true)
    const res = await fetch('/api/turni/conferma-periodo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_inizio: periodo.inizio, data_fine: periodo.fine }),
    })
    const d = await res.json()
    setLoadingAzione(false)
    setModaleConferma(false)
    if (res.ok) {
      alert(`${d.confermati} turni pubblicati per ${d.dipendenti} dipendenti.`)
      caricaDati()
    } else {
      alert(d.error ?? 'Errore durante la conferma.')
    }
  }

  async function handleCopia(origineInizio: string, origineFine: string) {
    setLoadingAzione(true)
    const res = await fetch('/api/turni/copia-da-periodo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origine_inizio: origineInizio,
        origine_fine: origineFine,
        destinazione_inizio: periodo.inizio,
      }),
    })
    const d = await res.json()
    setLoadingAzione(false)
    setModaleCopia(false)
    if (res.ok) {
      alert(`${d.copiati} turni copiati in bozza.`)
      caricaDati()
    } else {
      alert(d.error ?? 'Errore durante la copia.')
    }
  }

  async function handleSvuota() {
    setLoadingAzione(true)
    const res = await fetch('/api/turni/svuota-bozza-periodo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_inizio: periodo.inizio, data_fine: periodo.fine }),
    })
    const d = await res.json()
    setLoadingAzione(false)
    setModaleSvuota(false)
    if (res.ok) {
      alert(`${d.eliminati} turni bozza eliminati.`)
      caricaDati()
    } else {
      alert(d.error ?? 'Errore durante lo svuotamento.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Programmazione per Posto</h1>
      </div>

      <HeaderProgrammazione
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onConferma={() => setModaleConferma(true)}
        onCopiaDaPeriodo={() => setModaleCopia(true)}
        onSvuotaBozza={() => setModaleSvuota(true)}
        bozzeNelPeriodo={turni.length}
      />

      {postiDisponibili.length > 0 && (
        <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Posto di servizio</label>
            <select
              value={filtroPosto}
              onChange={e => setFiltroPosto(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <GrigliaCalendarioPosti giorni={giorni} turni={turniFiltrati} />
      </div>
      <div className="md:hidden">
        <GrigliaCalendarioPostiMobile giorni={giorni} turni={turniFiltrati} />
      </div>

      <ModaleConfermaPeriodo
        open={modaleConferma}
        periodo={periodo}
        bozze={turni.length}
        onConferma={handleConferma}
        onAnnulla={() => setModaleConferma(false)}
        loading={loadingAzione}
      />
      <ModaleCopiaDaPeriodo
        open={modaleCopia}
        destinazione={periodo}
        onConferma={handleCopia}
        onAnnulla={() => setModaleCopia(false)}
        loading={loadingAzione}
      />
      <ModaleSvuotaBozza
        open={modaleSvuota}
        periodo={periodo}
        bozze={turni.length}
        onConferma={handleSvuota}
        onAnnulla={() => setModaleSvuota(false)}
        loading={loadingAzione}
      />
    </div>
  )
}
