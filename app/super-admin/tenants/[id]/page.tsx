'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { TenantDettaglio, PianoTenant } from '@/lib/types'

const PIANO_COLORS: Record<PianoTenant, string> = {
  starter:      'bg-slate-100 text-slate-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise:   'bg-amber-100 text-amber-700',
}

const FLAG_LABELS: Record<string, { label: string; piano: PianoTenant | null }> = {
  gps_checkin_abilitato:       { label: 'GPS Check-in',      piano: 'starter' },
  email_notifiche_abilitato:   { label: 'Email notifiche',   piano: null },
  modulo_tasks_abilitato:      { label: 'Modulo Task',       piano: 'professional' },
  modulo_documenti_abilitato:  { label: 'Modulo Documenti',  piano: 'professional' },
  modulo_cedolini_abilitato:   { label: 'Modulo Cedolini',   piano: 'professional' },
  modulo_analytics_abilitato:  { label: 'Modulo Analytics',  piano: 'professional' },
  modulo_paghe_abilitato:      { label: 'Modulo Paghe',      piano: 'enterprise' },
  modulo_ai_copilot_abilitato: { label: 'AI Copilot',        piano: 'enterprise' },
  white_label_abilitato:       { label: 'White Label',       piano: 'enterprise' },
}

export default function TenantDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const [tenant, setTenant] = useState<TenantDettaglio | null>(null)
  const [loading, setLoading] = useState(true)
  const [pianoDraft, setPianoDraft] = useState<PianoTenant>('starter')
  const [scadenzaDraft, setScadenzaDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [savingPiano, setSavingPiano] = useState(false)
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function carica() {
    setLoading(true)
    setErrore(null)
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}`)
      if (res.status === 404) { setErrore('Tenant non trovato.'); return }
      if (!res.ok) { setErrore('Errore nel caricamento.'); return }
      const data: TenantDettaglio = await res.json()
      setTenant(data)
      setPianoDraft(data.piano)
      setScadenzaDraft(data.piano_scadenza ? data.piano_scadenza.slice(0, 10) : '')
      setNoteDraft(data.piano_note ?? '')
    } catch {
      setErrore('Errore di rete.')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carica() }, [id])

  async function salvaPiano() {
    if (!tenant) return
    setSavingPiano(true)
    const res = await fetch(`/api/super-admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        piano: pianoDraft,
        piano_scadenza: scadenzaDraft || null,
        piano_note: noteDraft || null,
      }),
    })
    if (!res.ok) {
      alert('Errore nel salvataggio del piano.')
      setSavingPiano(false)
      return
    }
    await carica()
    setSavingPiano(false)
  }

  async function toggleFlag(key: string, currentValue: boolean) {
    setTogglingFlag(key)
    setTenant(prev => prev ? {
      ...prev,
      impostazioni: { ...prev.impostazioni, [key]: !currentValue }
    } : prev)
    const res = await fetch(`/api/super-admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: !currentValue }),
    })
    if (!res.ok) {
      // revert on failure
      setTenant(prev => prev ? {
        ...prev,
        impostazioni: { ...prev.impostazioni, [key]: currentValue }
      } : prev)
    }
    setTogglingFlag(null)
  }

  if (loading) return <p className="text-sm text-gray-500 p-6">Caricamento…</p>
  if (errore) return <p className="text-sm text-red-500 p-6">{errore}</p>
  if (!tenant) return null

  const imp = tenant.impostazioni

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/super-admin/tenants" className="text-sm text-slate-500 hover:text-slate-800">← Tenant</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{tenant.nome}</h1>
        <span className="font-mono text-xs text-gray-400">{tenant.slug}</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tenant.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {tenant.attivo ? 'Attivo' : 'Disattivo'}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PIANO_COLORS[tenant.piano]}`}>
          {tenant.piano}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Colonna sinistra ── */}
        <div className="space-y-6">

          {/* Card Piano */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Piano abbonamento</h2>

            <div className="flex gap-2 mb-4">
              {(['starter', 'professional', 'enterprise'] as PianoTenant[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPianoDraft(p)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${
                    pianoDraft === p
                      ? p === 'starter'   ? 'bg-slate-800 text-white border-slate-800'
                      : p === 'professional' ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data scadenza</label>
                <input
                  type="date"
                  value={scadenzaDraft}
                  onChange={e => setScadenzaDraft(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
                <textarea
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Note per uso interno…"
                />
              </div>
            </div>

            <button
              onClick={salvaPiano}
              disabled={savingPiano}
              className="w-full py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {savingPiano ? 'Salvataggio…' : 'Salva piano'}
            </button>
          </div>

          {/* Card Storico */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Storico piano</h2>
            {(tenant.piano_log ?? []).length === 0 ? (
              <p className="text-xs text-gray-400">Nessuna modifica registrata.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {(tenant.piano_log ?? []).map(log => (
                  <li key={log.id} className="py-2.5 flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold capitalize ${PIANO_COLORS[log.piano as PianoTenant] ?? 'bg-gray-100 text-gray-500'}`}>
                      {log.piano}
                    </span>
                    <div className="flex-1 min-w-0">
                      {log.note && <p className="text-xs text-gray-600 truncate">{log.note}</p>}
                      <p className="text-[11px] text-gray-400 font-mono">
                        {new Date(log.created_at).toLocaleString('it-IT')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        {/* ── Colonna destra ── */}
        <div className="space-y-6">

          {/* Card Moduli */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Moduli attivi</h2>
            {imp ? (
              <ul className="space-y-3">
                {Object.entries(FLAG_LABELS).map(([key, meta]) => {
                  const impMap = imp as unknown as Record<string, boolean>
                  const val = impMap[key] ?? false
                  const isToggling = togglingFlag === key
                  return (
                    <li key={key} className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-800">{meta.label}</span>
                        {meta.piano && (
                          <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded capitalize ${PIANO_COLORS[meta.piano]}`}>
                            {meta.piano}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleFlag(key, val)}
                        disabled={isToggling}
                        aria-label={`${meta.label}: ${val ? 'disattiva' : 'attiva'}`}
                        role="switch"
                        aria-checked={val}
                        className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${val ? 'bg-slate-900' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">Impostazioni non trovate.</p>
            )}
          </div>

          {/* Card Utenti */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Utenti</h2>
            <p className="text-2xl font-bold text-slate-900">{tenant.utenti_count}</p>
            <p className="text-xs text-gray-400 mb-3">utenti attivi</p>
            <p className="text-xs text-gray-400 italic">Lista utenti — disponibile prossimamente</p>
          </div>

        </div>
      </div>
    </div>
  )
}
