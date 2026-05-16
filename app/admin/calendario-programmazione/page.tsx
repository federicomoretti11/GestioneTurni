'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { GrigliaCalendario } from '@/components/calendario/GrigliaCalendario'
import { GrigliaCalendarioMobile } from '@/components/calendario/GrigliaCalendarioMobile'
import { ModaleTurno } from '@/components/calendario/ModaleTurno'
import { HeaderProgrammazione } from '@/components/programmazione/HeaderProgrammazione'
import { ModaleConfermaPeriodo } from '@/components/programmazione/ModaleConfermaPeriodo'
import { ModaleCopiaDaPeriodo } from '@/components/programmazione/ModaleCopiaDaPeriodo'
import { ModaleSvuotaBozza } from '@/components/programmazione/ModaleSvuotaBozza'
import { ModaleConfermaAggiuntaTurno } from '@/components/programmazione/ModaleConfermaAggiuntaTurno'
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio, DipendenteCustom } from '@/lib/types'
import { getDaysBetween } from '@/lib/utils/date'
import { presetPeriodo, type Periodo } from '@/lib/utils/periodi'
import { AlertErrore } from '@/components/ui/AlertErrore'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'
import { useToast } from '@/components/ui/ToastProvider'
import { useBozzaCount } from '@/components/layout/BozzaCounter'
import { ViewSwitcher } from '@/components/calendario/ViewSwitcher'

