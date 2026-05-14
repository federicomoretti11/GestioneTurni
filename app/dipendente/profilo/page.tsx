'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Profile } from '@/lib/types'
import type { ContatoreFerieSaldo } from '@/lib/types'

export default function ProfiloPage() {
  const [profilo, setProfilo] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ vecchia: '', nuova: '', conferma: '' })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState('')
  const supabase = createClient()
  const [contatoriAbilitato, setContatoriAbilitato] = useState(false)
  const [contatori, setContatori] = useState<ContatoreFerieSaldo | null>(null)
  const annoCorrente = new Date().getFullYear()
  const [indisponibilitaAbilitato, setIndisponibilitaAbilitato] = useState(false)
  const [indisponibilita, setIndisponibilita] = useState<Array<{ id: string; data_inizio: string; data_fine: string; motivo: string | null }>>([])
  const [formIndisp, setFormIndisp] = useState({ data_inizio: '', data_fine: '', motivo: '' })
  const [salvandoIndisp, setSalvandoIndisp] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => data),
        fetch('/api/impostazioni').then(r => r.json()),
        fetch(`/api/admin/contatori/${user.id}?anno=${new Date().getFullYear()}`).then(r => r.json()),
        fetch(`/api/indisponibilita?from=${new Date().toISOString().split('T')[0]}`).then(r => r.json()),
      ]).then(([p, imp, cnt, indisp]: [Profile | null, Record<string, boolean>, ContatoreFerieSaldo, Array<{ id: string; data_inizio: string; data_fine: string; motivo: string | null }>]) => {
        setProfilo(p)
        setContatoriAbilitato(imp?.modulo_ferie_contatori_abilitato ?? false)
        setIndisponibilitaAbilitato(imp?.modulo_indisponibilita_abilitato ?? false)
        if (cnt) setContatori(cnt)
        setIndisponibilita(Array.isArray(indisp) ? indisp : [])
      }).catch(err => console.error('Errore caricamento profilo:', err))
    })
  }, [])

  async function handleCambiaPassword(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')
    setSuccesso('')

    if (form.nuova.length < 6) { setErrore('La nuova password deve essere di almeno 6 caratteri.'); return }
    if (form.nuova !== form.conferma) { setErrore('Le password non coincidono.'); return }

    setLoading(true)

    // Verifica la password attuale
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: form.vecchia })
    if (authError) { setErrore('La password attuale non è corretta.'); setLoading(false); return }

    const { error } = await supabase.auth.updateUser({ password: form.nuova })
    setLoading(false)

    if (error) { setErrore('Errore durante il cambio password. Riprova.'); return }
    setSuccesso('Password aggiornata con successo.')
    setForm({ vecchia: '', nuova: '', conferma: '' })
  }

  async function aggiungiIndisponibilita(e: React.FormEvent) {
    e.preventDefault()
    if (!formIndisp.data_inizio || !formIndisp.data_fine) return
    setSalvandoIndisp(true)
    try {
      const res = await fetch('/api/indisponibilita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_inizio: formIndisp.data_inizio,
          data_fine: formIndisp.data_fine,
          motivo: formIndisp.motivo || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        alert(j.error ?? 'Errore durante il salvataggio.')
        return
      }
      const nuova = await res.json()
      setIndisponibilita(prev => [...prev, nuova].sort((a, b) => a.data_inizio.localeCompare(b.data_inizio)))
      setFormIndisp({ data_inizio: '', data_fine: '', motivo: '' })
    } finally {
      setSalvandoIndisp(false)
    }
  }

  async function eliminaIndisponibilita(id: string) {
    await fetch(`/api/indisponibilita/${id}`, { method: 'DELETE' })
    setIndisponibilita(prev => prev.filter(i => i.id !== id))
  }

  if (!profilo) return null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Il mio profilo</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Colonna sinistra */}
        <div className="space-y-6">

          {/* Dati personali */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-6 space-y-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
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

          {/* Ferie e permessi */}
          {contatoriAbilitato && contatori && (
            <div className="bg-white rounded-xl border border-slate-900/20 p-6 space-y-3" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
              <h2 className="font-semibold text-slate-800">Ferie e permessi {annoCorrente}</h2>
              <div className="space-y-2">
                {[
                  { label: 'Ferie', usate: contatori.ferie_usate, totale: contatori.ferie_giorni, unita: 'gg' },
                  { label: 'Permesso', usate: contatori.permesso_usate, totale: contatori.permesso_ore, unita: 'h' },
                  { label: 'ROL', usate: contatori.rol_usate, totale: contatori.rol_ore, unita: 'h' },
                ].map(({ label, usate, totale, unita }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{label}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${totale > 0 ? Math.min(100, (usate / totale) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700 w-20 text-right">
                        {usate}/{totale} {unita}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cambio password */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-6" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
            <h2 className="font-semibold text-slate-800 mb-4">Cambia password</h2>
            <form onSubmit={handleCambiaPassword} className="space-y-4">
              <Input
                label="Password attuale"
                type="password"
                value={form.vecchia}
                onChange={e => setForm(f => ({ ...f, vecchia: e.target.value }))}
                required
              />
              <Input
                label="Nuova password"
                type="password"
                value={form.nuova}
                onChange={e => setForm(f => ({ ...f, nuova: e.target.value }))}
                required
              />
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

        {/* Colonna destra */}
        <div className="space-y-6">

          {/* Indisponibilità */}
          {indisponibilitaAbilitato && (
            <div className="bg-white rounded-xl border border-slate-900/20 p-6 space-y-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
              <h2 className="font-semibold text-slate-800">Le mie indisponibilità</h2>

              {indisponibilita.length === 0 ? (
                <p className="text-sm text-slate-500">Nessuna indisponibilità futura segnalata.</p>
              ) : (
                <ul className="space-y-2">
                  {indisponibilita.map(i => (
                    <li key={i.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-red-900">
                          {i.data_inizio === i.data_fine
                            ? new Date(i.data_inizio + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
                            : `${new Date(i.data_inizio + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })} – ${new Date(i.data_fine + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`
                          }
                        </span>
                        {i.motivo && <p className="text-xs text-red-700 mt-0.5">{i.motivo}</p>}
                      </div>
                      <button
                        onClick={() => eliminaIndisponibilita(i.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium ml-3"
                      >
                        Rimuovi
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={aggiungiIndisponibilita} className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700">Aggiungi indisponibilità</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Dal</label>
                    <input
                      type="date"
                      value={formIndisp.data_inizio}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setFormIndisp(f => ({ ...f, data_inizio: e.target.value }))}
                      required
                      className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Al</label>
                    <input
                      type="date"
                      value={formIndisp.data_fine}
                      min={formIndisp.data_inizio || new Date().toISOString().split('T')[0]}
                      onChange={e => setFormIndisp(f => ({ ...f, data_fine: e.target.value }))}
                      required
                      className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Motivo (opzionale)</label>
                  <input
                    type="text"
                    value={formIndisp.motivo}
                    onChange={e => setFormIndisp(f => ({ ...f, motivo: e.target.value }))}
                    placeholder="es. visita medica"
                    className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button type="submit" disabled={salvandoIndisp}>
                  {salvandoIndisp ? 'Salvataggio...' : 'Aggiungi'}
                </Button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
