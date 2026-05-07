'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { GrigliaCalendarioPosti } from '@/components/calendario/GrigliaCalendarioPosti'
import { GrigliaCalendarioPostiMobile } from '@/components/calendario/GrigliaCalendarioPostiMobile'
import { SwitcherVista } from '@/components/calendario/SwitcherVista'
import { ModaleTurno } from '@/components/calendario/ModaleTurno'
import { TurnoConDettagli, TurnoTemplate, PostoDiServizio, Profile } from '@/lib/types'
import { getWeekDays, getMonthDays, toDateString } from '@/lib/utils/date'
import { isTurnoBloccato } from '@/lib/utils/turni'
import { ViewSwitcher } from '@/components/calendario/ViewSwitcher'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'
import { SkeletonCalendarioMobile } from '@/components/ui/SkeletonCalendarioMobile'
import { AlertErrore } from '@/components/ui/AlertErrore'

export default function CalendarioPostiPage() {
  const [vista, setVista] = useState<'settimana' | 'mese'>('settimana')
  const [dataCorrente, setDataCorrente] = useState(new Date())
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [templates, setTemplates] = useState<TurnoTemplate[]>([])
  const [dipendenti, setDipendenti] = useState<Profile[]>([])
  const [filtroPosto, setFiltroPosto] = useState('')
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [modale, setModale] = useState<{ open: boolean; postoId?: string; data?: string; turno?: TurnoConDettagli | null }>({ open: false })

  const giorni = vista === 'settimana'
    ? getWeekDays(dataCorrente)
    : getMonthDays(dataCorrente.getFullYear(), dataCorrente.getMonth())

  const caricaDati = useCallback(async () => {
    setLoading(true)
    setErrore('')
    try {
      const [trn, pst, tp, utenti] = await Promise.all([
        fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`).then(r => r.json()),
        fetch('/api/posti').then(r => r.json()),
        fetch('/api/template').then(r => r.json()),
        fetch('/api/utenti').then(r => r.json()),
      ])
      setTurni(Array.isArray(trn) ? trn : [])
      setPosti(Array.isArray(pst) ? pst : [])
      setTemplates(Array.isArray(tp) ? tp : [])
      setDipendenti(Array.isArray(utenti) ? utenti.filter((u: Profile) => u.ruolo === 'dipendente' && u.attivo) : [])
    } catch {
      setErrore('Errore nel caricamento dei dati.')
    } finally {
      setLoading(false)
    }
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
          body: JSON.stringify({ ...payload, dipendente_id: payload.dipendente_id, data: modale.data }),
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

  return (
    <div className="space-y-4">
      <ViewSwitcher attiva="posto" hrefDipendente="/admin/calendario" hrefPosto="/admin/calendario-posti" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Calendario per Sito</h1>
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

      {errore && <AlertErrore messaggio={errore} onRetry={caricaDati} />}

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-900/20 p-4">
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
    </div>
  )
}
