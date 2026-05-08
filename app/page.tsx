'use client'
import Link from 'next/link'
import { useState, FormEvent } from 'react'

/* ─── Icons ─────────────────────────────────────────────── */
const I = (p: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p} />
)
const IconCalendar  = (p: { size?: number }) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18" /><path d="M8 3v4M16 3v4" /></I>
const IconStamp     = (p: { size?: number }) => <I {...p}><rect x="7" y="3" width="10" height="9" rx="1.5" /><rect x="5" y="12" width="14" height="3" rx="1" /><path d="M4 21h16" /></I>
const IconCheck     = (p: { size?: number }) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5L16 9.5" /></I>
const IconDoc       = (p: { size?: number }) => <I {...p}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></I>
const IconTask      = (p: { size?: number }) => <I {...p}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12l2 2 4-4" /><path d="M9 17h4" /></I>
const IconArrow     = (p: { size?: number }) => <I {...p}><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></I>
const IconShield    = (p: { size?: number }) => <I {...p}><path d="M12 2l8 4v6c0 5-4 9-8 10C8 21 4 17 4 12V6l8-4z" /></I>
const IconUsers     = (p: { size?: number }) => <I {...p}><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" /><path d="M19 8v6M16 11h6" /></I>
const IconZap       = (p: { size?: number }) => <I {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></I>

const FEATURES = [
  {
    icon: IconCalendar,
    title: 'Pianificazione turni',
    desc: 'Crea e pubblica i turni in pochi click. La griglia settimanale e mensile ti dà una visione completa del personale, per posto e per dipendente.',
  },
  {
    icon: IconStamp,
    title: 'Sistema di timbratura',
    desc: 'Timbrature GPS con verifica della posizione. I dipendenti timbrano da mobile, tu monitora entrate e uscite in tempo reale.',
  },
  {
    icon: IconCheck,
    title: 'Gestione richieste',
    desc: 'Ferie, permessi e malattia: i dipendenti fanno richiesta direttamente dal portale. Il manager approva con un click, le notifiche partono in automatico.',
  },
  {
    icon: IconDoc,
    title: 'Archivio documenti',
    desc: 'Tutti i documenti aziendali in un unico posto sicuro. Carica, organizza e condividi con i tuoi dipendenti senza email né cartelle condivise.',
  },
  {
    icon: IconTask,
    title: 'Task e comunicazioni',
    desc: 'Assegna compiti, tieni traccia dello stato e comunica con il team tramite @mention. Zero dispersione di informazioni.',
  },
  {
    icon: IconShield,
    title: 'Sicuro e conforme',
    desc: 'Dati ospitati in Europa, accessi protetti e log di audit completi. Conforme GDPR, pronto per qualsiasi ispezione.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Crea il tuo account',
    desc: 'Il tuo spazio di lavoro è pronto in pochi minuti. Aggiungi i dipendenti e configura i posti di servizio.',
  },
  {
    n: '02',
    title: 'Pianifica e pubblica',
    desc: 'Inserisci i turni in bozza, verifica le coperture e pubblica. I dipendenti ricevono notifica immediata.',
  },
  {
    n: '03',
    title: 'Monitora e gestisci',
    desc: 'Timbrature, richieste e documenti — tutto in un unico pannello. Meno email, meno telefonate.',
  },
]

export default function LandingPage() {
  const [nome, setNome] = useState('')
  const [azienda, setAzienda] = useState('')
  const [email, setEmail] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/contatti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, azienda, email, messaggio }),
    })
    setLoading(false)
    if (res.ok) { setSent(true) } else {
      const d = await res.json()
      setError(d.error ?? 'Errore durante l\'invio. Riprova.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-white/5">
        <div className="relative max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src="/logo-extended-white.svg" alt="Opero Hub" className="h-9 w-auto" />
<div className="flex items-center gap-3">
            <Link href="#contatti"
              className="hidden sm:inline-flex text-[13px] text-slate-400 hover:text-white transition">
              Contattaci
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[13px] font-medium transition">
              Accedi <IconArrow size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden"
        style={{ backgroundImage: 'url(/circuit-pattern.svg)', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-36 text-center">
          <img src="/logo-text-white.svg" alt="OPERO HUB" className="h-10 w-auto mx-auto -mt-8 mb-10" />
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[12px] font-mono uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Operations platform
          </div>
          <h1 className="text-[44px] md:text-[64px] leading-[1.04] tracking-tight font-semibold max-w-4xl mx-auto">
            Gestisci la tua azienda,<br />
            <span className="italic font-normal text-indigo-300">senza</span> stress.
          </h1>
          <p className="mt-6 text-[17px] text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Turni, presenze, documenti, task e comunicazioni in un unico portale.
            Meno email, meno telefonate, più controllo.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#contatti"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[15px] font-semibold transition shadow-lg shadow-indigo-900/40">
              Richiedi una demo <IconArrow size={15} />
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[15px] font-medium transition">
              Accedi al portale
            </Link>
          </div>
        </div>
        {/* gradient fade bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
      </section>

      {/* ── FEATURES ── */}
      <section id="funzionalita" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-indigo-400 mb-3">Funzionalità</p>
          <h2 className="text-[34px] md:text-[42px] leading-tight tracking-tight font-semibold">
            Tutto quello che ti serve,<br />in un solo posto
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Ic, title, desc }) => (
            <div key={title}
              className="rounded-2xl bg-slate-800/60 border border-white/5 p-6 hover:border-indigo-500/30 hover:bg-slate-800/90 transition">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-700 ring-1 ring-slate-600 text-indigo-300 mb-4">
                <Ic size={18} />
              </span>
              <h3 className="text-[16px] font-semibold mb-2">{title}</h3>
              <p className="text-[14px] text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section id="come-funziona" className="bg-slate-800/30 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-indigo-400 mb-3">Come funziona</p>
            <h2 className="text-[34px] md:text-[42px] leading-tight tracking-tight font-semibold">
              Operativo in pochi minuti
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-start">
                <span className="text-[48px] font-bold text-slate-700 leading-none mb-4 select-none">{n}</span>
                <h3 className="text-[18px] font-semibold mb-2">{title}</h3>
                <p className="text-[14px] text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-16">
        {[
          { icon: IconUsers,  label: 'Team di ogni dimensione' },
          { icon: IconZap,    label: 'Setup in meno di un giorno' },
          { icon: IconShield, label: 'Dati sicuri e in Europa' },
        ].map(({ icon: Ic, label }) => (
          <div key={label} className="flex items-center gap-3 text-slate-400">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 border border-white/5 text-indigo-400">
              <Ic size={16} />
            </span>
            <span className="text-[14px] font-medium">{label}</span>
          </div>
        ))}
      </section>

      {/* ── CONTACT FORM ── */}
      <section id="contatti" className="bg-slate-800/30 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-6 py-24">
          <div className="text-center mb-10">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-indigo-400 mb-3">Contatti</p>
            <h2 className="text-[34px] md:text-[40px] leading-tight tracking-tight font-semibold">
              Inizia oggi
            </h2>
            <p className="mt-3 text-[15px] text-slate-400">
              Compila il modulo e ti ricontattiamo entro 24 ore.
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl bg-emerald-900/30 border border-emerald-500/20 p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
                <IconCheck size={22} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Messaggio inviato!</h3>
              <p className="text-[14px] text-slate-400">Ti risponderemo il prima possibile.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-medium text-slate-400 mb-1.5">Nome *</label>
                  <input
                    type="text" required value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Mario Rossi"
                    className="w-full h-11 px-3.5 rounded-lg border border-white/10 bg-slate-800 text-[14px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-slate-400 mb-1.5">Azienda</label>
                  <input
                    type="text" value={azienda} onChange={e => setAzienda(e.target.value)}
                    placeholder="Acme S.r.l."
                    className="w-full h-11 px-3.5 rounded-lg border border-white/10 bg-slate-800 text-[14px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-slate-400 mb-1.5">Email *</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="mario@azienda.it"
                  className="w-full h-11 px-3.5 rounded-lg border border-white/10 bg-slate-800 text-[14px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-slate-400 mb-1.5">Messaggio *</label>
                <textarea
                  required rows={4} value={messaggio} onChange={e => setMessaggio(e.target.value)}
                  placeholder="Dicci come possiamo aiutarti…"
                  className="w-full px-3.5 py-3 rounded-lg border border-white/10 bg-slate-800 text-[14px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition resize-none"
                />
              </div>

              {error && (
                <div className="text-[12.5px] text-rose-400 bg-rose-900/20 border border-rose-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-[15px] font-semibold transition inline-flex items-center justify-center gap-2">
                {loading ? 'Invio in corso…' : <><span>Invia messaggio</span><IconArrow size={15} /></>}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/logo-extended-white.svg" alt="Opero Hub" className="h-8 w-auto opacity-60" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-600 text-center">
            © 2026 Opero Hub — S.I.A. S.r.l.s. — P.IVA 14840881008
          </p>
          <Link href="/login"
            className="text-[13px] text-slate-500 hover:text-white transition">
            Accedi al portale →
          </Link>
        </div>
      </footer>

    </div>
  )
}
