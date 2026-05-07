'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Richiesta } from '@/lib/types'

interface Conflitto { data: string; turno_id: string; ora_inizio: string; ora_fine: string }
import { CardRichiesta } from '@/components/richieste/CardRichiesta'
import { ModaleApprovaRifiuta } from '@/components/richieste/ModaleApprovaRifiuta'
import { ModaleConflitti } from '@/components/richieste/ModaleConflitti'
import { AlertErrore } from '@/components/ui/AlertErrore'

const STATI_ATTIVI = ['pending', 'approvata_manager']

export default function RichiesteAdminPage() {
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modale, setModale] = useState<{ richiesta: Richiesta; azione: 'approva' | 'rifiuta' | 'convalida' } | null>(null)
  const [conflitti, setConflitti] = useState<Conflitto[] | null>(null)
  const [richiestaConflitto, setRichiestaConflitto] = useState<Richiesta | null>(null)
  const [richiestaRientro, setRichiestaRientro] = useState<Richiesta | null>(null)
  const [dataRientro, setDataRientro] = useState('')
  const [loadingRientro, setLoadingRientro] = useState(false)
  const supabase = createClient()

  const carica = useCallback(async () => {
    setErrore('')
    const params = new URLSearchParams()
    if (filtroStato) params.set('stato', filtroStato)
    if (filtroTipo) params.set('tipo', filtroTipo)
    const res = await fetch(`/api/richieste?${params}`)
    if (res.ok) setRichieste(await res.json())
    else setErrore('Errore nel caricamento delle richieste.')
    setLoading(false)
  }, [filtroStato, filtroTipo])

  useEffect(() => {
    carica()
    const channel = supabase
      .channel('richieste-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste' }, carica)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [carica])

  const [storicoLimit, setStoricoLimit] = useState(10)
  const daDec = richieste.filter(r => STATI_ATTIVI.includes(r.stato))
  const storico = richieste.filter(r => !STATI_ATTIVI.includes(r.stato))

  function actions(r: Richiesta) {
    const isPending = r.stato === 'pending'
    const isAttesaConvalida = r.stato === 'approvata_manager'
    const isFinal = ['approvata','rifiutata','annullata'].includes(r.stato)
    return (
      <div className="flex gap-1 flex-wrap">
        {(isPending || isAttesaConvalida) && (
          <button
            onClick={() => setModale({ richiesta: r, azione: isAttesaConvalida ? 'convalida' : 'approva' })}
            className="text-xs bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700"
          >
            {isAttesaConvalida ? 'Convalida' : 'Approva'}
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
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Richieste dipendenti</h1>

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap">
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)}
          className="border border-slate-900/20 rounded-lg px-2 py-1.5 text-sm bg-white text-slate-700">
          <option value="">Tutti gli stati</option>
          <option value="pending">In attesa</option>
          <option value="approvata_manager">Da convalidare</option>
          <option value="approvata">Approvate</option>
          <option value="rifiutata">Rifiutate</option>
          <option value="annullata">Annullate</option>
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-slate-900/20 rounded-lg px-2 py-1.5 text-sm bg-white text-slate-700">
          <option value="">Tutti i tipi</option>
          <option value="ferie">Ferie</option>
          <option value="permesso">Permesso</option>
          <option value="malattia">Malattia</option>
          <option value="cambio_turno">Cambio turno</option>
          <option value="sblocco_checkin">Sblocco check-in</option>
        </select>
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

      {daDec.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold text-slate-400 mb-3 uppercase tracking-[0.14em]">Da decidere</h2>
          <div className="space-y-3">
            {daDec.map(r => (
              <CardRichiesta key={r.id} richiesta={r} actions={actions(r)} />
            ))}
          </div>
        </section>
      )}

      {storico.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold text-slate-400 mb-3 uppercase tracking-[0.14em]">Storico</h2>
          <div className="space-y-3">
            {storico.slice(0, storicoLimit).map(r => (
              <CardRichiesta key={r.id} richiesta={r} actions={actions(r)} />
            ))}
          </div>
          {storico.length > storicoLimit && (
            <button onClick={() => setStoricoLimit(l => l + 10)}
              className="mt-3 w-full py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
              Carica altri ({storico.length - storicoLimit} rimanenti)
            </button>
          )}
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
              body: JSON.stringify({ azione: 'convalida', sovrascrivi_conflitti: sovrascrivi }),
            })
            setConflitti(null)
            setRichiestaConflitto(null)
            carica()
          }}
        />
      )}
      {richiestaRientro && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4" style={{ boxShadow: '0 4px 24px rgba(15,23,42,.12)' }}>
            <h2 className="font-semibold text-slate-900">Imposta data rientro</h2>
            <p className="text-sm text-slate-600">
              Malattia di {richiestaRientro.profile?.nome} {richiestaRientro.profile?.cognome}
              {' '}dal {richiestaRientro.data_inizio}
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data rientro</label>
              <input type="date" min={richiestaRientro.data_inizio} value={dataRientro}
                onChange={e => setDataRientro(e.target.value)}
                className="w-full border border-slate-900/20 rounded-lg p-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRichiestaRientro(null); setDataRientro('') }}
                className="flex-1 border border-slate-900/20 text-slate-700 text-sm font-medium py-2 rounded-lg">
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
