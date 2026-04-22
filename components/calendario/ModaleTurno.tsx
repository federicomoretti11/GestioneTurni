'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio } from '@/lib/types'

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
  data?: string
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

  return (
    <Modal open={open} onClose={onClose} onCloseRequest={handleCloseRequest} title={title}>
      {data && <p className="text-sm text-gray-500 mb-4">{data}</p>}
      <div className="space-y-4">
        {mostraSelectDipendente && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dipendente *</label>
            <select
              value={dipendenteId}
              onChange={e => { setDipendenteId(e.target.value); setErrore(''); setModificato(true) }}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errore && !dipendenteId ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">— Seleziona —</option>
              {dipendenti!.map(d => (
                <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
          <div className="flex items-center gap-2">
            {templateSelezionato && (
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: templateSelezionato.colore }} />
            )}
          <select
            value={templateId}
            onChange={e => handleTemplateChange(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Posto di servizio {isRiposo ? <span className="text-gray-400 font-normal">(facoltativo)</span> : '*'}
          </label>
          <select
            value={postoId}
            onChange={e => { setPostoId(e.target.value); setErrore(''); setModificato(true) }}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errore ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">— Seleziona —</option>
            {postiAttivi.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          {errore && <p className="text-xs text-red-600 mt-1">{errore}</p>}
        </div>
        <Input label="Note (opzionale)" value={note} onChange={e => { setNote(e.target.value); setModificato(true) }} placeholder="..." />
        <div className="flex justify-between pt-2">
          {onDelete && !confermaElimina && (
            <Button variant="danger" onClick={() => setConfermaElimina(true)}>Elimina</Button>
          )}
          {onDelete && confermaElimina && (
            <div className="flex items-center gap-2">
              <Button variant="danger" onClick={onDelete}>Conferma eliminazione</Button>
              <button onClick={() => setConfermaElimina(false)} className="text-sm text-gray-500 hover:underline">Annulla</button>
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" onClick={handleCloseRequest} disabled={salvando}>Annulla</Button>
            <Button onClick={handleSave} disabled={salvando}>{salvando ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
