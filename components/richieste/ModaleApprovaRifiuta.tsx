'use client'
import { useState } from 'react'
import type { Richiesta, AzioneRichiesta, TipoRichiesta } from '@/lib/types'
import { formatDateIT } from '@/lib/utils/date'

const TIPO_LABEL: Record<TipoRichiesta, string> = {
  ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', cambio_turno: 'Cambio turno',
}

interface Conflitto {
  data: string
  turno_id: string
  ora_inizio: string
  ora_fine: string
}

interface Props {
  richiesta: Richiesta
  azione: 'approva' | 'rifiuta' | 'convalida'
  onClose: () => void
  onSuccess: () => void
  onConflict?: (conflitti: Conflitto[]) => void
}

export function ModaleApprovaRifiuta({ richiesta, azione, onClose, onSuccess, onConflict }: Props) {
  const [motivazione, setMotivazione] = useState('')
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)

  const titoli = {
    approva:   'Approva richiesta',
    rifiuta:   'Rifiuta richiesta',
    convalida: 'Convalida richiesta',
  }

  async function conferma() {
    setErrore('')
    if (azione === 'rifiuta' && motivazione.trim().length < 5) {
      setErrore('Inserisci una motivazione (min 5 caratteri)')
      return
    }
    setLoading(true)
    const body: { azione: AzioneRichiesta; motivazione?: string } = { azione }
    if (azione === 'rifiuta') body.motivazione = motivazione.trim()

    try {
      const res = await fetch(`/api/richieste/${richiesta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 409) {
        const json = await res.json().catch(() => ({}))
        if ((json as any).conflict && onConflict) {
          onConflict((json as any).conflitti)
          return
        }
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setErrore((json as { error?: string }).error ?? 'Errore')
        return
      }
      onSuccess()
    } catch {
      setErrore('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  const dateTesto = richiesta.data_fine
    ? `${formatDateIT(richiesta.data_inizio)} – ${formatDateIT(richiesta.data_fine)}`
    : formatDateIT(richiesta.data_inizio)

  const nomeDipendente = richiesta.profile
    ? `${richiesta.profile.nome} ${richiesta.profile.cognome}`
    : 'Dipendente'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
        <h2 className="font-bold text-gray-900">{titoli[azione]}</h2>
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p><span className="font-medium">Dipendente:</span> {nomeDipendente}</p>
          <p><span className="font-medium">Tipo:</span> {TIPO_LABEL[richiesta.tipo]}</p>
          <p><span className="font-medium">Date:</span> {dateTesto}</p>
          {richiesta.note_dipendente && (
            <p><span className="font-medium">Note:</span> {richiesta.note_dipendente}</p>
          )}
        </div>

        {azione === 'rifiuta' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Motivazione *</label>
            <textarea
              value={motivazione}
              onChange={e => setMotivazione(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
              placeholder="Specifica il motivo del rifiuto..."
            />
          </div>
        )}

        {errore && <p className="text-red-600 text-sm">{errore}</p>}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg">
            Annulla
          </button>
          <button
            onClick={conferma}
            disabled={loading}
            className={`flex-1 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50 ${
              azione === 'rifiuta' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'Attendere...' : titoli[azione]}
          </button>
        </div>
      </div>
    </div>
  )
}
