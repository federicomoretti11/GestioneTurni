'use client'

import { useState, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'

/* ─── Icons ─────────────────────────────────────────────── */
const I = (p: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p} />
)
const IconCalendar = (p: { size?: number }) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18" /><path d="M8 3v4M16 3v4" /></I>
const IconPin      = (p: { size?: number }) => <I {...p}><rect x="7" y="3" width="10" height="9" rx="1.5" /><rect x="5" y="12" width="14" height="3" rx="1" /><path d="M4 21h16" /></I>
const IconCheck    = (p: { size?: number }) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5L16 9.5" /></I>
const IconDoc      = (p: { size?: number }) => <I {...p}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></I>
const IconChat     = (p: { size?: number }) => <I {...p}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12l2 2 4-4" /><path d="M9 17h4" /></I>
const IconArrow    = (p: { size?: number; strokeWidth?: number }) => <I {...p}><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></I>
const IconEye      = (p: { size?: number }) => <I {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></I>
const IconEyeOff   = (p: { size?: number }) => <I {...p}><path d="M3 3l18 18" /><path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.9" /><path d="M6.4 7.5A17 17 0 0 0 2 12s3.5 6 10 6c1.6 0 3-.3 4.2-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></I>
const IconBack     = (p: { size?: number }) => <I {...p}><path d="M15 6l-6 6 6 6" /></I>

const BULLETS = [
  { icon: IconCalendar, label: 'Pianificazione turni' },
  { icon: IconPin,      label: 'Sistema di timbratura' },
  { icon: IconCheck,    label: 'Gestione richieste' },
  { icon: IconDoc,      label: 'Documenti aziendali' },
  { icon: IconChat,     label: 'Task e comunicazioni interne' },
]

export default function LoginPage() {
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email o password non validi'); setLoading(false); return }
    window.location.href = '/home'
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (error) { setError("Errore nell'invio. Controlla l'email e riprova."); return }
    setResetSent(true)
  }

  function goToReset() { setMode('reset'); setError(null); setResetSent(false) }
  function backToLogin() { setMode('login'); setError(null); setResetSent(false) }

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[0.55fr_1fr]">

      {/* ── Colonna sinistra: marketing panel (solo desktop) ── */}
      <aside className="hidden lg:flex relative bg-slate-900 text-white flex-col p-8 xl:p-10">
        <div className="relative z-10 flex flex-col h-full max-w-sm mx-auto w-full">
          <div className="flex justify-center items-center">
            <a href="/"><img src="/logo-extended-white.svg" alt="Opero Hub" className="h-28 w-auto mx-auto" /></a>
          </div>

          <div className="flex-1 flex flex-col justify-center py-12">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-slate-400">
                Operations platform
              </span>
            </div>

            <h1 className="text-[40px] xl:text-[46px] leading-[1.04] tracking-tight font-semibold">
              Gestisci la tua azienda,<br />
              <span className="italic font-normal">senza</span> stress.
            </h1>

            <p className="mt-5 text-[16px] text-slate-300 leading-relaxed">
              Turni, presenze, documenti, task e comunicazioni in un unico portale.
            </p>

            <ul className="mt-9 space-y-3.5">
              {BULLETS.map(({ icon: Ic, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-slate-800 ring-1 ring-slate-700 text-indigo-300 shrink-0">
                    <Ic size={16} />
                  </span>
                  <span className="text-[15px] text-slate-200">{label}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
        <footer className="absolute bottom-6 left-0 right-0 px-8 xl:px-10 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 whitespace-nowrap text-center">
          © 2026 Opero Hub — S.I.A. S.r.l.s. — P.IVA 14840881008
        </footer>
      </aside>

      {/* ── Colonna destra: form ── */}
      <section className="flex flex-col flex-1 bg-[#FAFAF8] min-h-screen"
        style={{ backgroundImage: 'url(/circuit-pattern.svg)', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
        {/* Header mobile */}
        <header className="lg:hidden flex items-center gap-2 px-5 py-5 border-b border-slate-200">
          <a href="/" className="flex items-center gap-2">
            <Logo size={28} variant="dark" />
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">Opero Hub</span>
          </a>
        </header>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10 sm:py-16">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-[28px] tracking-tight text-slate-900 leading-tight font-semibold">
                {mode === 'login' ? 'Accedi al tuo account' : 'Reimposta password'}
              </h2>
              <p className="mt-2 text-[13.5px] text-slate-500">
                {mode === 'login'
                  ? 'Inserisci le tue credenziali per continuare.'
                  : resetSent
                    ? 'Ti abbiamo inviato il link per reimpostare la password.'
                    : "Recupera l'accesso al tuo account in pochi click."}
              </p>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    id="email" type="email" required autoComplete="email"
                    placeholder="nome@azienda.it" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-md border border-slate-300 bg-white text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label htmlFor="password" className="block text-[12.5px] font-medium text-slate-700">Password</label>
                    <button type="button" onClick={goToReset}
                      className="text-[12px] text-indigo-600 hover:text-indigo-700 hover:underline">
                      Password dimenticata?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password" type={showPwd ? 'text' : 'password'} required
                      autoComplete="current-password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-10 rounded-md border border-slate-300 bg-white text-[14px] text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                    />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 text-slate-400 hover:text-slate-700 rounded"
                      aria-label={showPwd ? 'Nascondi password' : 'Mostra password'}>
                      {showPwd ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-[12.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full h-11 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition inline-flex items-center justify-center gap-2">
                  {loading ? 'Accesso in corso…' : <><span>Accedi</span><IconArrow size={14} strokeWidth={2} /></>}
                </button>
              </form>
            ) : resetSent ? (
              <div className="space-y-5">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  <IconCheck size={20} />
                </div>
                <div>
                  <h3 className="text-xl text-slate-900 tracking-tight font-semibold">Link inviato.</h3>
                  <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                    Ti abbiamo inviato un&apos;email con il link per reimpostare la password.
                    Controlla anche la cartella spam.
                  </p>
                </div>
                <button onClick={backToLogin}
                  className="text-[13px] text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1.5">
                  <IconBack size={14} /> Torna al login
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <button type="button" onClick={backToLogin}
                  className="text-[12.5px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 -ml-1">
                  <IconBack size={14} /> Torna al login
                </button>

                <div>
                  <label htmlFor="reset-email" className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    id="reset-email" type="email" required autoComplete="email"
                    placeholder="nome@azienda.it" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-md border border-slate-300 bg-white text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                  <p className="mt-2 text-[12px] text-slate-500 leading-relaxed">
                    Inserisci l&apos;email associata al tuo account. Ti invieremo un link per reimpostare la password.
                  </p>
                </div>

                {error && (
                  <div className="text-[12.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full h-11 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition">
                  {loading ? 'Invio in corso…' : 'Invia link di reset'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer mobile */}
        <footer className="lg:hidden px-5 py-5 border-t border-slate-200 font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 text-center leading-relaxed">
          © 2026 Opero Hub — S.I.A. S.r.l.s.<br />P.IVA 14840881008
        </footer>
      </section>
    </div>
  )
}
