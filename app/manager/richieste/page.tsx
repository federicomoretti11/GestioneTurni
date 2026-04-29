'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Richiesta } from '@/lib/types'

interface Conflitto { data: string; turno_id: string; ora_inizio: string; ora_fine: string }
import { CardRichiesta } from '@/components/richieste/CardRichiesta'
import { ModaleApprovaRifiuta } from '@/components/richieste/ModaleApprovaRifiuta'
import { ModaleConflitti } from '@/components/richieste/ModaleConflitti'

const STATI_ATTIVI = ['pending']

export default function RichiesteManagerPage() {
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modale, setModale] = useState<{ richiesta: Richiesta; azione: 'approva' | 'rifiuta' } | null>(null)
  const [conflitti, setConflitti] = useState<Conflitto[] | null>(null)
  const [richiestaConflitto, setRichiestaConflitto] = useState<Richiesta | null>(null)
  const [richiestaRientro, setRichiestaRientro] = useState<Richiesta | null>(null)
  const [dataRientro, setDataRientro] = useState('')
  const [loadingRientro, setLoadingRientro] = useState(false)
  const supabase = createClient()

  const carica = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroStato) params.set('stato', filtroStato)
    if (filtroTipo) params.set('tipo', filtroTipo)
    const res = await fetch(`/api/richieste?${params}`)
    if (res.ok) setRichieste(await res.json())
    setLoading(false)
  }, [filtroStato, filtroTipo])

  useEffect(() => {
    carica()
    const channel = supabase
      .channel('richieste-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste' }, carica)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [carica])

  const daDec = richieste.filter(r => STATI_ATTIVI.includes(r.stato))
  const storico = richieste.filter(r => !STATI_ATTIVI.includes(r.stato))

  function actions(r: Richiesta) {
    const isPending = r.stato === 'pending'
    const isFinal = ['approvata','rifiutata','annullata','approvata_manager'].includes(r.stato)
    return (
      <div className="flex gap-1 flex-wrap">
        {isPending && (
          <button
            onClick={() => setModale({ richiesta: r, azione: 'approva' })}
            className="text-xs bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700"
          >
            Approva
          </button>
        )}
        {!isFinal && (
          <button
            onClick={() => setModale({ richiesta: r, azione: 'rifiuta' })}
            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md hover:bg-red-200"
          >
            Rifiuta
          </button>
        )}
        {r.tipo === 'malattia' && r.stato === 'comunicata' && !r.data_fine && (
          <button
            onClick={() => setRichiestaRientro(r)}
            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-200"
          >
            Imposta rientro
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-lg font-bold text-gray-900">Richieste dipendenti</h1>

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap">
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="">Tutti gli stati</option>
          <option value="pending">In attesa</option>
          <option value="approvata_manager">Approvate manager</option>
          <option value="approvata">Approvate</option>
          <option value="rifiutata">Rifiutate</option>
          <option value="annullata">Annullate</option>
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="">Tutti i tipi</option>
          <option value="ferie">Ferie</option>
          <option value="permesso">Permesso</option>
          <option value="malattia">Malattia</option>
          <option value="cambio_turno">Cambio turno</option>
          <option value="sblocco_checkin">Sblocco check-in</option>
        </select>
      </div>

      {loading && <p className="text-gray-500 text-sm">Caricamento...</p>}

      {daDec.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Da decidere</h2>
          <div className="space-y-3">
            {daDec.map(r => (
              <CardRichiesta key={r.id} richiesta={r} actions={actions(r)} />
            ))}
          </div>
        </section>
      )}

      {storico.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Storico</h2>
          <div className="space-y-3">
            {storico.map(r => (
              <CardRichiesta key={r.id} richiesta={r} actions={actions(r)} />
            ))}
          </div>
        </section>
      )}

      {modale && (
        <ModaleApprovaRifiuta
          richiesta={modale.richiesta}
          azione={modale.azione}
          onClose={() => setModale(null)}
          onSuccess={() => { setModale(null); carica() }}
          onConflict={(c) => {
            setConflitti(c)
            setRichiestaConflitto(modale.richiesta)
            setModale(null)
          }}
        />
      )}

      {conflitti && richiestaConflitto && (
        <ModaleConflitti
          nomeDipendente={
            richiestaConflitto.profile
              ? `${richiestaConflitto.profile.nome} ${richiestaConflitto.profile.cognome}`
              : 'Dipendente'
          }
          conflitti={conflitti}
          onAnnulla={() => { setConflitti(null); setRichiestaConflitto(null) }}
          onConferma={async (sovrascrivi) => {
            await fetch(`/api/richieste/${richiestaConflitto.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ azione: 'approva', sovrascrivi_conflitti: sovrascrivi }),
            })
            setConflitti(null)
            setRichiestaConflitto(null)
            carica()
          }}
        />
      )}
      {richiestaRientro && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-900">Imposta data rientro</h2>
            <p className="text-sm text-gray-600">
              Malattia di {richiestaRientro.profile?.nome} {richiestaRientro.profile?.cognome}
              {' '}dal {richiestaRientro.data_inizio}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data rientro</label>
              <input type="date" min={richiestaRientro.data_inizio} value={dataRientro}
                onChange={e => setDataRientro(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRichiestaRientro(null); setDataRientro('') }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg">
                Annulla
              </button>
              <button
                disabled={!dataRientro || loadingRientro}
                onClick={async () => {
                  setLoadingRientro(true)
                  await fetch(`/api/richieste/${richiestaRientro.id}/rientro`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data_fine: dataRientro }),
                  })
                  setLoadingRientro(false)
                  setRichiestaRientro(null)
                  setDataRientro('')
                  carica()
                }}
                className="flex-1 bg-purple-600 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50"
              >
                {loadingRientro ? 'Salvataggio...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
