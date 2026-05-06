'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import type { PostoDiServizio } from '@/lib/types'

const FORM_VUOTO = {
  nome: '', descrizione: '',
  latitudine: '', longitudine: '', raggio_metri: '200', geo_check_abilitato: false,
}

export default function PostiPage() {
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [form, setForm] = useState(FORM_VUOTO)
  const [editing, setEditing] = useState<PostoDiServizio | null>(null)
  const [errore, setErrore] = useState('')

  async function carica() {
    const res = await fetch('/api/posti')
    const data = await res.json()
    setPosti(Array.isArray(data) ? data : [])
  }

  useEffect(() => { carica() }, [])

  function apriModifica(p: PostoDiServizio) {
    setEditing(p)
    setForm({
      nome: p.nome,
      descrizione: p.descrizione ?? '',
      latitudine: p.latitudine != null ? String(p.latitudine) : '',
      longitudine: p.longitudine != null ? String(p.longitudine) : '',
      raggio_metri: String(p.raggio_metri ?? 200),
      geo_check_abilitato: p.geo_check_abilitato ?? false,
    })
    setErrore('')
  }

  function annulla() {
    setEditing(null)
    setForm(FORM_VUOTO)
    setErrore('')
  }

  async function handleSalva(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setErrore('Il nome è obbligatorio'); return }
    const payload = {
      nome: form.nome.trim(),
      descrizione: form.descrizione || null,
      latitudine: form.latitudine ? parseFloat(form.latitudine) : null,
      longitudine: form.longitudine ? parseFloat(form.longitudine) : null,
      raggio_metri: parseInt(form.raggio_metri) || 200,
      geo_check_abilitato: form.geo_check_abilitato,
    }
    if (editing) {
      await fetch(`/api/posti/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, attivo: editing.attivo }),
      })
    } else {
      await fetch('/api/posti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    annulla()
    carica()
  }

  async function toggleAttivo(p: PostoDiServizio) {
    await fetch(`/api/posti/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: p.nome, descrizione: p.descrizione, attivo: !p.attivo,
        latitudine: p.latitudine, longitudine: p.longitudine,
        raggio_metri: p.raggio_metri, geo_check_abilitato: p.geo_check_abilitato,
      }),
    })
    carica()
  }

  async function elimina(p: PostoDiServizio) {
    if (!confirm(`Eliminare "${p.nome}"? L'operazione è irreversibile.`)) return
    const res = await fetch(`/api/posti/${p.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      alert(json.error ?? 'Impossibile eliminare. Verifica che il posto non abbia turni associati.')
      return
    }
    carica()
  }

  const latOk = form.latitudine && !isNaN(parseFloat(form.latitudine))
  const lngOk = form.longitudine && !isNaN(parseFloat(form.longitudine))

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Posti di servizio</h1>

      <form onSubmit={handleSalva} className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        <h2 className="font-semibold text-slate-800">{editing ? 'Modifica posto' : 'Nuovo posto'}</h2>
        <Input
          label="Nome *"
          value={form.nome}
          onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); setErrore('') }}
          placeholder="es. Ingresso principale"
          error={errore}
        />
        <Input
          label="Descrizione (opzionale)"
          value={form.descrizione}
          onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
          placeholder="..."
        />

        <details className="border border-slate-200 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700 select-none">
            Geolocalizzazione GPS
          </summary>
          <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Latitudine"
                type="number"
                step="any"
                value={form.latitudine}
                onChange={e => setForm(f => ({ ...f, latitudine: e.target.value }))}
                placeholder="es. 45.4654"
              />
              <Input
                label="Longitudine"
                type="number"
                step="any"
                value={form.longitudine}
                onChange={e => setForm(f => ({ ...f, longitudine: e.target.value }))}
                placeholder="es. 9.1859"
              />
            </div>
            <Input
              label="Raggio (metri)"
              type="number"
              min="10"
              max="5000"
              value={form.raggio_metri}
              onChange={e => setForm(f => ({ ...f, raggio_metri: e.target.value }))}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.geo_check_abilitato}
                onChange={e => setForm(f => ({ ...f, geo_check_abilitato: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Abilita controllo GPS al check-in</span>
            </label>
            {latOk && lngOk && (
              <a
                href={`https://maps.google.com/?q=${form.latitudine},${form.longitudine}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                Verifica su Google Maps ↗
              </a>
            )}
          </div>
        </details>

        <div className="flex gap-2 justify-end">
          {editing && <Button variant="secondary" type="button" onClick={annulla}>Annulla</Button>}
          <Button type="submit">{editing ? 'Salva modifiche' : 'Aggiungi'}</Button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        {posti.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <p className={`font-medium ${p.attivo ? 'text-slate-800' : 'text-slate-400'}`}>{p.nome}</p>
                {p.geo_check_abilitato && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">GPS</span>
                )}
              </div>
              {p.descrizione && <p className="text-sm text-slate-500">{p.descrizione}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.attivo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {p.attivo ? 'Attivo' : 'Disattivo'}
              </span>
              <button onClick={() => apriModifica(p)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Modifica</button>
              <button onClick={() => toggleAttivo(p)} className="text-sm text-slate-500 hover:text-slate-700">
                {p.attivo ? 'Disattiva' : 'Riattiva'}
              </button>
              <button onClick={() => elimina(p)} className="text-sm text-red-600 hover:text-red-800">Elimina</button>
            </div>
          </div>
        ))}
        {posti.length === 0 && <EmptyState icon="📍" title="Nessun posto di servizio" description="Creane uno per iniziare a pianificare i turni." size="sm" />}
      </div>
    </div>
  )
}
