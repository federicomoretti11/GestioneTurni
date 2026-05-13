'use client'

import { useState } from 'react'

export default function DemoForm() {
  const [nome, setNome] = useState('')
  const [azienda, setAzienda] = useState('')
  const [email, setEmail] = useState('')
  const [dipendenti, setDipendenti] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!nome.trim() || !email.trim() || !azienda.trim() || !dipendenti) {
      setError('Per favore compila tutti i campi prima di inviare.')
      return
    }
    if (!emailRegex.test(email.trim())) {
      setError('Inserisci un indirizzo email valido.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, azienda, dipendenti }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        setError(json.error ?? 'Errore durante l\'invio. Riprova.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(4,93,204,0.2)] mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Richiesta inviata!</h3>
        <p className="mt-2 text-sm text-slate-400">Ti ricontatteremo entro 24 ore lavorative per organizzare la call.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="demo-nome" className="block text-sm text-slate-300 mb-1.5">Nome e cognome</label>
        <input
          id="demo-nome"
          type="text"
          placeholder="Mario Rossi"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="w-full h-11 px-3.5 rounded-md bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#045dcc] focus:ring-2 focus:ring-[rgba(4,93,204,0.3)] transition"
        />
      </div>
      <div>
        <label htmlFor="demo-azienda" className="block text-sm text-slate-300 mb-1.5">Nome azienda</label>
        <input
          id="demo-azienda"
          type="text"
          placeholder="Rossi S.r.l."
          value={azienda}
          onChange={e => setAzienda(e.target.value)}
          className="w-full h-11 px-3.5 rounded-md bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#045dcc] focus:ring-2 focus:ring-[rgba(4,93,204,0.3)] transition"
        />
      </div>
      <div>
        <label htmlFor="demo-email" className="block text-sm text-slate-300 mb-1.5">Email aziendale</label>
        <input
          id="demo-email"
          type="email"
          placeholder="mario@rossi.it"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full h-11 px-3.5 rounded-md bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#045dcc] focus:ring-2 focus:ring-[rgba(4,93,204,0.3)] transition"
        />
      </div>
      <div>
        <label htmlFor="demo-dipendenti" className="block text-sm text-slate-300 mb-1.5">Numero dipendenti (circa)</label>
        <select
          id="demo-dipendenti"
          value={dipendenti}
          onChange={e => setDipendenti(e.target.value)}
          className="w-full h-11 px-3.5 rounded-md bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#045dcc] focus:ring-2 focus:ring-[rgba(4,93,204,0.3)] transition"
        >
          <option value="">Seleziona...</option>
          <option>Meno di 10</option>
          <option>10 – 25</option>
          <option>26 – 50</option>
          <option>Oltre 50</option>
        </select>
      </div>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 inline-flex w-full items-center justify-center h-11 px-5 rounded-md bg-brand-blue hover:opacity-90 text-sm font-medium transition disabled:opacity-60"
      >
        {loading ? 'Invio in corso...' : 'Richiedi una demo'}
      </button>
    </form>
  )
}
