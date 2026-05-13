'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface VoceAudit {
  id: string
  tabella: string
  record_id: string
  azione: string
  utente: { nome: string; cognome: string } | null
  dettagli: Record<string, unknown> | null
  created_at: string
}

const AZIONE_CONFIG: Record<string, { label: string; color: string }> = {
  creato:            { label: 'Creato',       color: 'bg-blue-100 text-blue-700'   },
  modificato:        { label: 'Modificato',   color: 'bg-amber-100 text-amber-700' },
  eliminato:         { label: 'Eliminato',    color: 'bg-red-100 text-red-700'     },
  approvata:         { label: 'Approvata',    color: 'bg-green-100 text-green-700' },
  approvata_manager: { label: 'Appr. mgr',   color: 'bg-teal-100 text-teal-700'   },
  rifiutata:         { label: 'Rifiutata',    color: 'bg-red-100 text-red-700'     },
  annullata:         { label: 'Annullata',    color: 'bg-gray-100 text-gray-500'   },
  comunicata:        { label: 'Comunicata',   color: 'bg-purple-100 text-purple-700'},
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function DettagliChip({ dettagli }: { dettagli: Record<string, unknown> | null }) {
  if (!dettagli) return null
  const items = Object.entries(dettagli).filter(([, v]) => v != null && v !== '')
  if (!items.length) return null
  return (
    <span className="text-xs text-gray-500">
      {items.map(([k, v]) => `${k}: ${v}`).join(' · ')}
    </span>
  )
}

export default function AuditPage() {
  const [voci, setVoci] = useState<VoceAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTabella, setFiltroTabella] = useState('')
  const [emailMsg, setEmailMsg] = useState('')

  const carica = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '200' })
    if (filtroTabella) params.set('tabella', filtroTabella)
    const res = await fetch(`/api/audit?${params}`)
    if (res.ok) setVoci(await res.json())
    setLoading(false)
  }, [filtroTabella])

  useEffect(() => { carica() }, [carica])

  async function handleTestEmail() {
    setEmailMsg('')
    const res = await fetch('/api/admin/test-email', { method: 'POST' })
    const d = await res.json()
    setEmailMsg(res.ok ? `Email inviata a ${d.sentTo}` : d.error ?? 'Errore')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link href="/admin/impostazioni" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">← Impostazioni</Link>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Audit log</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestEmail}
            className="text-sm border border-slate-900/20 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors text-slate-600"
          >
            Test email
          </button>
          {emailMsg && <span className="text-xs text-slate-600">{emailMsg}</span>}
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={filtroTabella}
          onChange={e => setFiltroTabella(e.target.value)}
          className="border border-slate-900/20 rounded-lg px-2 py-1.5 text-sm bg-white text-slate-700"
        >
          <option value="">Tutto</option>
          <option value="turni">Turni</option>
          <option value="richieste">Richieste</option>
        </select>
      </div>

      {loading && <p className="text-sm text-slate-400">Caricamento…</p>}

      <div className="bg-white rounded-xl border border-slate-900/20 divide-y divide-slate-100" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        {voci.map(v => {
          const cfg = AZIONE_CONFIG[v.azione] ?? { label: v.azione, color: 'bg-slate-100 text-slate-600' }
          const attore = v.utente ? `${v.utente.nome} ${v.utente.cognome}` : 'Sistema'
          return (
            <div key={v.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/50">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs font-medium text-slate-700 capitalize">{v.tabella.slice(0, -1)}</span>
                  <span className="text-xs text-slate-400 font-mono">{v.record_id.slice(0, 8)}</span>
                  <span className="text-xs text-slate-600">— {attore}</span>
                </div>
                <DettagliChip dettagli={v.dettagli} />
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                {formatDateTime(v.created_at)}
              </span>
            </div>
          )
        })}
        {!loading && voci.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">Nessuna voce registrata</p>
        )}
      </div>
    </div>
  )
}
