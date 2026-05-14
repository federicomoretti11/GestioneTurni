'use client'
import { useEffect, useState, useRef } from 'react'
import { FeatureGate } from '@/components/ui/FeatureGate'
import { Button } from '@/components/ui/Button'
import type { Cedolino } from '@/lib/types'
import type { Profile } from '@/lib/types'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatMese(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

type CedolinoConProfile = Cedolino & { profile: { nome: string; cognome: string } | null }

function CedoliniPage() {
  const [cedolini, setCedolini] = useState<CedolinoConProfile[]>([])
  const [utenti, setUtenti] = useState<Profile[]>([])
  const [dipendenteId, setDipendenteId] = useState('')
  const [mese, setMese] = useState('')
  const [uploading, setUploading] = useState(false)
  const [errore, setErrore] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function carica() {
    const res = await fetch('/api/admin/cedolini')
    if (res.ok) setCedolini(await res.json())
  }

  async function caricaUtenti() {
    const res = await fetch('/api/utenti')
    if (res.ok) {
      const data: Profile[] = await res.json()
      setUtenti(data.filter(u => u.ruolo === 'dipendente' && u.attivo))
    }
  }

  useEffect(() => { carica(); caricaUtenti() }, [])

  async function uploadCedolino(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !dipendenteId || !mese) {
      setErrore('Seleziona dipendente, mese e file PDF')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setUploading(true)
    setErrore('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dipendente_id', dipendenteId)
    fd.append('mese', mese)
    const res = await fetch('/api/admin/cedolini', { method: 'POST', body: fd })
    if (res.ok) {
      await carica()
    } else {
      const d = await res.json()
      setErrore(d.error ?? 'Errore durante il caricamento')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function elimina(c: CedolinoConProfile) {
    if (!confirm(`Eliminare "${c.nome}"?`)) return
    const res = await fetch(`/api/admin/cedolini/${c.id}`, { method: 'DELETE' })
    if (res.ok) await carica()
  }

  async function scarica(c: CedolinoConProfile) {
    const res = await fetch(`/api/admin/cedolini/${c.id}/url`)
    if (!res.ok) return
    const { download_url } = await res.json()
    if (download_url) window.open(download_url, '_blank')
  }

  // Raggruppa per dipendente
  const grouped = cedolini.reduce((acc, c) => {
    if (!acc[c.dipendente_id]) acc[c.dipendente_id] = { nome: c.profile ? `${c.profile.cognome} ${c.profile.nome}` : c.dipendente_id, cedolini: [] }
    acc[c.dipendente_id].cedolini.push(c)
    return acc
  }, {} as Record<string, { nome: string; cedolini: CedolinoConProfile[] }>)

  const gruppiOrdinati = Object.entries(grouped).sort((a, b) => a[1].nome.localeCompare(b[1].nome))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Cedolini digitali</h1>

      {/* Form upload */}
      <div className="bg-white rounded-xl border border-slate-900/20 p-5 space-y-4">
        <p className="text-sm font-medium text-slate-700">Carica nuovo cedolino</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={dipendenteId}
            onChange={e => setDipendenteId(e.target.value)}
            className="flex-1 h-9 px-3 rounded-lg border border-slate-900/20 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">Seleziona dipendente…</option>
            {utenti.map(u => (
              <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>
            ))}
          </select>
          <input
            type="month"
            value={mese}
            onChange={e => setMese(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-900/20 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={uploadCedolino} />
          <Button
            size="sm"
            disabled={uploading || !dipendenteId || !mese}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Caricamento…' : '+ Carica PDF'}
          </Button>
        </div>
        {errore && <p className="text-sm text-red-600">{errore}</p>}
      </div>

      {/* Lista raggruppata per dipendente */}
      {gruppiOrdinati.length === 0 ? (
        <p className="text-sm text-slate-400 text-center pt-8">Nessun cedolino caricato</p>
      ) : (
        <div className="space-y-4">
          {gruppiOrdinati.map(([dipId, gruppo]) => (
            <div key={dipId} className="bg-white rounded-xl border border-slate-900/20">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{gruppo.nome}</p>
                <p className="text-xs text-slate-400">{gruppo.cedolini.length} cedolino{gruppo.cedolini.length !== 1 ? 'i' : ''}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {gruppo.cedolini.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xl shrink-0">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.nome}</p>
                      <p className="text-xs text-slate-400">
                        {formatMese(c.mese)} · {formatBytes(c.dimensione_bytes)} · {new Date(c.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => scarica(c)} className="text-xs text-blue-600 hover:underline">Scarica</button>
                      <button onClick={() => elimina(c)} className="text-xs text-red-500 hover:underline">Elimina</button>
                    </div>
                  </div>
                ))}
              </div>
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
