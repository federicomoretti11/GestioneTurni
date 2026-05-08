'use client'
import { useEffect, useState } from 'react'
import { FeatureGate } from '@/components/ui/FeatureGate'

interface CedolinoItem {
  id: string
  nome: string
  mese: string
  dimensione_bytes: number
  created_at: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatMese(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

function CedoliniPage() {
  const [cedolini, setCedolini] = useState<CedolinoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [scaricando, setScaricando] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dipendente/cedolini')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setCedolini(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function scarica(c: CedolinoItem) {
    setScaricando(c.id)
    const res = await fetch(`/api/dipendente/cedolini/${c.id}/url`)
    if (res.ok) {
      const { download_url } = await res.json()
      if (download_url) window.open(download_url, '_blank')
    }
    setScaricando(null)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">I miei cedolini</h1>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}
        </div>
      ) : cedolini.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-900/20 p-8 text-center">
          <p className="text-sm text-slate-400">Nessun cedolino disponibile</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-900/20 divide-y divide-slate-100">
          {cedolini.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-5 py-4">
              <span className="text-2xl shrink-0">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{c.nome}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatMese(c.mese)} · {formatBytes(c.dimensione_bytes)}
                </p>
              </div>
              <button
                onClick={() => scarica(c)}
                disabled={scaricando === c.id}
                className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              >
                {scaricando === c.id ? 'Apertura…' : 'Scarica'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CedoliniPageWrapper() {
  return (
    <FeatureGate modulo="modulo_cedolini_abilitato">
      <CedoliniPage />
    </FeatureGate>
  )
}
