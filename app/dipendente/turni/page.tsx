'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { GrigliaCalendario } from '@/components/calendario/GrigliaCalendario'
import { GrigliaCalendarioMobile } from '@/components/calendario/GrigliaCalendarioMobile'
import { SwitcherVista } from '@/components/calendario/SwitcherVista'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import type { Profile, TurnoConDettagli } from '@/lib/types'
import { getWeekDays, getMonthDays, toDateString } from '@/lib/utils/date'
import { calcolaOreTurno, isTurnoBloccato, statoTimbratura } from '@/lib/utils/turni'
import { exportPdf } from '@/lib/utils/export'
import { useFestivi } from '@/lib/hooks/useFestivi'
import { AlertErrore } from '@/components/ui/AlertErrore'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'
import { BannerTurnoOggi } from '@/components/dipendente/BannerTurnoOggi'

function oreLabel(ore: number) {
  return `${ore % 1 === 0 ? ore : ore.toFixed(1)}h`
}

function parseDataParam(s: string | null): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export default function MieiTurniPage() {
  const searchParams = useSearchParams()
  const [vista, setVista] = useState<'settimana' | 'mese'>('settimana')
  const [dataCorrente, setDataCorrente] = useState(() => parseDataParam(searchParams.get('data')) ?? new Date())
  const [profilo, setProfilo] = useState<Profile | null>(null)
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [turnoOggi, setTurnoOggi] = useState<TurnoConDettagli | null>(null)
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [turnoPerCambio, setTurnoPerCambio] = useState<TurnoConDettagli | null>(null)
  const [motivazioneCambio, setMotivazioneCambio] = useState('')
  const [erroreCambio, setErroreCambio] = useState('')
  const [loadingCambio, setLoadingCambio] = useState(false)
  const [turnoDettaglio, setTurnoDettaglio] = useState<TurnoConDettagli | null>(null)
  const supabase = createClient()
  const festivi = useFestivi()

  const giorni = vista === 'settimana'
    ? getWeekDays(dataCorrente)
    : getMonthDays(dataCorrente.getFullYear(), dataCorrente.getMonth())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfilo(data))
    })
  }, [])

  useEffect(() => {
    const d = parseDataParam(searchParams.get('data'))
    if (d) setDataCorrente(d)
  }, [searchParams])

  const caricaTurni = useCallback(async () => {
    if (!profilo) return
    setErrore('')
    setLoading(true)
    try {
      const res = await fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`)
      const data = await res.json()
      setTurni(Array.isArray(data) ? data.filter((t: TurnoConDettagli) => t.dipendente_id === profilo.id) : [])
    } catch {
      setErrore('Errore nel caricamento dei turni. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [dataCorrente, vista, profilo])

  const caricaTurnoOggi = useCallback(async () => {
    if (!profilo) return
    const oggi = toDateString(new Date())
    try {
      const res = await fetch(`/api/turni?data_inizio=${oggi}&data_fine=${oggi}`)
      const data = await res.json()
      const mio = Array.isArray(data) ? data.find((t: TurnoConDettagli) => t.dipendente_id === profilo.id) : null
      setTurnoOggi(mio ?? null)
    } catch {
      // silenzioso, il banner si limita a non mostrare
    }
  }, [profilo])

  useEffect(() => { caricaTurni() }, [caricaTurni])
  useEffect(() => { caricaTurnoOggi() }, [caricaTurnoOggi])

  useEffect(() => {
    if (!profilo) return
    const ch = supabase.channel('turni-dipendente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turni',
        filter: `dipendente_id=eq.${profilo.id}` }, () => { caricaTurni(); caricaTurnoOggi() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [caricaTurni, caricaTurnoOggi, profilo])

  function spostaData(direzione: 1 | -1) {
    const d = new Date(dataCorrente)
    if (vista === 'settimana') d.setDate(d.getDate() + direzione * 7)
    else d.setMonth(d.getMonth() + direzione)
    setDataCorrente(d)
  }

  const oreTotali = useMemo(() =>
    turni.reduce((sum, t) => sum + calcolaOreTurno(t.ora_inizio, t.ora_fine), 0)
  , [turni])

  const turniLavorativi = useMemo(() =>
    turni.filter(t => calcolaOreTurno(t.ora_inizio, t.ora_fine) > 0)
  , [turni])

  const turniRiposo = useMemo(() =>
    turni.filter(t => calcolaOreTurno(t.ora_inizio, t.ora_fine) === 0)
  , [turni])

  const periodoLabel = vista === 'mese'
    ? giorni[0].toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())
    : `${toDateString(giorni[0])} – ${toDateString(giorni[giorni.length - 1])}`

  async function inviaCambioTurno() {
    if (!turnoPerCambio) return
    if (!motivazioneCambio.trim()) { setErroreCambio('La motivazione è obbligatoria'); return }
    setLoadingCambio(true)
    const res = await fetch('/api/richieste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'cambio_turno',
        data_inizio: turnoPerCambio.data,
        data_fine: turnoPerCambio.data,
        turno_id: turnoPerCambio.id,
        note_dipendente: motivazioneCambio.trim(),
      }),
    })
    setLoadingCambio(false)
    if (!res.ok) {
      const json = await res.json()
      setErroreCambio(json.error ?? 'Errore invio')
      return
    }
    setTurnoPerCambio(null)
    setMotivazioneCambio('')
    setErroreCambio('')
  }

  async function handleDownloadPdf() {
    if (!profilo || !turni.length) return
    setExportLoading(true)
    try {
      const filename = `turni_${profilo.cognome}_${profilo.nome}_${toDateString(giorni[0])}_${toDateString(giorni[giorni.length - 1])}`
      await exportPdf(turni, filename, periodoLabel, festivi)
    } finally {
      setExportLoading(false)
    }
  }

  if (!profilo) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">I miei turni</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <SwitcherVista vista={vista} onChange={setVista} dataCorrente={dataCorrente} onPrev={() => spostaData(-1)} onNext={() => spostaData(1)} onOggi={() => setDataCorrente(new Date())} />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={exportLoading || loading || turni.length === 0}
          >
            {exportLoading ? 'Generazione…' : '⬇ Scarica PDF'}
          </Button>
        </div>
      </div>

      {errore && <AlertErrore messaggio={errore} onRetry={caricaTurni} />}

      <BannerTurnoOggi turno={turnoOggi} onRefresh={() => { caricaTurnoOggi(); caricaTurni() }} />

      {/* Riepilogo periodo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{oreLabel(oreTotali)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Ore totali</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{turniLavorativi.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Turni lavorativi</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-400">{turniRiposo.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Riposi</p>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        {loading ? <SkeletonCalendario righe={1} colonne={giorni.length} /> : <GrigliaCalendario
          giorni={giorni}
          dipendenti={[profilo]}
          turni={turni}
          onAddTurno={() => {}}
          onEditTurno={() => {}}
          readonly
          onTurnoClick={t => isTurnoBloccato(t) ? setTurnoDettaglio(t) : setTurnoPerCambio(t)}
        />}
      </div>
      <div className="md:hidden">
        {loading ? <SkeletonCalendario righe={1} colonne={giorni.length} /> : <GrigliaCalendarioMobile
          giorni={giorni}
          dipendenti={[profilo]}
          turni={turni}
          onAddTurno={() => {}}
          onEditTurno={t => isTurnoBloccato(t) ? setTurnoDettaglio(t) : setTurnoPerCambio(t)}
          readonly
        />}
      </div>

      {turnoDettaglio && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="font-bold text-gray-900">Dettaglio turno</h2>
            <p className="text-sm text-gray-500">
              {turnoDettaglio.data} · {turnoDettaglio.ora_inizio?.slice(0,5)}–{turnoDettaglio.ora_fine?.slice(0,5)}
            </p>
            {turnoDettaglio.posto && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">Posto:</span> {turnoDettaglio.posto.nome}
              </p>
            )}
            {(() => {
              const isRiposo = calcolaOreTurno(turnoDettaglio.ora_inizio, turnoDettaglio.ora_fine) === 0
              const stato = isRiposo ? null : statoTimbratura({
                ora_ingresso_effettiva: turnoDettaglio.ora_ingresso_effettiva,
                ora_uscita_effettiva: turnoDettaglio.ora_uscita_effettiva,
              })
              const oraDaISO = (iso: string) => {
                const d = new Date(iso)
                return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
              }
              return (
                <>
                  {!isRiposo && (
                    <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timbratura</p>
                      <div className="flex gap-6 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-gray-400">Ingresso</span>
                          <span className="font-semibold">{turnoDettaglio.ora_ingresso_effettiva ? oraDaISO(turnoDettaglio.ora_ingresso_effettiva) : '—'}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-gray-400">Uscita</span>
                          <span className="font-semibold">{turnoDettaglio.ora_uscita_effettiva ? oraDaISO(turnoDettaglio.ora_uscita_effettiva) : '—'}</span>
                        </span>
                      </div>
                      {stato && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          stato === 'completato' ? 'bg-green-100 text-green-700' :
                          stato === 'in_corso' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {stato === 'completato' ? 'Timbrato' : stato === 'in_corso' ? 'Uscita mancante' : 'Non timbrato'}
                        </span>
                      )}
                    </div>
                  )}
                  {isRiposo && <p className="text-sm text-gray-500 italic">Giorno di riposo</p>}
                </>
              )
            })()}
            {turnoDettaglio.note && (
              <p className="text-sm text-gray-700"><span className="text-gray-500">Note:</span> {turnoDettaglio.note}</p>
            )}
            <button
              onClick={() => setTurnoDettaglio(null)}
              className="w-full border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {turnoPerCambio && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="font-bold text-gray-900">Non posso fare questo turno</h2>
            <p className="text-sm text-gray-600">
              {turnoPerCambio.data} · {turnoPerCambio.ora_inizio?.slice(0,5)}–{turnoPerCambio.ora_fine?.slice(0,5)}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Motivazione *</label>
              <textarea
                value={motivazioneCambio}
                onChange={e => setMotivazioneCambio(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
                placeholder="Spiega perché non puoi fare questo turno..."
              />
            </div>
            {erroreCambio && <p className="text-red-600 text-sm">{erroreCambio}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setTurnoPerCambio(null); setMotivazioneCambio(''); setErroreCambio('') }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={inviaCambioTurno}
                disabled={loadingCambio}
                className="flex-1 bg-orange-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {loadingCambio ? 'Invio...' : 'Invia richiesta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
