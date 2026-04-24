'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio } from '@/lib/types'
import { useFestivi } from '@/lib/hooks/useFestivi'
import { classificaOre, formatOre } from '@/lib/utils/maggiorazioni'

interface ModaleTurnoProps {
  open: boolean
  onClose: () => void
  onSave: (data: { template_id: string | null; ora_inizio: string; ora_fine: string; posto_id: string | null; note: string; dipendente_id?: string }) => Promise<string | void>
  onDelete?: () => void
  turno?: TurnoConDettagli | null
  templates: TurnoTemplate[]
  posti: PostoDiServizio[]
  dipendenteNome?: string
  dipendenti?: Profile[]
  data?: string   // YYYY-MM-DD (formattata internamente per display)
}

function formatDataIT(iso: string): string {
  const [y, m, d] = iso.split('-')
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  const giorno = dt.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return giorno.charAt(0).toUpperCase() + giorno.slice(1)
}

export function ModaleTurno({ open, onClose, onSave, onDelete, turno, templates, posti, dipendenteNome, dipendenti, data }: ModaleTurnoProps) {
  const [templateId, setTemplateId] = useState<string>('')
  const [oraInizio, setOraInizio] = useState('08:00')
  const [oraFine, setOraFine] = useState('16:00')
  const [postoId, setPostoId] = useState<string>('')
  const [note, setNote] = useState('')
  const [dipendenteId, setDipendenteId] = useState<string>('')
  const [errore, setErrore] = useState('')
  const [confermaElimina, setConfermaElimina] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [modificato, setModificato] = useState(false)

  const mostraSelectDipendente = !turno && !dipendenteNome && !!dipendenti && dipendenti.length > 0

  useEffect(() => {
    if (turno) {
      setTemplateId(turno.template_id ?? '')
      setOraInizio(turno.ora_inizio.slice(0, 5))
      setOraFine(turno.ora_fine.slice(0, 5))
      setPostoId(turno.posto_id ?? '')
      setNote(turno.note ?? '')
    } else {
      setTemplateId('')
      setOraInizio('08:00')
      setOraFine('16:00')
      setPostoId('')
      setNote('')
    }
    setDipendenteId('')
    setErrore('')
    setConfermaElimina(false)
    setSalvando(false)
    setModificato(false)
  }, [turno, open])

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    setModificato(true)
    const t = templates.find(t => t.id === id)
    if (t) {
      setOraInizio(t.ora_inizio.slice(0, 5))
      setOraFine(t.ora_fine.slice(0, 5))
    }
  }

  function handleCloseRequest() {
    if (modificato && !salvando) {
      if (!confirm('Hai modifiche non salvate. Vuoi chiudere senza salvare?')) return
    }
    onClose()
  }

  const templateSelezionato = templates.find(t => t.id === templateId)
  const isRiposo = templateSelezionato?.nome.toLowerCase().includes('riposo') ?? false

  async function handleSave() {
    if (mostraSelectDipendente && !dipendenteId) { setErrore('Seleziona un dipendente'); return }
    if (!isRiposo && !postoId) { setErrore('Il posto di servizio è obbligatorio'); return }
    setSalvando(true)
    const erroreApi = await onSave({
      template_id: templateId || null,
      ora_inizio: oraInizio + ':00',
      ora_fine: oraFine + ':00',
      posto_id: postoId || null,
      note,
      ...(mostraSelectDipendente ? { dipendente_id: dipendenteId } : {}),
    })
    if (erroreApi) { setErrore(erroreApi); setSalvando(false) }
  }

  const title = turno ? 'Modifica turno' : `Nuovo turno${dipendenteNome ? ` — ${dipendenteNome}` : ''}`
  const postiAttivi = posti.filter(p => p.attivo)

  const oraDaISO = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const timbroIngresso = turno?.ora_ingresso_effettiva ?? null
  const timbroUscita = turno?.ora_uscita_effettiva ?? null
  const mostraTimbri = !!(timbroIngresso || timbroUscita)

  const festivi = useFestivi()
  const dataISO = turno?.data ?? data ?? ''
  const classificazione = dataISO ? classificaOre(dataISO, oraInizio, oraFine, festivi) : null
  const mostraMaggiorazioni = !!classificazione && classificazione.ore > 0 && !isRiposo
  const festivoDelGiorno = classificazione?.festivo ?? null

  return (
    <Modal open={open} onClose={onClose} onCloseRequest={handleCloseRequest} title={title}>
      {dataISO && (
        <div className="flex items-center gap-2 flex-wrap mb-5 text-[11px] font-semibold tracking-wider uppercase text-gray-500">
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>{formatDataIT(dataISO)}</span>
          {turno?.stato === 'bozza' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wide">
              BOZZA
            </span>
          )}
          {festivoDelGiorno && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold normal-case tracking-normal ${
                festivoDelGiorno.tipo === 'nazionale'
                  ? 'bg-red-100 text-red-700'
                  : festivoDelGiorno.tipo === 'patronale'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              🎉 {festivoDelGiorno.nome}
            </span>
          )}
        </div>
      )}
      {mostraMaggiorazioni && (
        <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 mb-2">Ore e maggiorazioni</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="text-slate-400">Totale</span>
              <span className="font-semibold">{formatOre(classificazione!.ore)}</span>
            </span>
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-400">Diurne</span>
              <span className="font-semibold">{formatOre(classificazione!.diurne)}</span>
            </span>
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-slate-400">Notturne (22–06)</span>
              <span className={`font-semibold ${classificazione!.notturne > 0 ? 'text-indigo-700' : ''}`}>
                {formatOre(classificazione!.notturne)}
              </span>
            </span>
          </div>
          {(classificazione!.notturne > 0 || festivoDelGiorno) && (
            <p className="text-[11px] text-slate-500 mt-2">
              {festivoDelGiorno && <span>Tutte le ore sono su giorno festivo. </span>}
              {classificazione!.notturne > 0 && <span>Ore notturne soggette a maggiorazione.</span>}
            </p>
          )}
        </div>
      )}
      {mostraTimbri && (
        <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 mb-2">Timbrature</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-400">Ingresso</span>
              <span className="font-semibold">{timbroIngresso ? oraDaISO(timbroIngresso) : '—'}</span>
            </span>
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-slate-400">Uscita</span>
              <span className="font-semibold">{timbroUscita ? oraDaISO(timbroUscita) : '—'}</span>
            </span>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {mostraSelectDipendente && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500">Dipendente *</label>
            <select
              value={dipendenteId}
              onChange={e => { setDipendenteId(e.target.value); setErrore(''); setModificato(true) }}
              className={`w-full h-10 border rounded-lg px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors ${errore && !dipendenteId ? 'border-red-500' : 'border-gray-200'}`}
            >
              <option value="">— Seleziona —</option>
              {dipendenti!.map(d => (
                <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500">Template</label>
          <div className="flex items-center gap-2">
            {templateSelezionato && (
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: templateSelezionato.colore }} />
            )}
            <select
              value={templateId}
              onChange={e => handleTemplateChange(e.target.value)}
              className="flex-1 h-10 border border-gray-200 rounded-lg px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">— Personalizzato —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id} style={{ backgroundColor: t.colore, color: '#fff' }}>
                  {t.nome} ({t.ora_inizio.slice(0,5)}–{t.ora_fine.slice(0,5)})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ora inizio" type="time" value={oraInizio} onChange={e => { setOraInizio(e.target.value); setModificato(true) }} />
          <Input label="Ora fine" type="time" value={oraFine} onChange={e => { setOraFine(e.target.value); setModificato(true) }} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500">
            Posto di servizio {isRiposo ? <span className="text-gray-400 normal-case tracking-normal">(facoltativo)</span> : '*'}
          </label>
          <select
            value={postoId}
            onChange={e => { setPostoId(e.target.value); setErrore(''); setModificato(true) }}
            className={`w-full h-10 border rounded-lg px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors ${errore ? 'border-red-500' : 'border-gray-200'}`}
          >
            <option value="">— Seleziona —</option>
            {postiAttivi.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          {errore && <p className="text-xs text-red-600 mt-1">{errore}</p>}
        </div>
        <Input label="Note (opzionale)" value={note} onChange={e => { setNote(e.target.value); setModificato(true) }} placeholder="..." />
      </div>
      <div className="sticky bottom-0 -mx-5 md:-mx-6 -mb-7 md:-mb-6 px-5 md:px-6 pt-4 pb-5 md:pb-4 mt-5 bg-white border-t border-gray-100 flex items-center justify-between gap-3">
        {onDelete && !confermaElimina && (
          <Button variant="danger" size="sm" onClick={() => setConfermaElimina(true)}>Elimina</Button>
        )}
        {onDelete && confermaElimina && (
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={onDelete}>Conferma</Button>
            <button onClick={() => setConfermaElimina(false)} className="text-sm text-gray-500 hover:underline">Annulla</button>
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="secondary" onClick={handleCloseRequest} disabled={salvando}>Annulla</Button>
          <Button onClick={handleSave} disabled={salvando}>{salvando ? 'Salvataggio...' : 'Salva'}</Button>
        </div>
      </div>
    </Modal>
  )
}