export default function CalendarioProgrammazionePage() {
  const { mostra } = useToast()
  const [periodo, setPeriodo] = useState<Periodo>(() => presetPeriodo('mese-corrente'))
  const [dipendenti, setDipendenti] = useState<Profile[]>([])
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [templates, setTemplates] = useState<TurnoTemplate[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [dipendentiCustom, setDipendentiCustom] = useState<DipendenteCustom[]>([])
  const [modale, setModale] = useState<{ open: boolean; dipendenteId?: string; data?: string; turno?: TurnoConDettagli | null }>({ open: false })
  const [modaleConferma, setModaleConferma] = useState(false)
  const [modaleCopia, setModaleCopia] = useState(false)
  const [modaleSvuota, setModaleSvuota] = useState(false)
  const [modaleAggiunta, setModaleAggiunta] = useState<{ payload: { template_id: string | null; ora_inizio: string; ora_fine: string; posto_id: string | null; note: string; dipendente_id?: string }; conflitti: { dipendente: string; orario: string }[]; data: string; dipendenteNome: string } | null>(null)
  const [loadingAzione, setLoadingAzione] = useState(false)
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(true)
  const [indisponibilitaAbilitato, setIndisponibilitaAbilitato] = useState(false)
  const [indisponibilita, setIndisponibilita] = useState<Array<{ dipendente_id: string; data_inizio: string; data_fine: string; motivo: string | null }>>([])

  const giorni = useMemo(() => getDaysBetween(periodo.inizio, periodo.fine), [periodo])
  const bozzeNelPeriodo = useMemo(() => turni.filter(t => t.stato === 'bozza').length, [turni])
  const bozzeTotali = useBozzaCount()
  const bozzeAltrove = bozzeTotali - bozzeNelPeriodo

  const dipSelezionato = dipendenti.find(d => d.id === modale.dipendenteId)

  const caricaDati = useCallback(async () => {
    setErrore('')
    setLoading(true)
    try {
      const [imp, u, tp, tr, po, dipCustom] = await Promise.all([
        fetch('/api/impostazioni').then(r => r.json()),
        fetch('/api/utenti').then(r => r.json()),
        fetch('/api/template').then(r => r.json()),
        fetch(`/api/turni?stato=tutti&data_inizio=${periodo.inizio}&data_fine=${periodo.fine}`).then(r => r.json()),
        fetch('/api/posti').then(r => r.json()),
        fetch('/api/dipendenti-custom').then(r => r.ok ? r.json() : []),
      ])
      setIndisponibilitaAbilitato(imp?.modulo_indisponibilita_abilitato ?? false)
      setDipendenti(u.filter((x: Profile) => x.includi_in_turni && x.attivo))
      setTemplates(tp)
      setTurni(tr)
      setPosti(po)
      setDipendentiCustom(Array.isArray(dipCustom) ? dipCustom : [])

      if (imp?.modulo_indisponibilita_abilitato) {
        const indisp = await fetch(`/api/indisponibilita?from=${periodo.inizio}&to=${periodo.fine}`).then(r => r.json())
        setIndisponibilita(Array.isArray(indisp) ? indisp : [])
      } else {
        setIndisponibilita([])
      }
    } catch {
      setErrore('Errore nel caricamento dei dati.')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { caricaDati() }, [caricaDati])

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
          body: JSON.stringify({ ...payload, dipendente_id: payload.dipendente_id ?? modale.dipendenteId, data: modale.data, stato: 'bozza' }),
        })
    if (!res.ok) {
      const d = await res.json()
      return d.error ?? 'Errore nel salvataggio.'
    }
    setModale({ open: false })
    caricaDati()
  }

  async function handleSalvaTurno(payload: { template_id: string | null; ora_inizio: string; ora_fine: string; posto_id: string | null; note: string; dipendente_id?: string }): Promise<string | void> {
    // Controllo conflitti solo su creazione con posto selezionato
    if (!modale.turno && payload.posto_id) {
      const data = modale.data!
      const dipId = payload.dipendente_id ?? modale.dipendenteId!
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
              dipendente: d ? `${d.cognome} ${d.nome}` : (t.dipendente_id ?? ''),
              orario: t.ora_inizio !== t.ora_fine ? `${t.ora_inizio.slice(0,5)}–${t.ora_fine.slice(0,5)}` : '',
            }
          }),
        })
        return // aspetta conferma
      }
    }
    return eseguiSalvataggio(payload)
  }

  async function handleVaiAllePrimeBozze() {
    const res = await fetch('/api/turni/bozza-count')
    if (!res.ok) return
    const { primaData } = await res.json()
    if (!primaData) return
    const [y, m] = primaData.split('-').map(Number)
    const inizio = `${y}-${String(m).padStart(2, '0')}-01`
    const fine = new Date(y, m, 0).toISOString().split('T')[0]
    setPeriodo({ inizio, fine })
  }

  async function handleEliminaTurno() {
    if (!modale.turno) return
    await fetch(`/api/turni/${modale.turno.id}`, { method: 'DELETE' })
    setModale({ open: false })
    caricaDati()
  }

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
      <ViewSwitcher attiva="dipendente" hrefDipendente="/admin/calendario-programmazione" hrefPosto="/admin/calendario-programmazione-posti" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Programmazione</h1>
      </div>

      <HeaderProgrammazione
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onConferma={() => setModaleConferma(true)}
        onCopiaDaPeriodo={() => setModaleCopia(true)}
        onSvuotaBozza={() => setModaleSvuota(true)}
        bozzeNelPeriodo={bozzeNelPeriodo}
      />

      {errore && <AlertErrore messaggio={errore} onRetry={caricaDati} />}

      {bozzeAltrove > 0 && (
        <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-900">
          <span>📋 Ci sono <strong>{bozzeAltrove}</strong> {bozzeAltrove === 1 ? 'bozza in un altro periodo' : 'bozze in altri periodi'}.</span>
          <button onClick={handleVaiAllePrimeBozze} className="font-semibold underline whitespace-nowrap">
            Vai alle bozze →
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-900/20 p-4">
          <SkeletonCalendario righe={dipendenti.length || 4} colonne={giorni.length} />
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-slate-900/20 p-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
            <GrigliaCalendario
              giorni={giorni}
              dipendenti={dipendenti}
              turni={turni}
              onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
              onEditTurno={turno => setModale({ open: true, turno })}
              compact
              indisponibilita={indisponibilitaAbilitato ? indisponibilita : undefined}
            />
          </div>
          <div className="md:hidden">
            <GrigliaCalendarioMobile
              giorni={giorni}
              dipendenti={dipendenti}
              turni={turni}
              onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
              onEditTurno={turno => setModale({ open: true, turno })}
              onDataSelezionataChange={() => {}}
            />
          </div>
        </>
      )}

      <ModaleTurno
        open={modale.open}
        onClose={() => setModale({ open: false })}
        onSave={handleSalvaTurno}
        onDelete={modale.turno ? handleEliminaTurno : undefined}
        turno={modale.turno}
        templates={templates}
        posti={posti}
        dipendenteNome={dipSelezionato ? `${dipSelezionato.nome} ${dipSelezionato.cognome}` : undefined}
        dipendenti={dipendenti}
        dipendentiCustom={dipendentiCustom}
        data={modale.data}
      />

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
    </div>
  )
}
