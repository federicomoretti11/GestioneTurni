'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ViewSwitcher } from '@/components/calendario/ViewSwitcher'
import { GrigliaCalendario } from '@/components/calendario/GrigliaCalendario'
import { GrigliaCalendarioMobile } from '@/components/calendario/GrigliaCalendarioMobile'
import { HeaderProgrammazione } from '@/components/programmazione/HeaderProgrammazione'
import { Profile, TurnoConDettagli } from '@/lib/types'
import { getDaysBetween } from '@/lib/utils/date'
import { presetPeriodo, type Periodo } from '@/lib/utils/periodi'
import { AlertErrore } from '@/components/ui/AlertErrore'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'

export default function ManagerProgrammazionePage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => presetPeriodo('mese-corrente'))
  const [dipendenti, setDipendenti] = useState<Profile[]>([])
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(true)

  const giorni = useMemo(() => getDaysBetween(periodo.inizio, periodo.fine), [periodo])

  const caricaDati = useCallback(async () => {
    setErrore('')
    setLoading(true)
    try {
      const [u, tr] = await Promise.all([
        fetch('/api/utenti').then(r => r.json()),
        fetch(`/api/turni?stato=bozza&data_inizio=${periodo.inizio}&data_fine=${periodo.fine}`).then(r => r.json()),
      ])
      setDipendenti(u.filter((x: Profile) => x.ruolo === 'dipendente' && x.attivo))
      setTurni(tr)
    } catch {
      setErrore('Errore nel caricamento dei dati.')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { caricaDati() }, [caricaDati])

  return (
    <div className="space-y-4">
      <ViewSwitcher attiva="dipendente" hrefDipendente="/manager/calendario-programmazione" hrefPosto="/manager/calendario-programmazione-posti" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Programmazione</h1>
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

      {errore && <AlertErrore messaggio={errore} onRetry={caricaDati} />}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4">
          <SkeletonCalendario righe={dipendenti.length || 4} colonne={giorni.length} />
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 p-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
            <GrigliaCalendario
              giorni={giorni}
              dipendenti={dipendenti}
              turni={turni}
              onAddTurno={() => {}}
              onEditTurno={() => {}}
              compact
            />
          </div>
          <div className="md:hidden">
            <GrigliaCalendarioMobile
              giorni={giorni}
              dipendenti={dipendenti}
              turni={turni}
              onAddTurno={() => {}}
              onEditTurno={() => {}}
              onDataSelezionataChange={() => {}}
            />
          </div>
        </>
      )}
    </div>
  )
}
