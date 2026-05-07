'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ViewSwitcher } from '@/components/calendario/ViewSwitcher'
import { GrigliaCalendarioPosti } from '@/components/calendario/GrigliaCalendarioPosti'
import { GrigliaCalendarioPostiMobile } from '@/components/calendario/GrigliaCalendarioPostiMobile'
import { HeaderProgrammazione } from '@/components/programmazione/HeaderProgrammazione'
import { ModaleConfermaPeriodo } from '@/components/programmazione/ModaleConfermaPeriodo'
import { ModaleCopiaDaPeriodo } from '@/components/programmazione/ModaleCopiaDaPeriodo'
import { ModaleSvuotaBozza } from '@/components/programmazione/ModaleSvuotaBozza'
import { ModaleConfermaAggiuntaTurno } from '@/components/programmazione/ModaleConfermaAggiuntaTurno'
import { ModaleTurno } from '@/components/calendario/ModaleTurno'
import { TurnoConDettagli, TurnoTemplate, PostoDiServizio, Profile } from '@/lib/types'
import { getDaysBetween } from '@/lib/utils/date'
import { isTurnoBloccato } from '@/lib/utils/turni'
import { presetPeriodo, type Periodo } from '@/lib/utils/periodi'
import { useToast } from '@/components/ui/ToastProvider'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'
import { SkeletonCalendarioMobile } from '@/components/ui/SkeletonCalendarioMobile'
import { AlertErrore } from '@/components/ui/AlertErrore'

