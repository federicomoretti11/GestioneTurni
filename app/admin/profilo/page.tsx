'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Profile } from '@/lib/types'

export default function ProfiloAdminPage() {
  const [profilo, setProfilo] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ vecchia: '', nuova: '', conferma: '' })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfilo(data))
    })
  }, [])

  async function handleCambiaPassword(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')
    setSuccesso('')
    if (form.nuova.length < 6) { setErrore('La nuova password deve essere di almeno 6 caratteri.'); return }
    if (form.nuova !== form.conferma) { setErrore('Le password non coincidono.'); return }
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: form.vecchia })
    if (authError) { setErrore('La password attuale non è corretta.'); setLoading(false); return }
    const { error } = await supabase.auth.updateUser({ password: form.nuova })
    setLoading(false)
    if (error) { setErrore('Errore durante il cambio password. Riprova.'); return }
    setSuccesso('Password aggiornata con successo.')
    setForm({ vecchia: '', nuova: '', conferma: '' })
  }

  if (!profilo) return null

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Il mio profilo</h1>

      <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        <h2 className="font-semibold text-slate-800">Dati personali</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Nome</p>
            <p className="font-medium text-slate-900">{profilo.nome}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Cognome</p>
            <p className="font-medium text-slate-900">{profilo.cognome}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Email</p>
          <p className="font-medium text-slate-900">{email}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Ruolo</p>
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
            {profilo.ruolo}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 p-6" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        <h2 className="font-semibold text-slate-800 mb-4">Cambia password</h2>
        <form onSubmit={handleCambiaPassword} className="space-y-4">
          <Input label="Password attuale" type="password" value={form.vecchia} onChange={e => setForm(f => ({ ...f, vecchia: e.target.value }))} required />
          <Input label="Nuova password" type="password" value={form.nuova} onChange={e => setForm(f => ({ ...f, nuova: e.target.value }))} required />
          <Input
            label="Conferma nuova password"
            type="password"
            value={form.conferma}
            onChange={e => setForm(f => ({ ...f, conferma: e.target.value }))}
            required
            error={form.conferma && form.nuova !== form.conferma ? 'Le password non coincidono' : ''}
          />
          {errore && <p className="text-sm text-red-600">{errore}</p>}
          {successo && <p className="text-sm text-green-600">{successo}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Aggiornamento...' : 'Aggiorna password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
