'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import type { PostoDiServizio } from '@/lib/types'

export default function PostiPage() {
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [form, setForm] = useState({ nome: '', descrizione: '' })
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
    setForm({ nome: p.nome, descrizione: p.descrizione ?? '' })
    setErrore('')
  }

  function annulla() {
    setEditing(null)
    setForm({ nome: '', descrizione: '' })
    setErrore('')
  }

  async function handleSalva(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setErrore('Il nome è obbligatorio'); return }
    if (editing) {
      await fetch(`/api/posti/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), descrizione: form.descrizione || null, attivo: editing.attivo }),
      })
    } else {
      await fetch('/api/posti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), descrizione: form.descrizione || null }),
      })
    }
    annulla()
    carica()
  }

  async function toggleAttivo(p: PostoDiServizio) {
    await fetch(`/api/posti/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: p.nome, descrizione: p.descrizione, attivo: !p.attivo }),
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

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">Posti di servizio</h1>

      <form onSubmit={handleSalva} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">{editing ? 'Modifica posto' : 'Nuovo posto'}</h2>
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
        <div className="flex gap-2 justify-end">
          {editing && <Button variant="secondary" type="button" onClick={annulla}>Annulla</Button>}
          <Button type="submit">{editing ? 'Salva modifiche' : 'Aggiungi'}</Button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y">
        {posti.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className={`font-medium ${p.attivo ? 'text-gray-800' : 'text-gray-400'}`}>{p.nome}</p>
              {p.descrizione && <p className="text-sm text-gray-500">{p.descrizione}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.attivo ? 'Attivo' : 'Disattivo'}
              </span>
              <button onClick={() => apriModifica(p)} className="text-sm text-blue-600 hover:underline">Modifica</button>
              <button onClick={() => toggleAttivo(p)} className="text-sm text-gray-500 hover:underline">
                {p.attivo ? 'Disattiva' : 'Riattiva'}
              </button>
              <button onClick={() => elimina(p)} className="text-sm text-red-600 hover:underline">Elimina</button>
            </div>
          </div>
        ))}
        {posti.length === 0 && <EmptyState icon="📍" title="Nessun posto di servizio" description="Creane uno per iniziare a pianificare i turni." size="sm" />}
      </div>
    </div>
  )
}
