'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { GrigliaCalendario } from '@/components/calendario/GrigliaCalendario'
import { GrigliaCalendarioMobile } from '@/components/calendario/GrigliaCalendarioMobile'
import { SwitcherVista } from '@/components/calendario/SwitcherVista'
import { ModaleTurno } from '@/components/calendario/ModaleTurno'
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { getWeekDays, getMonthDays, toDateString } from '@/lib/utils/date'
import { isTurnoBloccato } from '@/lib/utils/turni'
import { AlertErrore } from '@/components/ui/AlertErrore'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'
import { SkeletonCalendarioMobile } from '@/components/ui/SkeletonCalendarioMobile'
import { useToast } from '@/components/ui/ToastProvider'

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
  const [modale, setModale] = useState<{ open: boolean; dipendenteId?: string; data?: string; turno?: TurnoConDettagli | null }>({ open: false })
  const [filtroDipendente, setFiltroDipendente] = useState('')
  const [filtroPosto, setFiltroPosto] = useState('')
  const [dataMobileSel, setDataMobileSel] = useState<string>(() => {
    const d = parseDataParam(searchParams.get('data')) ?? new Date()
    return toDateString(d)
  })
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(true)

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
    const [utentiRes, templateRes, turniRes, postiRes] = await Promise.all([
      fetch('/api/utenti'),
      fetch('/api/template'),
      fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
      fetch('/api/posti'),
    ])
    const [utenti, tmpl, trn, pst] = await Promise.all([utentiRes.json(), templateRes.json(), turniRes.json(), postiRes.json()])
    setDipendenti(utenti.filter((u: Profile) => u.ruolo === 'dipendente' && u.attivo))
    setTemplates(tmpl)
    setTurni(trn)
    setPosti(pst)
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

  async function handleSalvaTurno(payload: { template_id: string | null; ora_inizio: string; ora_fine: string; posto_id: string | null; note: string; dipendente_id?: string }): Promise<string | void> {
    const res = modale.turno
      ? await fetch(`/api/turni/${modale.turno.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, dipendente_id: modale.turno.dipendente_id, data: modale.turno.data }),
        })
      : await fetch('/api/turni', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, dipendente_id: payload.dipendente_id ?? modale.dipendenteId, data: modale.data }),
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Calendario Turni</h1>
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

      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Dipendente</label>
          <select
            value={filtroDipendente}
            onChange={e => setFiltroDipendente(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti</option>
            {dipendenti.map(d => (
              <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>
            ))}
          </select>
        </div>
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
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <SkeletonCalendario righe={dipendentiFiltrati.length || 4} colonne={giorni.length} />
          </div>
          <div className="md:hidden">
            <SkeletonCalendarioMobile giorni={giorni.length} righe={Math.max(3, dipendentiFiltrati.length || 4)} />
          </div>
        </>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <GrigliaCalendario
              giorni={giorni}
              dipendenti={dipendentiFiltrati}
              turni={turniFiltrati}
              onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
              onEditTurno={turno => setModale({ open: true, turno })}
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
        readOnly={!!(modale.turno && isTurnoBloccato(modale.turno))}
      />
    </div>
  )
}
