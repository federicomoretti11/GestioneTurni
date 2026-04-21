'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Profile } from '@/lib/types'

export default function ModificaUtentePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState({ nome: '', cognome: '', ruolo: 'dipendente', attivo: true })

  useEffect(() => {
    fetch('/api/utenti').then(r => r.json()).then((utenti: Profile[]) => {
      const u = utenti.find(u => u.id === id)
      if (u) setForm({ nome: u.nome, cognome: u.cognome, ruolo: u.ruolo, attivo: u.attivo })
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/utenti/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    router.push('/admin/utenti')
  }

  async function toggleAttivo() {
    await fetch(`/api/utenti/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !form.attivo }),
    })
    setForm(f => ({ ...f, attivo: !f.attivo }))
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Modifica utente</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
          <Input label="Cognome" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
          <select value={form.ruolo} onChange={e => setForm(f => ({ ...f, ruolo: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="dipendente">Dipendente</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex justify-between items-center pt-2">
          <Button variant={form.attivo ? 'danger' : 'secondary'} type="button" onClick={toggleAttivo}>
            {form.attivo ? 'Disattiva utente' : 'Riattiva utente'}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={() => router.back()}>Annulla</Button>
            <Button type="submit">Salva</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
