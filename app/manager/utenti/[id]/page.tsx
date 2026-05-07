'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Profile } from '@/lib/types'

export default function ModificaUtenteManagerPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState({ nome: '', cognome: '', ruolo: 'dipendente', attivo: true, includi_in_turni: true })

  useEffect(() => {
    fetch('/api/utenti').then(r => r.json()).then((utenti: Profile[]) => {
      const u = utenti.find(u => u.id === id)
      if (u) setForm({ nome: u.nome, cognome: u.cognome, ruolo: u.ruolo, attivo: u.attivo, includi_in_turni: u.includi_in_turni })
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/utenti/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    router.push('/manager/utenti')
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
    <div className="max-w-2xl space-y-4">
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
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-700">Includi nella programmazione turni</p>
            <p className="text-xs text-gray-400 mt-0.5">Se attivo, appare nella griglia di pianificazione</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, includi_in_turni: !f.includi_in_turni }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${form.includi_in_turni ? 'bg-green-500' : 'bg-gray-300'}`}
            aria-label="Includi nella programmazione turni"
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${form.includi_in_turni ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
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