export default function CalendarioProgrammazionePostiPage() {
  const { mostra } = useToast()
  const [periodo, setPeriodo] = useState<Periodo>(() => presetPeriodo('mese-corrente'))
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [templates, setTemplates] = useState<TurnoTemplate[]>([])
  const [dipendenti, setDipendenti] = useState<Profile[]>([])
  const [filtroPosto, setFiltroPosto] = useState('')
  const [modale, setModale] = useState<{ open: boolean; postoId?: string; data?: string; turno?: TurnoConDettagli | null }>({ open: false })
  const [modaleConferma, setModaleConferma] = useState(false)
  const [modaleCopia, setModaleCopia] = useState(false)
  const [modaleSvuota, setModaleSvuota] = useState(false)
  const [modaleAggiunta, setModaleAggiunta] = useState<{ payload: { template_id: string | null; ora_inizio: string; ora_fine: string; posto_id: string | null; note: string; dipendente_id?: string }; conflitti: { dipendente: string; orario: string }[]; data: string; dipendenteNome: string } | null>(null)
  const [loadingAzione, setLoadingAzione] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')

  const giorni = useMemo(() => getDaysBetween(periodo.inizio, periodo.fine), [periodo])
  const bozzeNelPeriodo = useMemo(() => turni.filter(t => t.stato === 'bozza').length, [turni])

  const caricaDati = useCallback(async () => {
    setLoading(true)
    setErrore('')
    try {
      const [trn, pst, tp, utenti] = await Promise.all([
        fetch(`/api/turni?stato=tutti&data_inizio=${periodo.inizio}&data_fine=${periodo.fine}`).then(r => r.json()),
        fetch('/api/posti').then(r => r.json()),
        fetch('/api/template').then(r => r.json()),
        fetch('/api/utenti').then(r => r.json()),
      ])
      setTurni(Array.isArray(trn) ? trn : [])
      setPosti(Array.isArray(pst) ? pst : [])
      setTemplates(Array.isArray(tp) ? tp : [])
      setDipendenti(Array.isArray(utenti) ? utenti.filter((u: Profile) => u.includi_in_turni && u.attivo) : [])
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
      mostra(`${d.confermati} turni pubblicati per ${d.dipendenti} dipendenti.`)
      caricaDati()
    } else {
      mostra(d.error ?? 'Errore durante la conferma.', 'errore')
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
      mostra(`${d.copiati} turni copiati in bozza.`)
      caricaDati()
    } else {
      mostra(d.error ?? 'Errore durante la copia.', 'errore')
    }
  }

  async function eseguiSalvataggio(payload: { template_id: string | null; ora_inizio: string; ora_fine: string; posto_id: string | null; note: string; dipendente_id?: string }): Promise<string | void> {
    const res = modale.turno
      ? await fetch(`/api/turni/${modale.turno.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, dipendente_id: modale.turno.dipendente_id, data: modale.turno.data, stato: 'bozza' }),
        })
      : await fetch('/api/turni', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, dipendente_id: payload.dipendente_id, data: modale.data, stato: 'bozza' }),
        })
    if (!res.ok) {
      const d = await res.json()
      return d.error ?? 'Errore nel salvataggio.'
    }
    setModale({ open: false })
    caricaDati()
  }

  async function handleSalvaTurno(payload: { template_id: string | null; ora_inizio: string; ora_fine: string; posto_id: string | null; note: string; dipendente_id?: string }): Promise<string | void> {
    if (!modale.turno && payload.posto_id) {
      const data = modale.data!
      const dipId = payload.dipendente_id!
      const conflitti = turni.filter(t =>
        t.data === data &&
        t.dipendente_id !== dipId &&
        t.posto_id === payload.posto_id
      )
      if (conflitti.length > 0) {
        const dip = dipendenti.find(d => d.id === dipId)
        setModaleAggiunta({
          payload,
          data,
          dipendenteNome: dip ? `${dip.nome} ${dip.cognome}` : '',
          conflitti: conflitti.map(t => {
            const d = dipendenti.find(x => x.id === t.dipendente_id)
            return {
              dipendente: d ? `${d.cognome} ${d.nome}` : t.dipendente_id,
              orario: t.ora_inizio !== t.ora_fine ? `${t.ora_inizio.slice(0,5)}–${t.ora_fine.slice(0,5)}` : '',
            }
          }),
        })
        return
      }
    }
    return eseguiSalvataggio(payload)
  }

  async function handleEliminaTurno() {
    if (!modale.turno) return
    await fetch(`/api/turni/${modale.turno.id}`, { method: 'DELETE' })
    setModale({ open: false })
    caricaDati()
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
      mostra(`${d.eliminati} turni bozza eliminati.`)
      caricaDati()
    } else {
      mostra(d.error ?? 'Errore durante lo svuotamento.', 'errore')
    }
  }

  return (
    <div className="space-y-4">
      <ViewSwitcher attiva="posto" hrefDipendente="/admin/calendario-programmazione" hrefPosto="/admin/calendario-programmazione-posti" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Programmazione per Sito</h1>
      </div>

      <HeaderProgrammazione
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onConferma={() => setModaleConferma(true)}
        onCopiaDaPeriodo={() => setModaleCopia(true)}
        onSvuotaBozza={() => setModaleSvuota(true)}
        bozzeNelPeriodo={bozzeNelPeriodo}
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
          <GrigliaCalendarioPosti
            giorni={giorni}
            turni={turniFiltrati}
            posti={postiFiltrati}
            onAddTurno={(postoId, data) => setModale({ open: true, postoId, data })}
            onEditTurno={turno => setModale({ open: true, turno })}
          />
        )}
      </div>
      <div className="md:hidden">
        {loading ? <SkeletonCalendarioMobile /> : (
          <GrigliaCalendarioPostiMobile
            giorni={giorni}
            turni={turniFiltrati}
            onAddTurno={(postoId, data) => setModale({ open: true, postoId, data })}
            onEditTurno={turno => setModale({ open: true, turno })}
          />
        )}
      </div>

      <ModaleTurno
        open={modale.open}
        onClose={() => setModale({ open: false })}
        onSave={handleSalvaTurno}
        onDelete={modale.turno ? handleEliminaTurno : undefined}
        turno={modale.turno}
        templates={templates}
        posti={posti}
        dipendenti={dipendenti}
        data={modale.data ?? modale.turno?.data}
        postoIdDefault={modale.postoId}
        readOnly={!!(modale.turno && isTurnoBloccato(modale.turno))}
      />

      {modaleAggiunta && (
        <ModaleConfermaAggiuntaTurno
          open
          data={modaleAggiunta.data}
          dipendenteNome={modaleAggiunta.dipendenteNome}
          turniEsistenti={modaleAggiunta.conflitti}
          onConferma={async () => {
            setModaleAggiunta(null)
            await eseguiSalvataggio(modaleAggiunta.payload)
          }}
          onAnnulla={() => setModaleAggiunta(null)}
        />
      )}

      <ModaleConfermaPeriodo
        open={modaleConferma}
        periodo={periodo}
        bozze={bozzeNelPeriodo}
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
        bozze={bozzeNelPeriodo}
        onConferma={handleSvuota}
        onAnnulla={() => setModaleSvuota(false)}
        loading={loadingAzione}
      />
    </div>
  )
}
