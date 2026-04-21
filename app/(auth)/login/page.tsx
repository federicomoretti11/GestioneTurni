'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [vistaReset, setVistaReset] = useState(false)
  const [resetInviato, setResetInviato] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email o password non validi'); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { setError('Errore nell\'invio. Controlla l\'email e riprova.'); return }
    setResetInviato(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        {!vistaReset ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Accedi</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Accesso in corso...' : 'Accedi'}
              </button>
              <button type="button" onClick={() => { setVistaReset(true); setError('') }}
                className="w-full text-sm text-blue-600 hover:underline text-center">
                Password dimenticata?
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reimposta password</h1>
            {!resetInviato ? (
              <>
                <p className="text-sm text-gray-500 mb-6">Inserisci la tua email e ti invieremo un link per reimpostare la password.</p>
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Invio in corso...' : 'Invia link di reset'}
                  </button>
                  <button type="button" onClick={() => { setVistaReset(false); setError('') }}
                    className="w-full text-sm text-gray-500 hover:underline text-center">
                    Torna al login
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Abbiamo inviato un link a <strong>{email}</strong>. Controlla la tua casella di posta e segui le istruzioni.
                </p>
                <button onClick={() => { setVistaReset(false); setResetInviato(false); setEmail('') }}
                  className="w-full text-sm text-blue-600 hover:underline text-center">
                  Torna al login
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
