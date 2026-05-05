'use client'
import { useState } from 'react'
import type { TipoRichiesta, PermessoTipo } from '@/lib/types'

interface Props {
  tipo: Exclude<TipoRichiesta, 'cambio_turno' | 'sblocco_checkin'>
  onClose: () => void
  onSuccess: () => void
}

export function FormNuovaRichiesta({ tipo, onClose, onSuccess }: Props) {
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [openEnded, setOpenEnded] = useState(false)
  const [permessoTipo, setPermessoTipo] = useState<PermessoTipo>('giornata')
  const [oraInizio, setOraInizio] = useState('')
  const [oraFine, setOraFine] = useState('')
  const [note, setNote] = useState('')
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)

  function dataMin(): string {
    const ora = new Date()
    const leadMap: Record<Exclude<TipoRichiesta, 'cambio_turno' | 'sblocco_checkin'>, number> = {
      ferie: 7, permesso: 1, malattia: 0,
    }
    ora.setDate(ora.getDate() + leadMap[tipo])
    return ora.toISOString().slice(0, 10)
  }

  async function invia() {
    setErrore('')
    if (!dataInizio) { setErrore('Inserisci la data di inizio'); return }
    if (tipo === 'ferie' && !dataFine) { setErrore('Inserisci la data di fine'); return }
    if (tipo === 'permesso' && permessoTipo === 'ore' && (!oraInizio || !oraFine)) {
      setErrore('Inserisci orario inizio e fine'); return
    }

    setLoading(true)
    const body: Record<string, unknown> = {
      tipo,
      data_inizio: dataInizio,
      data_fine: openEnded ? null : (dataFine || null),
      note_dipendente: note || null,
    }
    if (tipo === 'permesso') {
      body.permesso_tipo = permessoTipo
      if (permessoTipo === 'ore') { body.ora_inizio = oraInizio; body.ora_fine = oraFine }
    }

    const res = await fetch('/api/richieste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setErrore(json.error ?? 'Errore invio')
      return
    }
    onSuccess()
  }

  const titolo = {
    ferie: 'Richiesta ferie',
    permesso: 'Richiesta permesso',
    malattia: 'Comunicazione malattia',
  }[tipo]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-2" />
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{titolo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Data inizio */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Data inizio</label>
          <input
            type="date"
            min={dataMin()}
            value={dataInizio}
            onChange={e => setDataInizio(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
          />
        </div>

        {/* Data fine (solo ferie) */}
        {tipo === 'ferie' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data fine</label>
            <input
              type="date"
              min={dataInizio || dataMin()}
              value={dataFine}
              onChange={e => setDataFine(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            />
          </div>
        )}

        {/* Malattia: data fine + checkbox open-ended */}
        {tipo === 'malattia' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data fine prevista</label>
              <input
                type="date"
                min={dataInizio}
                value={dataFine}
                disabled={openEnded}
                onChange={e => setDataFine(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm disabled:opacity-40"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={openEnded}
                onChange={e => setOpenEnded(e.target.checked)}
              />
              Non so ancora quando rientro
            </label>
          </>
        )}

        {/* Permesso: sub-tipo */}
        {tipo === 'permesso' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo permesso</label>
              <select
                value={permessoTipo}
                onChange={e => setPermessoTipo(e.target.value as PermessoTipo)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              >
                <option value="giornata">Giornata intera</option>
                <option value="mezza_mattina">Mezza giornata mattina</option>
                <option value="mezza_pomeriggio">Mezza giornata pomeriggio</option>
                <option value="ore">Ore puntuali</option>
              </select>
            </div>
            {permessoTipo === 'ore' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dalle</label>
                  <input
                    type="time"
                    value={oraInizio}
                    onChange={e => setOraInizio(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Alle</label>
                  <input
                    type="time"
                    value={oraFine}
                    onChange={e => setOraFine(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Note (opzionali)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
            placeholder="Aggiungi una nota..."
          />
        </div>

        {errore && <p className="text-red-600 text-sm">{errore}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            onClick={invia}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Invio...' : 'Invia richiesta'}
          </button>
        </div>
      </div>
    </div>
  )
}
