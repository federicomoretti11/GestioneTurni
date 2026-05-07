'use client'
import { useState, useEffect } from 'react'
import { TurnoTemplate } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'

const COLORI_PRESET = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

export default function TemplatePage() {
  const [templates, setTemplates] = useState<TurnoTemplate[]>([])
  const [modale, setModale] = useState<{ open: boolean; template?: TurnoTemplate | null }>({ open: false })
  const [form, setForm] = useState({ nome: '', ora_inizio: '08:00', ora_fine: '16:00', colore: '#3b82f6', categoria: 'lavoro' })

  async function carica() {
    const res = await fetch('/api/template')
    setTemplates(await res.json())
  }

  useEffect(() => { carica() }, [])

  function apriNuovo() {
    setForm({ nome: '', ora_inizio: '08:00', ora_fine: '16:00', colore: '#3b82f6', categoria: 'lavoro' })
    setModale({ open: true, template: null })
  }

  function apriModifica(t: TurnoTemplate) {
    setForm({ nome: t.nome, ora_inizio: t.ora_inizio.slice(0, 5), ora_fine: t.ora_fine.slice(0, 5), colore: t.colore, categoria: t.categoria ?? 'lavoro' })
    setModale({ open: true, template: t })
  }

  async function handleSalva() {
    const payload = { nome: form.nome, ora_inizio: form.ora_inizio + ':00', ora_fine: form.ora_fine + ':00', colore: form.colore, categoria: form.categoria }
    if (modale.template) {
      await fetch(`/api/template/${modale.template.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/template', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setModale({ open: false })
    carica()
  }

  async function handleElimina(id: string) {
    if (!confirm('Eliminare questo turno?')) return
    await fetch(`/api/template/${id}`, { method: 'DELETE' })
    carica()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Turni</h1>
        <Button onClick={apriNuovo}>+ Nuovo turno</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-900/20 divide-y divide-slate-100" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        {templates.map(t => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: t.colore }} />
              <span className="font-medium text-slate-800">{t.nome}</span>
              <span className="text-sm text-slate-500">{t.ora_inizio.slice(0,5)} – {t.ora_fine.slice(0,5)}</span>
              {t.categoria && t.categoria !== 'lavoro' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{t.categoria}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => apriModifica(t)}>Modifica</Button>
              <Button variant="danger" size="sm" onClick={() => handleElimina(t.id)}>Elimina</Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && <EmptyState icon="🏷️" title="Nessun turno" description="Crea i tipi di turno ricorrenti per velocizzare la programmazione." size="sm" />}
      </div>
      <Modal open={modale.open} onClose={() => setModale({ open: false })} title={modale.template ? 'Modifica turno' : 'Nuovo turno'}>
        <div className="space-y-4">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="es. Mattina" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ora inizio" type="time" value={form.ora_inizio} onChange={e => setForm(f => ({ ...f, ora_inizio: e.target.value }))} />
            <Input label="Ora fine" type="time" value={form.ora_fine} onChange={e => setForm(f => ({ ...f, ora_fine: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="lavoro">Lavoro (normale)</option>
              <option value="ferie">Ferie</option>
              <option value="permesso">Permesso</option>
              <option value="malattia">Malattia</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colore</label>
            <div className="flex gap-2">
              {COLORI_PRESET.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, colore: c }))}
                  className={`w-7 h-7 rounded-full border-2 ${form.colore === c ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModale({ open: false })}>Annulla</Button>
            <Button onClick={handleSalva}>Salva</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
