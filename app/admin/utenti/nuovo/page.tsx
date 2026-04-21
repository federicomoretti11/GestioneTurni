'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function NuovoUtentePage() {
  const router = useRouter()
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '', ruolo: 'dipendente' })
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')
    const res = await fetch('/api/utenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { const d = await res.json(); setErrore(d.error); return }
    router.push('/admin/utenti')
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Nuovo utente</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
          <Input label="Cognome" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} required />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
          <select value={form.ruolo} onChange={e => setForm(f => ({ ...f, ruolo: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="dipendente">Dipendente</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {errore && <p className="text-sm text-red-600">{errore}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>Annulla</Button>
          <Button type="submit">Crea utente</Button>
        </div>
      </form>
    </div>
  )
}
