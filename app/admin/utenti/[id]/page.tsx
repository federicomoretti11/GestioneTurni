'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
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

  async function elimina() {
    if (!confirm(`Eliminare definitivamente l'utente ${form.nome} ${form.cognome}?\n\nVerranno cancellati tutti i turni e le richieste associate. Questa operazione è irreversibile.`)) return
    const res = await fetch(`/api/utenti/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      alert(json.error ?? 'Impossibile eliminare l\'utente.')
      return
    }
    router.push('/admin/utenti')
  }

  async function anonimizza() {
    if (!confirm(`Anonimizzare ${form.nome} ${form.cognome}?\n\nI dati personali (nome, email) verranno sostituiti con valori anonimi. Lo storico turni verrà mantenuto. Questa operazione è irreversibile.`)) return
    const res = await fetch(`/api/utenti/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonimizza: true }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      alert(json.error ?? 'Impossibile anonimizzare l\'utente.')
      return
    }
    router.push('/admin/utenti')
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Modifica utente</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
          <Input label="Cognome" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} required />
        </div>
        <Select label="Ruolo" value={form.ruolo} onChange={e => setForm(f => ({ ...f, ruolo: e.target.value }))}>
          <option value="dipendente">Dipendente</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </Select>
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            <Button variant={form.attivo ? 'danger' : 'secondary'} type="button" onClick={toggleAttivo}>
              {form.attivo ? 'Disattiva utente' : 'Riattiva utente'}
            </Button>
            <Button variant="danger" type="button" onClick={anonimizza}>Anonimizza (GDPR)</Button>
            <Button variant="danger" type="button" onClick={elimina}>Elimina</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={() => router.back()}>Annulla</Button>
            <Button type="submit">Salva</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
