'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Richiesta } from '@/lib/types'
import { CardRichiesta } from '@/components/richieste/CardRichiesta'
import { FormNuovaRichiesta } from '@/components/richieste/FormNuovaRichiesta'

export default function RichiesteDipendentePage() {
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [formAperto, setFormAperto] = useState(false)
  const [tipoForm, setTipoForm] = useState<'ferie' | 'permesso' | 'malattia' | null>(null)
  const [dropdownAperto, setDropdownAperto] = useState(false)
  const supabase = createClient()

  const carica = useCallback(async () => {
    setErrore('')
    const res = await fetch('/api/richieste')
    if (!res.ok) { setErrore('Errore caricamento'); setLoading(false); return }
    setRichieste(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    carica()
    const channel = supabase
      .channel('richieste-dipendente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste' }, carica)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [carica])

  async function cancella(id: string) {
    if (!confirm('Annullare questa richiesta?')) return
    await fetch(`/api/richieste/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'cancella' }),
    })
    carica()
  }

  function apriForm(tipo: 'ferie' | 'permesso' | 'malattia') {
    setTipoForm(tipo)
    setFormAperto(true)
    setDropdownAperto(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Le mie richieste</h1>
        <div className="relative">
          <button
            onClick={() => setDropdownAperto(v => !v)}
            className="flex items-center gap-1 bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            + Nuova richiesta ▾
          </button>
          {dropdownAperto && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {(['ferie', 'permesso', 'malattia'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => apriForm(t)}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 capitalize"
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {errore && <p className="text-red-600 text-sm">{errore}</p>}
      {loading && <p className="text-gray-500 text-sm">Caricamento...</p>}

      {!loading && richieste.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">Nessuna richiesta inviata.</p>
      )}

      {richieste.map(r => (
        <CardRichiesta key={r.id} richiesta={r} onCancella={cancella} />
      ))}

      {formAperto && tipoForm && (
        <FormNuovaRichiesta
          tipo={tipoForm}
          onClose={() => setFormAperto(false)}
          onSuccess={() => { setFormAperto(false); carica() }}
        />
      )}
    </div>
  )
}
