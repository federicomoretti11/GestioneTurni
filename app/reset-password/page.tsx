'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'
import { Footer } from '@/components/layout/Footer'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [linkError, setLinkError] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Controlla se il link era scaduto (redirectato dal callback con errore)
    if (searchParams.get('error') === 'link_scaduto') {
      setLinkError(true)
      return
    }

    // La sessione è già stata impostata dalla route /auth/callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else setLinkError(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Le password non coincidono.'); return }
    if (password.length < 6) { setError('La password deve essere di almeno 6 caratteri.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('Errore durante il salvataggio. Riprova.'); return }
    await supabase.auth.signOut()
    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
      <div className="flex flex-col items-center mb-8 gap-3">
        <Logo size={80} variant="dark" />
        <span className="text-xl font-bold text-gray-900 tracking-tight">Opero Hub</span>
      </div>

      {linkError ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-red-600 font-medium">Link scaduto o non valido.</p>
          <p className="text-sm text-gray-500">Richiedi un nuovo link dalla pagina di accesso.</p>
          <button onClick={() => router.push('/login')}
            className="w-full text-sm text-blue-600 hover:underline">
            Torna al login
          </button>
        </div>
      ) : done ? (
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium text-gray-800">Password aggiornata.</p>
          <p className="text-sm text-gray-500">Verrai reindirizzato al login…</p>
        </div>
      ) : !ready ? (
        <p className="text-sm text-gray-400 text-center py-4">Verifica in corso…</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuova password</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nuova password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conferma password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Salvataggio…' : 'Salva password'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center">
        <Suspense fallback={
          <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm text-center text-sm text-gray-400">
            Caricamento…
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
      <Footer />
    </div>
  )
}
