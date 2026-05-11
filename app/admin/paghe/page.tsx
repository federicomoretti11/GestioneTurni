'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/ui/FeatureGate'

interface RigaConsuntivo {
  dipendente_id: string
  nome: string
  ore_ordinarie: number
  ore_notturne: number
  ore_festive: number
  ore_straordinarie: number
  giorni_ferie: number
  giorni_permesso: number
  giorni_malattia: number
  turni_count: number
}

interface ConsuntivoEsistente {
  id: string
  stato: 'bozza' | 'approvato'
  approvato_at: string | null
  approvato_da_nome: string | null
}

interface DatiConsuntivo {
  mese: string
  consuntivo_esistente: ConsuntivoEsistente | null
  righe: RigaConsuntivo[]
}

interface StoricoItem {
  id: string
  mese: string
  approvato_at: string
  approvato_da_nome: string | null
}

function oreLabel(n: number) {
  return n % 1 === 0 ? `${n}h` : `${n.toFixed(1)}h`
}

function formatData(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatMese(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function PaghePage() {
  const [mese, setMese] = useState<string>(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')
  const [dati, setDati] = useState<DatiConsuntivo | null>(null)
  const [storico, setStorico] = useState<StoricoItem[]>([])
  const [storicoAperto, setStoricoAperto] = useState(false)

  useEffect(() => {
    fetch('/api/admin/paghe/storico')
      .then(r => r.ok ? r.json() : { storico: [] })
      .then(d => {
        setStorico(d.storico ?? [])
        setStoricoAperto((d.storico ?? []).length > 0)
      })
      .catch(() => {})
  }, [])

  async function handleCalcola() {
    if (!mese) return
    setLoading(true); setErrore(''); setDati(null)
    const res = await fetch(`/api/admin/paghe?mese=${mese}`)
    setLoading(false)
    if (!res.ok) { setErrore('Errore nel calcolo. Riprova.'); return }
    setDati(await res.json())
  }

  async function handleApprova() {
    if (!dati) return
    setSalvando(true); setErrore('')
    const res = await fetch('/api/admin/paghe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mese, righe: dati.righe }),
    })
    setSalvando(false)
    if (!res.ok) { setErrore('Errore nel salvataggio.'); return }
    const result = await res.json()
    setDati(prev => prev ? {
      ...prev,
      consuntivo_esistente: { id: result.consuntivo_id, stato: 'approvato', approvato_at: new Date().toISOString(), approvato_da_nome: 'Tu' }
    } : null)
  }

  async function handleExportCsv() {
    if (!dati?.consuntivo_esistente?.id) return
    window.location.href = `/api/admin/paghe/${dati.consuntivo_esistente.id}/csv`
  }

  function handleRiapri(item: StoricoItem) {
    const mesePart = item.mese.slice(0, 7)
    setMese(mesePart)
    setDati(null)
    setLoading(true)
    setErrore('')
    fetch(`/api/admin/paghe?mese=${mesePart}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setDati(d))
      .catch(() => setErrore('Errore nel caricamento.'))
      .finally(() => setLoading(false))
  }

  const totali = dati?.righe.reduce(
    (acc, r) => ({
      ore_ordinarie: acc.ore_ordinarie + r.ore_ordinarie,
      ore_notturne: acc.ore_notturne + r.ore_notturne,
      ore_festive: acc.ore_festive + r.ore_festive,
      ore_straordinarie: acc.ore_straordinarie + r.ore_straordinarie,
      giorni_ferie: acc.giorni_ferie + r.giorni_ferie,
      giorni_permesso: acc.giorni_permesso + r.giorni_permesso,
      giorni_malattia: acc.giorni_malattia + r.giorni_malattia,
      turni_count: acc.turni_count + r.turni_count,
    }),
    { ore_ordinarie: 0, ore_notturne: 0, ore_festive: 0, ore_straordinarie: 0, giorni_ferie: 0, giorni_permesso: 0, giorni_malattia: 0, turni_count: 0 }
  )

  return (
    <FeatureGate modulo="modulo_paghe_abilitato">
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Pre-elaborazione Paghe</h1>

        {storico.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-900/20 overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
            <button
              onClick={() => setStoricoAperto(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-semibold text-slate-900">Storico approvazioni</span>
              <span className="text-slate-400 text-sm">{storicoAperto ? '▲' : '▼'}</span>
            </button>
            {storicoAperto && (
              <div className="border-t border-slate-900/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-2">Mese</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2">Approvato il</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2">Da</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {storico.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-900 capitalize">{formatMese(item.mese)}</td>
                        <td className="px-4 py-3 text-slate-600">{formatData(item.approvato_at)}</td>
                        <td className="px-4 py-3 text-slate-600">{item.approvato_da_nome ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRiapri(item)}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Riapri
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-900/20 p-6 space-y-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
          <div className="flex flex-wrap items-end gap-3">
            <input
              type="month"
              value={mese}
              onChange={e => { setMese(e.target.value); setDati(null) }}
              className="border border-slate-900/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleCalcola} disabled={loading || !mese}>
              {loading ? 'Calcolo...' : 'Calcola'}
            </Button>
          </div>

          {errore && <p className="text-sm text-red-600">{errore}</p>}

          {dati && (
            <div>
              {dati.consuntivo_esistente?.stato === 'approvato' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                  ✓ Approvato il {formatData(dati.consuntivo_esistente.approvato_at!)} da {dati.consuntivo_esistente.approvato_da_nome}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                  Bozza
                </span>
              )}
            </div>
          )}

          {dati && dati.righe.length === 0 && (
            <p className="text-sm text-slate-400 py-6 text-center">Nessun turno confermato per questo mese</p>
          )}

          {dati && dati.righe.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-2">Nome</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-2">Turni</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-2">Ore Ord.</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-2">Ore Nott.</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-2">Ore Fest.</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-2">Ore Straord.</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-2">Ferie</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-2">Permesso</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-2">Malattia</th>
                  </tr>
                </thead>
                <tbody>
                  {dati.righe.map(r => (
                    <tr key={r.dipendente_id}>
                      <td className="px-2 py-2 text-slate-700">{r.nome}</td>
                      <td className="px-2 py-2 text-slate-700">{r.turni_count}</td>
                      <td className="px-2 py-2 text-slate-700">{oreLabel(r.ore_ordinarie)}</td>
                      <td className="px-2 py-2 text-slate-700">{oreLabel(r.ore_notturne)}</td>
                      <td className="px-2 py-2 text-slate-700">{oreLabel(r.ore_festive)}</td>
                      <td className="px-2 py-2 text-slate-700">{oreLabel(r.ore_straordinarie)}</td>
                      <td className="px-2 py-2 text-slate-700">{r.giorni_ferie}gg</td>
                      <td className="px-2 py-2 text-slate-700">{r.giorni_permesso}gg</td>
                      <td className="px-2 py-2 text-slate-700">{r.giorni_malattia}gg</td>
                    </tr>
                  ))}
                  {totali && (
                    <tr className="border-t border-slate-200 font-semibold">
                      <td className="px-2 py-2 text-slate-700">Totale</td>
                      <td className="px-2 py-2 text-slate-700">{totali.turni_count}</td>
                      <td className="px-2 py-2 text-slate-700">{oreLabel(totali.ore_ordinarie)}</td>
                      <td className="px-2 py-2 text-slate-700">{oreLabel(totali.ore_notturne)}</td>
                      <td className="px-2 py-2 text-slate-700">{oreLabel(totali.ore_festive)}</td>
                      <td className="px-2 py-2 text-slate-700">{oreLabel(totali.ore_straordinarie)}</td>
                      <td className="px-2 py-2 text-slate-700">{totali.giorni_ferie}gg</td>
                      <td className="px-2 py-2 text-slate-700">{totali.giorni_permesso}gg</td>
                      <td className="px-2 py-2 text-slate-700">{totali.giorni_malattia}gg</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {dati && dati.consuntivo_esistente?.stato !== 'approvato' && (
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleApprova} disabled={salvando || dati.righe.length === 0}>
                {salvando ? 'Salvataggio...' : 'Approva e salva consuntivo'}
              </Button>
              {dati.consuntivo_esistente?.id && (
                <Button variant="secondary" onClick={handleExportCsv}>Esporta CSV</Button>
              )}
            </div>
          )}

          {dati && dati.consuntivo_esistente?.stato === 'approvato' && dati.consuntivo_esistente?.id && (
            <div className="pt-2">
              <Button variant="secondary" onClick={handleExportCsv}>Esporta CSV</Button>
            </div>
          )}
        </div>
      </div>
    </FeatureGate>
  )
}
