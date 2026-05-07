'use client'
import { useEffect, useState } from 'react'

interface Tenant {
  id: string
  nome: string
  slug: string
  attivo: boolean
  created_at: string
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [modificando, setModificando] = useState<string | null>(null)
  const [nomeEdit, setNomeEdit] = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [form, setForm] = useState({
    nome: '', slug: '', email_admin: '', password_admin: '', nome_admin: '', cognome_admin: '',
  })

  async function carica() {
    const res = await fetch('/api/super-admin/tenants')
    if (res.ok) setTenants(await res.json())
    setLoading(false)
  }

  useEffect(() => { carica() }, [])

  function onNomeChange(nome: string) {
    const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setForm(f => ({ ...f, nome, slug }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrore('')
    const res = await fetch('/api/super-admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ nome: '', slug: '', email_admin: '', password_admin: '', nome_admin: '', cognome_admin: '' })
      carica()
    } else {
      const d = await res.json()
      setErrore(d.error ?? 'Errore')
    }
    setSaving(false)
  }

  async function elimina(tenant: Tenant) {
    if (!confirm(`Eliminare "${tenant.nome}"?\n\nQuesta azione è irreversibile: verranno cancellati tutti i dati e gli utenti del tenant.`)) return
    setEliminando(tenant.id)
    await fetch(`/api/super-admin/tenants?id=${tenant.id}`, { method: 'DELETE' })
    setEliminando(null)
    carica()
  }

  async function toggleAttivo(tenant: Tenant) {
    await fetch('/api/super-admin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tenant.id, attivo: !tenant.attivo }),
    })
    carica()
  }

  function avviaModifica(tenant: Tenant) {
    setModificando(tenant.id)
    setNomeEdit(tenant.nome)
  }

  async function salvaModifica(id: string) {
    setSalvandoEdit(true)
    await fetch('/api/super-admin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nome: nomeEdit }),
    })
    setSalvandoEdit(false)
    setModificando(null)
    carica()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Tenant</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Annulla' : '+ Nuovo tenant'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Nuovo tenant</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome azienda *</label>
              <input
                required
                value={form.nome}
                onChange={e => onNomeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Rossi Srl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL) *</label>
              <input
                required
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                pattern="^[a-z0-9-]+$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="rossi-srl"
              />
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-3">Utente admin (opzionale — puoi crearlo dopo)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input value={form.nome_admin} onChange={e => setForm(f => ({ ...f, nome_admin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cognome</label>
                <input value={form.cognome_admin} onChange={e => setForm(f => ({ ...f, cognome_admin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email_admin} onChange={e => setForm(f => ({ ...f, email_admin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input type="password" value={form.password_admin} onChange={e => setForm(f => ({ ...f, password_admin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
          {errore && <p className="text-sm text-red-600">{errore}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creazione…' : 'Crea tenant'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Creato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stato</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {modificando === t.id ? (
                      <input
                        autoFocus
                        value={nomeEdit}
                        onChange={e => setNomeEdit(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') salvaModifica(t.id); if (e.key === 'Escape') setModificando(null) }}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                      />
                    ) : t.nome}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{t.slug}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {t.attivo ? 'Attivo' : 'Disattivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-3">
                    {modificando === t.id ? (
                      <>
                        <button onClick={() => salvaModifica(t.id)} disabled={salvandoEdit}
                          className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-40">
                          {salvandoEdit ? 'Salvo…' : 'Salva'}
                        </button>
                        <button onClick={() => setModificando(null)}
                          className="text-xs text-gray-500 hover:text-gray-800 underline">
                          Annulla
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => avviaModifica(t)}
                          className="text-xs text-blue-500 hover:text-blue-700 underline">
                          Modifica
                        </button>
                        <button onClick={() => toggleAttivo(t)}
                          className="text-xs text-gray-500 hover:text-gray-800 underline">
                          {t.attivo ? 'Disattiva' : 'Attiva'}
                        </button>
                        <button onClick={() => elimina(t)} disabled={eliminando === t.id}
                          className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-40">
                          {eliminando === t.id ? 'Eliminazione…' : 'Elimina'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Nessun tenant</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
