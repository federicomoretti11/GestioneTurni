'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Profile } from '@/lib/types'
import type { ContrattoDipendente } from '@/lib/types'
import type { ContatoreFerieSaldo } from '@/lib/types'

export default function ModificaUtentePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState({ nome: '', cognome: '', ruolo: 'dipendente', attivo: true, includi_in_turni: true, matricola: '' })
  const [contrattiAbilitato, setContrattiAbilitato] = useState(false)
  const [contratto, setContratto] = useState<ContrattoDipendente | null>(null)
  const [contrattoForm, setContrattoForm] = useState({
    tipo: 'full_time',
    ore_settimanali: 40,
    ore_giornaliere: 8,
    data_inizio: '',
  })
  const [salvandoContratto, setSalvandoContratto] = useState(false)
  const [contatoriAbilitato, setContatoriAbilitato] = useState(false)
  const [annoContatori, setAnnoContatori] = useState(new Date().getFullYear())
  const [contatoriSaldo, setContatoriSaldo] = useState<ContatoreFerieSaldo | null>(null)
  const [contatoriForm, setContatoriForm] = useState({ ferie_giorni: 0, permesso_ore: 0, rol_ore: 0 })
  const [salvandoContatori, setSalvandoContatori] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/utenti').then(r => r.json()),
      fetch('/api/impostazioni').then(r => r.json()),
      fetch(`/api/admin/contratti/${id}`).then(r => r.json()),
      fetch(`/api/admin/contatori/${id}?anno=${new Date().getFullYear()}`).then(r => r.json()),
    ]).then(([utenti, imp, c, cnt]: [Profile[], { modulo_contratti_abilitato?: boolean; modulo_ferie_contatori_abilitato?: boolean }, ContrattoDipendente | null, ContatoreFerieSaldo]) => {
      const u = utenti.find(u => u.id === id)
      if (u) setForm({ nome: u.nome, cognome: u.cognome, ruolo: u.ruolo, attivo: u.attivo, includi_in_turni: u.includi_in_turni, matricola: (u as unknown as { matricola?: string }).matricola ?? '' })
      setContrattiAbilitato(imp?.modulo_contratti_abilitato ?? false)
      setContatoriAbilitato(imp?.modulo_ferie_contatori_abilitato ?? false)
      if (c) {
        setContratto(c)
        setContrattoForm({ tipo: c.tipo, ore_settimanali: c.ore_settimanali, ore_giornaliere: c.ore_giornaliere, data_inizio: c.data_inizio })
      }
      if (cnt) {
        setContatoriSaldo(cnt)
        setContatoriForm({ ferie_giorni: cnt.ferie_giorni, permesso_ore: cnt.permesso_ore, rol_ore: cnt.rol_ore })
      }
    }).catch(err => console.error('Errore caricamento dati:', err))
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

  async function cambiaAnnoContatori(nuovoAnno: number) {
    setAnnoContatori(nuovoAnno)
    const res = await fetch(`/api/admin/contatori/${id}?anno=${nuovoAnno}`)
    if (res.ok) {
      const cnt = await res.json() as ContatoreFerieSaldo
      setContatoriSaldo(cnt)
      setContatoriForm({ ferie_giorni: cnt.ferie_giorni, permesso_ore: cnt.permesso_ore, rol_ore: cnt.rol_ore })
    }
  }

  async function salvaContatori(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoContatori(true)
    try {
      const res = await fetch(`/api/admin/contatori/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anno: annoContatori, ...contatoriForm }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        alert(json.error ?? 'Impossibile salvare i contatori.')
        return
      }
    } finally {
      setSalvandoContatori(false)
    }
  }

  async function salvaContratto(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoContratto(true)
    try {
      const res = await fetch(`/api/admin/contratti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contrattoForm),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        alert(json.error ?? 'Impossibile salvare il contratto.')
        return
      }
      const c = await res.json() as ContrattoDipendente
      setContratto(c)
    } finally {
      setSalvandoContratto(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Modifica utente</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
          <Input label="Cognome" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Matricola" value={form.matricola} onChange={e => setForm(f => ({ ...f, matricola: e.target.value.toUpperCase() }))} placeholder="es. RSS0001" />
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
        <div className="border-t pt-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-700">Azioni irreversibili</p>
            <p className="text-xs text-gray-400">Anonimizza mantiene lo storico turni; Elimina cancella tutto.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={anonimizza}>Anonimizza (GDPR)</Button>
            <Button variant="danger" size="sm" type="button" onClick={elimina}>Elimina</Button>
          </div>
        </div>
      </form>
      {contrattiAbilitato && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Contratto</h2>
            {contratto
              ? <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full border border-green-200">✓ Registrato</span>
              : <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-200">Nessun contratto</span>
            }
          </div>
          {!contratto && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              Nessun contratto impostato per questo dipendente.
            </p>
          )}
          <form onSubmit={salvaContratto} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Tipo contratto"
                value={contrattoForm.tipo}
                onChange={e => setContrattoForm(f => ({ ...f, tipo: e.target.value }))}
              >
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="turni_fissi">Turni fissi</option>
                <option value="turni_rotanti">Turni rotanti</option>
              </Select>
              <Input
                label="Data inizio"
                type="date"
                value={contrattoForm.data_inizio}
                onChange={e => setContrattoForm(f => ({ ...f, data_inizio: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ore settimanali"
                type="number"
                min={1}
                max={60}
                step={0.5}
                value={contrattoForm.ore_settimanali}
                onChange={e => setContrattoForm(f => ({ ...f, ore_settimanali: parseFloat(e.target.value) }))}
                required
              />
              <Input
                label="Ore giornaliere"
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={contrattoForm.ore_giornaliere}
                onChange={e => setContrattoForm(f => ({ ...f, ore_giornaliere: parseFloat(e.target.value) }))}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={salvandoContratto}>
                {salvandoContratto ? 'Salvataggio...' : 'Salva contratto'}
              </Button>
            </div>
          </form>
        </div>
      )}
      {contatoriAbilitato && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Ferie e permessi</h2>
            <select
              className="text-sm border border-gray-200 rounded-lg px-2 py-1"
              value={annoContatori}
              onChange={e => cambiaAnnoContatori(parseInt(e.target.value, 10))}
            >
              {[annoContatori - 1, annoContatori, annoContatori + 1].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <form onSubmit={salvaContatori} className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 pb-1">
              <span>Tipo</span><span>Budget</span><span>Usato / Residuo</span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm text-gray-700">Ferie (giorni)</span>
              <Input
                type="number" min={0} max={365} step={0.5}
                value={contatoriForm.ferie_giorni}
                onChange={e => setContatoriForm(f => ({ ...f, ferie_giorni: parseFloat(e.target.value) }))}
              />
              <span className="text-sm text-gray-600">
                {contatoriSaldo?.ferie_usate ?? 0} / {Math.max(0, contatoriForm.ferie_giorni - (contatoriSaldo?.ferie_usate ?? 0))}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm text-gray-700">Permesso (ore)</span>
              <Input
                type="number" min={0} max={999} step={0.5}
                value={contatoriForm.permesso_ore}
                onChange={e => setContatoriForm(f => ({ ...f, permesso_ore: parseFloat(e.target.value) }))}
              />
              <span className="text-sm text-gray-600">
                {contatoriSaldo?.permesso_usate ?? 0} / {Math.max(0, contatoriForm.permesso_ore - (contatoriSaldo?.permesso_usate ?? 0))}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm text-gray-700">ROL (ore)</span>
              <Input
                type="number" min={0} max={999} step={0.5}
                value={contatoriForm.rol_ore}
                onChange={e => setContatoriForm(f => ({ ...f, rol_ore: parseFloat(e.target.value) }))}
              />
              <span className="text-sm text-gray-400 text-xs">tracking futuro</span>
            </div>
            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={salvandoContatori}>
                {salvandoContatori ? 'Salvataggio...' : 'Salva budget'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
