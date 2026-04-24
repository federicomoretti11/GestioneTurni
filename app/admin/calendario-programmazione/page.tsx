'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { GrigliaCalendario } from '@/components/calendario/GrigliaCalendario'
import { GrigliaCalendarioMobile } from '@/components/calendario/GrigliaCalendarioMobile'
import { ModaleTurno } from '@/components/calendario/ModaleTurno'
import { HeaderProgrammazione } from '@/components/programmazione/HeaderProgrammazione'
import { ModaleConfermaPeriodo } from '@/components/programmazione/ModaleConfermaPeriodo'
import { ModaleCopiaDaPeriodo } from '@/components/programmazione/ModaleCopiaDaPeriodo'
import { ModaleSvuotaBozza } from '@/components/programmazione/ModaleSvuotaBozza'
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio } from '@/lib/types'
import { getDaysBetween } from '@/lib/utils/date'
import { presetPeriodo, type Periodo } from '@/lib/utils/periodi'
import { AlertErrore } from '@/components/ui/AlertErrore'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'

export default function CalendarioProgrammazionePage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => presetPeriodo('mese-corrente'))
  const [dipendenti, setDipendenti] = useState<Profile[]>([])
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [templates, setTemplates] = useState<TurnoTemplate[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [modale, setModale] = useState<{ open: boolean; dipendenteId?: string; data?: string; turno?: TurnoConDettagli | null }>({ open: false })
  const [modaleConferma, setModaleConferma] = useState(false)
  const [modaleCopia, setModaleCopia] = useState(false)
  const [modaleSvuota, setModaleSvuota] = useState(false)
  const [loadingAzione, setLoadingAzione] = useState(false)
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(true)

  const giorni = useMemo(() => getDaysBetween(periodo.inizio, periodo.fine), [periodo])

  const caricaDati = useCallback(async () => {
    setErrore('')
    setLoading(true)
    try {
      const [u, tp, tr, po] = await Promise.all([
        fetch('/api/utenti').then(r => r.json()),
        fetch('/api/template').then(r => r.json()),
        fetch(`/api/turni?stato=bozza&data_inizio=${periodo.inizio}&data_fine=${periodo.fine}`).then(r => r.json()),
        fetch('/api/posti').then(r => r.json()),
      ])
      setDipendenti(u.filter((x: Profile) => x.ruolo === 'dipendente' && x.attivo))
      setTemplates(tp)
      setTurni(tr)
      setPosti(po)
    } catch {
      setErrore('Errore nel caricamento dei dati.')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { caricaDati() }, [caricaDati])

  async function handleSalvaTurno(payload: { template_id: string | null; ora_inizio: string; ora_fine: string; posto_id: string | null; note: string; dipendente_id?: string }): Promise<string | void> {
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Programmazione</h1>
      </div>

      <HeaderProgrammazione
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onConferma={() => setModaleConferma(true)}
        onCopiaDaPeriodo={() => setModaleCopia(true)}
        onSvuotaBozza={() => setModaleSvuota(true)}
        bozzeNelPeriodo={turni.length}
      />

      {errore && <AlertErrore messaggio={errore} onRetry={caricaDati} />}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <SkeletonCalendario righe={dipendenti.length || 4} colonne={giorni.length} />
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <GrigliaCalendario
              giorni={giorni}
              dipendenti={dipendenti}
              turni={turni}
              onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
              onEditTurno={turno => setModale({ open: true, turno })}
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
        dipendenti={dipendenti}
        data={modale.data}
      />

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
