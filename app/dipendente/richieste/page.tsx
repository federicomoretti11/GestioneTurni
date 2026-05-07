'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Richiesta } from '@/lib/types'
import { CardRichiesta } from '@/components/richieste/CardRichiesta'
import { FormNuovaRichiesta } from '@/components/richieste/FormNuovaRichiesta'
import { AlertErrore } from '@/components/ui/AlertErrore'

export default function RichiesteDipendentePage() {
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [loading, setLoading] = useState(true)
  const [limite, setLimite] = useState(15)
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
    // Segna come lette le notifiche richiesta non lette
    supabase
      .from('notifiche')
      .update({ letta: true })
      .eq('letta', false)
      .in('tipo', ['richiesta_approvata', 'richiesta_rifiutata'])
      .then(() => {})
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
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Le mie richieste</h1>
        <div className="relative">
          <button
            onClick={() => setDropdownAperto(v => !v)}
            className="flex items-center gap-1 bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            + Nuova richiesta ▾
          </button>
          {dropdownAperto && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-900/20 rounded-lg z-10" style={{ boxShadow: '0 4px 16px rgba(15,23,42,.1)' }}>
              {(['ferie', 'permesso', 'malattia'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => apriForm(t)}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 capitalize"
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {errore && <AlertErrore messaggio={errore} onRetry={carica} />}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-900/20 p-4 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-5 bg-gray-200 rounded-full w-20" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && richieste.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-8">Nessuna richiesta inviata.</p>
      )}

      {richieste.slice(0, limite).map(r => (
        <CardRichiesta key={r.id} richiesta={r} onCancella={cancella} />
      ))}
      {richieste.length > limite && (
        <button onClick={() => setLimite(l => l + 15)}
          className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
          Carica altri ({richieste.length - limite} rimanenti)
        </button>
      )}

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
