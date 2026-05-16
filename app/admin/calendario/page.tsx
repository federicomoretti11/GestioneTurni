'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { GrigliaCalendario, AssenzaCalendario } from '@/components/calendario/GrigliaCalendario'
import { GrigliaCalendarioMobile } from '@/components/calendario/GrigliaCalendarioMobile'
import { SwitcherVista } from '@/components/calendario/SwitcherVista'
import { ModaleTurno } from '@/components/calendario/ModaleTurno'
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio, DipendenteCustom } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { getWeekDays, getMonthDays, toDateString } from '@/lib/utils/date'
import { AlertErrore } from '@/components/ui/AlertErrore'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'
import { SkeletonCalendarioMobile } from '@/components/ui/SkeletonCalendarioMobile'
import { useToast } from '@/components/ui/ToastProvider'
import { ViewSwitcher } from '@/components/calendario/ViewSwitcher'

function parseDataParam(s: string | null): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export default function CalendarioPage() {
  const { mostra } = useToast()
  const searchParams = useSearchParams()
  const [vista, setVista] = useState<'settimana' | 'mese'>('settimana')
  const [dataCorrente, setDataCorrente] = useState(() => parseDataParam(searchParams.get('data')) ?? new Date())
  const [dipendenti, setDipendenti] = useState<Profile[]>([])
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [templates, setTemplates] = useState<TurnoTemplate[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [dipendentiCustom, setDipendentiCustom] = useState<DipendenteCustom[]>([])
  const [modale, setModale] = useState<{ open: boolean; dipendenteId?: string; data?: string; turno?: TurnoConDettagli | null }>({ open: false })
  const [filtroDipendente, setFiltroDipendente] = useState('')
  const [filtroPosto, setFiltroPosto] = useState('')
  const [dataMobileSel, setDataMobileSel] = useState<string>(() => {
    const d = parseDataParam(searchParams.get('data')) ?? new Date()
    return toDateString(d)
  })
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(true)
  const [assenze, setAssenze] = useState<AssenzaCalendario[]>([])
  const [assenzaDettaglio, setAssenzaDettaglio] = useState<AssenzaCalendario | null>(null)
  const [rimuovendo, setRimuovendo] = useState(false)

  useEffect(() => {
    const d = parseDataParam(searchParams.get('data'))
    if (d) {
      setDataCorrente(d)
      setDataMobileSel(toDateString(d))
    }
  }, [searchParams])

  const giorni = vista === 'settimana'
    ? getWeekDays(dataCorrente)
    : getMonthDays(dataCorrente.getFullYear(), dataCorrente.getMonth())

  const caricaDati = useCallback(async () => {
    setErrore('')
    setLoading(true)
    try {
    const [utentiRes, templateRes, turniRes, postiRes, assenzeRes, dipCustomRes] = await Promise.all([
      fetch('/api/utenti'),
      fetch('/api/template'),
      fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
      fetch('/api/posti'),
      fetch(`/api/richieste/calendario?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
      fetch('/api/dipendenti-custom'),
    ])
    const [utenti, tmpl, trn, pst, asz, dipCustom] = await Promise.all([
      utentiRes.json(), templateRes.json(), turniRes.json(), postiRes.json(),
      assenzeRes.ok ? assenzeRes.json() : Promise.resolve([]),
      dipCustomRes.ok ? dipCustomRes.json() : Promise.resolve([]),
    ])
    setDipendenti(utenti.filter((u: Profile) => u.includi_in_turni && u.attivo))
    setTemplates(tmpl)
    setTurni(trn)
    setPosti(pst)
    setAssenze(Array.isArray(asz) ? asz : [])
    setDipendentiCustom(Array.isArray(dipCustom) ? dipCustom : [])
    } catch {
      setErrore('Errore nel caricamento dei dati. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [dataCorrente, vista])

  useEffect(() => { caricaDati() }, [caricaDati])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('turni-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turni' }, caricaDati)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [caricaDati])

  function spostaData(direzione: 1 | -1) {
    const d = new Date(dataCorrente)
    if (vista === 'settimana') d.setDate(d.getDate() + direzione * 7)
    else d.setMonth(d.getMonth() + direzione)
    setDataCorrente(d)
  }

  const postiDisponibili = useMemo(() =>
    posti.filter(p => turni.some(t => t.posto_id === p.id))
  , [turni, posti])

  const turniFiltrati = useMemo(() => {
    if (!filtroPosto) return turni
    return turni.filter(t => t.posto_id === filtroPosto)
  }, [turni, filtroPosto])

  const dipendentiFiltrati = useMemo(() => {
    let lista = dipendenti
    if (filtroDipendente) lista = lista.filter(d => d.id === filtroDipendente)
    if (filtroPosto) lista = lista.filter(d => turniFiltrati.some(t => t.dipendente_id === d.id))
    return lista
  }, [dipendenti, filtroDipendente, filtroPosto, turniFiltrati])

  async function handleSalvaTurno(payload: {
    template_id: string | null
    ora_inizio: string
    ora_fine: string
    posto_id: string | null
    note: string
    dipendente_id?: string
    dipendente_custom_id?: string
  }): Promise<string | void> {
    const res = modale.turno
      ? await fetch(`/api/turni/${modale.turno.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            dipendente_id: modale.turno.dipendente_id,
            data: modale.turno.data,
          }),
        })
      : await fetch('/api/turni', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            dipendente_id: payload.dipendente_id ?? modale.dipendenteId ?? null,
            dipendente_custom_id: payload.dipendente_custom_id ?? null,
            data: modale.data,
          }),
        })
    if (!res.ok) {
      const d = await res.json()
      return d.error ?? 'Errore nel salvataggio.'
    }
    setModale({ open: false })
    caricaDati()
  }

  async function handleCopiaSettimana() {
    const res = await fetch('/api/turni/copia-settimana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_inizio_origine: toDateString(giorni[0]) }),
    })
    const d = await res.json()
    if (d.copiati === 0) mostra('Nessun turno da copiare: tutti i turni della settimana successiva esistono già.', 'errore')
    else { mostra(`${d.copiati} turni copiati nella settimana successiva.`); caricaDati() }
  }

  async function handleEliminaTurno() {
    if (!modale.turno) return
    await fetch(`/api/turni/${modale.turno.id}`, { method: 'DELETE' })
    setModale({ open: false })
    caricaDati()
  }

  const dipSelezionato = dipendenti.find(d => d.id === modale.dipendenteId)

  return (
    <div className="space-y-4">
      <ViewSwitcher attiva="dipendente" hrefDipendente="/admin/calendario" hrefPosto="/admin/calendario-posti" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Calendario Turni</h1>
        <div className="flex items-center gap-2">
          {vista === 'settimana' && (
            <button
              onClick={handleCopiaSettimana}
              className="text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
            >
              Copia settimana →
            </button>
          )}
          <SwitcherVista
            vista={vista}
            onChange={setVista}
            dataCorrente={dataCorrente}
            onPrev={() => spostaData(-1)}
            onNext={() => spostaData(1)}
            onOggi={() => setDataCorrente(new Date())}
          />
        </div>
      </div>

      {errore && <AlertErrore messaggio={errore} onRetry={caricaDati} />}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 bg-white rounded-xl border border-slate-900/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap shrink-0">Dipendente</label>
          <select
            value={filtroDipendente}
            onChange={e => setFiltroDipendente(e.target.value)}
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti</option>
            {dipendenti.map(d => (
              <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>
            ))}
          </select>
        </div>
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
        {(filtroDipendente || filtroPosto) && (
          <button
            onClick={() => { setFiltroDipendente(''); setFiltroPosto('') }}
            className="text-sm text-blue-600 hover:underline"
          >
            Rimuovi filtri
          </button>
        )}
      </div>

      {loading ? (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-900/20 p-4">
            <SkeletonCalendario righe={dipendentiFiltrati.length || 4} colonne={giorni.length} />
          </div>
          <div className="md:hidden">
            <SkeletonCalendarioMobile giorni={giorni.length} righe={Math.max(3, dipendentiFiltrati.length || 4)} />
          </div>
        </>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-900/20 p-4">
            <GrigliaCalendario
              giorni={giorni}
              dipendenti={dipendentiFiltrati}
              turni={turniFiltrati}
              onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
              onEditTurno={turno => setModale({ open: true, turno })}
              assenze={assenze}
              onAssenzaClick={setAssenzaDettaglio}
            />
          </div>
          <div className="md:hidden">
            <GrigliaCalendarioMobile
              giorni={giorni}
              dipendenti={dipendentiFiltrati}
              turni={turniFiltrati}
              onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
              onEditTurno={turno => setModale({ open: true, turno })}
              onDataSelezionataChange={setDataMobileSel}
            />
          </div>
          {!modale.open && (
            <button
              onClick={() => setModale({ open: true, data: dataMobileSel })}
              aria-label="Nuovo turno"
              className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition text-3xl leading-none flex items-center justify-center"
            >
              +
            </button>
          )}
        </>
      )}
      {assenzaDettaglio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAssenzaDettaglio(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              {assenzaDettaglio.tipo === 'ferie' ? 'Ferie' : assenzaDettaglio.tipo === 'malattia' ? 'Malattia' : 'Permesso'}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Periodo</span>
                <span className="font-medium text-slate-900">
                  {assenzaDettaglio.data_inizio === assenzaDettaglio.data_fine
                    ? assenzaDettaglio.data_inizio
                    : `${assenzaDettaglio.data_inizio} — ${assenzaDettaglio.data_fine}`}
                </span>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={async () => {
                  if (!confirm('Rimuovere questa assenza approvata? I turni associati verranno eliminati.')) return
                  setRimuovendo(true)
                  const res = await fetch(`/api/richieste/${assenzaDettaglio.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ azione: 'cancella' }),
                  })
                  setRimuovendo(false)
                  if (res.ok) {
                    setAssenzaDettaglio(null)
                    caricaDati()
                  } else {
                    const d = await res.json()
                    mostra(d.error ?? 'Errore nella rimozione', 'errore')
                  }
                }}
                disabled={rimuovendo}
                className="flex-1 py-2 text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {rimuovendo ? 'Rimozione…' : 'Rimuovi'}
              </button>
              <button
                onClick={() => setAssenzaDettaglio(null)}
                className="flex-1 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
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
        dipendenti={dipendentiFiltrati}
        data={modale.data}
        dipendentiCustom={dipendentiCustom}
      />
    </div>
  )
}
