'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
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
    router.push('/manager/utenti')
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Nuovo utente</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-900/20 p-6 space-y-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
          <Input label="Cognome" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} required />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
        <Select label="Ruolo" value={form.ruolo} onChange={e => setForm(f => ({ ...f, ruolo: e.target.value }))}>
          <option value="dipendente">Dipendente</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </Select>
        {errore && <p className="text-sm text-red-600">{errore}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>Annulla</Button>
          <Button type="submit">Crea utente</Button>
        </div>
      </form>
    </div>
  )
}
