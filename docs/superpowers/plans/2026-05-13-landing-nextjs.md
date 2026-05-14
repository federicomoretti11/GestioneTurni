# Landing Page Next.js — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertire `Opero_Hub_Landing.html` in pagina Next.js pubblica su `app/page.tsx` con form demo che salva lead su Supabase.

**Architecture:** Server Component per il markup statico, Client Component isolato per il form. CSS custom in globals.css, font via next/font già esistente + JetBrains Mono. Middleware aggiornato per servire la landing solo su root domain.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Supabase (service_role), TypeScript.

---

### Task 1: Font JetBrains Mono + classi CSS custom

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Aggiungere JetBrains_Mono in `app/layout.tsx`**

Il layout attuale ha già Inter e Instrument_Serif. Aggiungere JetBrains_Mono e la sua variabile CSS.

Sostituire l'intero file con:

```tsx
import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Opero Hub",
  description: "Opero Hub — gestione turni e operatività aziendale",
  icons: { icon: '/logo.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Aggiungere le classi CSS custom in `app/globals.css`**

Appendere in fondo al file esistente (dopo le righe già presenti):

```css
/* ── Landing page custom classes ── */
html { scroll-behavior: smooth; }

.serif {
  font-family: var(--font-serif), 'Times New Roman', serif;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.01em;
}
.mono {
  font-family: var(--font-mono), ui-monospace, monospace;
}
.dot-grid {
  background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
  background-size: 16px 16px;
}
.hairline { border-color: #e2e8f0; }

.brand-blue  { color: #045dcc; }
.bg-brand-blue  { background-color: #045dcc; }
.bg-brand-dark  { background-color: #010b15; }
.border-brand-blue { border-color: #045dcc; }

.pricing-featured {
  background: #010b15;
  color: white;
  box-shadow: 0 0 0 2px #045dcc, 0 24px 48px -12px rgba(4,93,204,0.25);
}

.faq-item summary { list-style: none; cursor: pointer; }
.faq-item summary::-webkit-details-marker { display: none; }
.faq-item[open] .faq-icon { transform: rotate(45deg); }
.faq-icon { transition: transform 0.2s ease; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 0.5s ease both; }
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(landing): font JetBrains Mono + classi CSS custom"
```

---

### Task 2: Migration tabella demo_requests

**Files:**
- Create: `supabase/migrations/042_demo_requests.sql`

- [ ] **Step 1: Creare il file migration**

```sql
-- supabase/migrations/042_demo_requests.sql
CREATE TABLE IF NOT EXISTS demo_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  azienda     TEXT NOT NULL,
  dipendenti  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nessun tenant_id: sono lead marketing pre-onboarding.
-- Nessuna policy pubblica: accesso solo via service_role dalla API route.
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Applicare la migration su Supabase**

Aprire il SQL Editor su Supabase dashboard e incollare il contenuto del file.

Verifica: la tabella `demo_requests` compare nel Table Editor con RLS abilitato e zero policy pubbliche.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/042_demo_requests.sql
git commit -m "feat(landing): migration tabella demo_requests"
```

---

### Task 3: API route POST /api/demo-request

**Files:**
- Create: `app/api/demo-request/route.ts`

- [ ] **Step 1: Creare la route**

```typescript
// app/api/demo-request/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as {
    nome?: string
    email?: string
    azienda?: string
    dipendenti?: string
  } | null

  if (!body) {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { nome, email, azienda, dipendenti } = body

  if (!nome?.trim() || !email?.trim() || !azienda?.trim() || !dipendenti?.trim()) {
    return NextResponse.json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: 'Indirizzo email non valido' }, { status: 400 })
  }

  const { error } = await createAdminClient()
    .from('demo_requests')
    .insert({
      nome: nome.trim(),
      email: email.trim(),
      azienda: azienda.trim(),
      dipendenti: dipendenti.trim(),
    })

  if (error) {
    console.error('demo_requests insert error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verificare la route manualmente**

Con il server di sviluppo avviato (`npm run dev`), eseguire in un terminale:

```bash
curl -X POST http://localhost:3000/api/demo-request \
  -H "Content-Type: application/json" \
  -d '{"nome":"Test User","email":"test@example.com","azienda":"Test SRL","dipendenti":"10 – 25"}'
```

Risposta attesa: `{"ok":true}`

Verificare che il record appaia nella tabella `demo_requests` su Supabase.

- [ ] **Step 3: Verificare validazione**

```bash
curl -X POST http://localhost:3000/api/demo-request \
  -H "Content-Type: application/json" \
  -d '{"nome":"","email":"non-valida","azienda":"Test","dipendenti":"10"}'
```

Risposta attesa: `{"error":"Tutti i campi sono obbligatori"}` con status 400.

- [ ] **Step 4: Commit**

```bash
git add "app/api/demo-request/route.ts"
git commit -m "feat(landing): API route POST /api/demo-request"
```

---

### Task 4: DemoForm client component

**Files:**
- Create: `app/_components/DemoForm.tsx`

- [ ] **Step 1: Creare il componente**

```tsx
// app/_components/DemoForm.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add "app/_components/DemoForm.tsx"
git commit -m "feat(landing): DemoForm client component"
```

---

### Task 5: Landing page app/page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Sostituire il contenuto di `app/page.tsx`**

```tsx
// app/page.tsx
import DemoForm from './_components/DemoForm'

export default function LandingPage() {
  return (
    <div className="bg-[#FAFAF8] text-slate-900">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-30 bg-[#FAFAF8]/85 backdrop-blur border-b hairline">
        <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-brand-dark text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5 7h14"/><path d="M5 12h9"/><path d="M5 17h14"/>
              </svg>
            </span>
            <span className="font-semibold tracking-tight text-slate-900">Opero Hub</span>
          </a>

          <ul className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <li><a href="#funzionalita" className="hover:text-slate-900 transition">Funzionalità</a></li>
            <li><a href="#prezzi" className="hover:text-slate-900 transition">Prezzi</a></li>
            <li><a href="#faq" className="hover:text-slate-900 transition">FAQ</a></li>
            <li><a href="#contatti" className="hover:text-slate-900 transition">Contatti</a></li>
          </ul>

          <div className="flex items-center gap-2">
            <a href="/login" className="hidden sm:inline-flex items-center h-9 px-3.5 text-sm text-slate-700 hover:text-slate-900 transition">Accedi</a>
            <a href="#demo" className="inline-flex items-center h-9 px-3.5 rounded-md bg-brand-dark text-white text-sm font-medium hover:opacity-90 transition">
              <span className="hidden sm:inline">Richiedi una demo</span>
              <span className="sm:hidden">Demo</span>
            </a>
          </div>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="hidden lg:block absolute right-0 top-24 w-[420px] h-[420px] dot-grid opacity-60 pointer-events-none"
          style={{ maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)' }}
        />

        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-16 sm:pb-24 relative">
          <div className="inline-flex items-center gap-2 mb-6 sm:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
            <span className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Operations platform · Italia</span>
          </div>

          <h1 className="max-w-3xl text-[40px] leading-[1.05] sm:text-6xl sm:leading-[1.02] tracking-tight text-slate-900">
            Gestisci il tuo team,<br/>
            <span className="serif text-slate-900">senza</span> caos.
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
            Turni, presenze, ferie e documenti in un solo posto. Opero Hub semplifica le operazioni quotidiane delle PMI italiane — dall&apos;assegnazione del turno all&apos;export per il commercialista.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
            <a href="#demo" className="inline-flex items-center justify-center h-11 px-5 rounded-md bg-brand-blue text-white text-sm font-medium hover:opacity-90 transition shadow-sm">
              Richiedi una demo
              <svg className="ml-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M13 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="/login" className="inline-flex items-center justify-center h-11 px-5 rounded-md border hairline bg-white text-slate-900 text-sm font-medium hover:bg-slate-50 transition">
              Accedi alla piattaforma
            </a>
          </div>

          <div className="mt-14 sm:mt-20 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-slate-500">
            <span className="mono uppercase tracking-[0.16em] text-slate-400">Usato da team di</span>
            <span className="text-slate-600">Vigilanza</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Ristorazione</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Retail</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Logistica</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Facility management</span>
          </div>
        </div>

        {/* Hero product mockup */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
          <div className="rounded-xl border hairline bg-white overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-2 px-4 h-9 border-b hairline bg-slate-50/60">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              <span className="ml-3 mono text-[11px] text-slate-400">operohub.com</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[360px]">
              <div className="hidden md:flex flex-col gap-1.5 p-4 border-r hairline bg-slate-50/40">
                <div className="h-6 w-24 rounded bg-slate-200/70"></div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-7 rounded bg-brand-dark w-full"></div>
                  <div className="h-7 rounded bg-slate-100 w-full"></div>
                  <div className="h-7 rounded bg-slate-100 w-full"></div>
                  <div className="h-7 rounded bg-slate-100 w-full"></div>
                  <div className="h-7 rounded bg-slate-100 w-3/4"></div>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mono text-[11px] uppercase tracking-[0.16em] text-slate-400">Settimana 18</div>
                    <div className="serif text-3xl text-slate-900 mt-1">Pianificazione turni</div>
                  </div>
                  <div className="hidden sm:flex gap-2">
                    <div className="h-8 w-20 rounded border hairline bg-white"></div>
                    <div className="h-8 w-24 rounded bg-brand-blue"></div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-7 gap-2">
                  {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(g => (
                    <div key={g} className="mono text-[10px] uppercase text-slate-400 tracking-widest">{g}</div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-8 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-12 rounded-full bg-slate-200"></div></div>
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-10 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-9 rounded-full bg-slate-200"></div></div>
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-7 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-12 rounded-full bg-slate-200"></div><div className="h-2 w-8 rounded-full bg-slate-200 mt-1.5"></div></div>
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-9 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-10 rounded-full bg-slate-200"></div></div>
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-12 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-8 rounded-full bg-slate-200"></div><div className="h-2 w-10 rounded-full bg-slate-200 mt-1.5"></div></div>
                  <div className="h-20 rounded-md border hairline bg-slate-50"></div>
                  <div className="h-20 rounded-md border hairline bg-slate-50"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="border-t hairline bg-slate-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { emoji: '📋', title: 'Basta fogli Excel', body: 'Turni copiati, cancellati, smarriti. Un calendario condiviso e sempre aggiornato, accessibile da qualsiasi dispositivo.' },
              { emoji: '📱', title: 'Timbrature senza carta', body: 'I dipendenti timbrano entrata e uscita dal telefono, con validazione GPS opzionale. Niente fogli firma, niente manomissioni.' },
              { emoji: '💬', title: 'Ferie e permessi tracciati', body: 'Niente richieste via WhatsApp dimenticate. Ogni richiesta ha un flusso di approvazione chiaro e uno storico consultabile.' },
            ].map(({ emoji, title, body }) => (
              <div key={title} className="flex gap-4 items-start p-6 bg-white rounded-xl border hairline">
                <span className="mt-0.5 text-2xl">{emoji}</span>
                <div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funzionalita" className="border-t hairline bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ Funzionalità</div>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
              Tutto quello che serve, <span className="serif">niente di più.</span>
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Moduli pensati per chi gestisce piccoli e medi team operativi. Configurazione in meno di un&apos;ora, zero consulenti IT.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border hairline rounded-xl overflow-hidden">
            {[
              {
                icon: <><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></>,
                title: 'Turni & Calendario',
                body: 'Pianifica turni settimanali con drag & drop, copia settimane, pubblica con un click. Vista per dipendente o per posto di servizio.',
              },
              {
                icon: <><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></>,
                title: 'Timbrature GPS',
                body: 'Entrata e uscita dal telefono, con verifica della posizione sul posto di servizio. Badge visuale in tempo reale sulla griglia turni.',
              },
              {
                icon: <><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5L16 9.5"/></>,
                title: 'Richieste & approvazioni',
                body: 'Ferie, permessi, malattia e cambio turno con catena di approvazione manager → admin. Notifiche automatiche ad ogni passaggio.',
              },
              {
                icon: <><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></>,
                title: 'Cedolini & documenti',
                body: 'Carica buste paga e documenti aziendali in modo sicuro. Ogni dipendente accede solo ai propri file, da qualsiasi dispositivo.',
              },
              {
                icon: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16V11"/><path d="M13 16V8"/><path d="M18 16v-3"/></>,
                title: 'Analytics & export',
                body: 'Ore lavorate, presenze, straordinari e costi per dipendente. Export CSV pronto per il commercialista o il gestionale paghe.',
              },
              {
                icon: <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>,
                title: 'Task & comunicazioni',
                body: 'Assegna task con scadenze e priorità, commenta con menzioni. Notifiche in-app e via email per tutto il team.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="bg-white p-7 sm:p-9">
                <div className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand-dark text-white shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {icon}
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t hairline">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ Come funziona</div>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
              Tre passi e <span className="serif">sei operativo.</span>
            </h2>
          </div>

          <ol className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { n: '01', tag: 'Configura', title: 'Imposta sedi e team', body: 'Aggiungi le sedi, definisci ruoli e orari standard. Invita i collaboratori via email in pochi minuti.' },
              { n: '02', tag: 'Assegna', title: 'Pianifica i turni', body: 'Crea il calendario settimanale, assegna i turni e pubblica. Ogni dipendente riceve notifica della propria pianificazione.' },
              { n: '03', tag: 'Monitora', title: 'Controlla e approva', body: 'Approva richieste, verifica presenze in tempo reale ed esporta i report. Tutto in un’unica dashboard.' },
            ].map(({ n, tag, title, body }) => (
              <li key={n} className="relative rounded-xl border hairline bg-white p-7">
                <div className="flex items-baseline justify-between">
                  <span className="serif text-5xl text-slate-900 leading-none">{n}</span>
                  <span className="mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{tag}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="prezzi" className="border-t hairline bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ Prezzi</div>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
              Semplice, <span className="serif">senza sorprese.</span>
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Prezzo fisso mensile, indipendentemente da quante volte usi la piattaforma. Nessun costo nascosto, nessun vincolo annuale.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Starter */}
            <div className="rounded-xl border hairline bg-white p-7 sm:p-8 flex flex-col">
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-3">Starter</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">€49</span>
                <span className="text-slate-500 text-sm">/mese</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Fino a 15 dipendenti</p>
              <div className="mt-6 border-t hairline pt-6 space-y-3 flex-1">
                {['Turni e calendario','Timbrature GPS','Richieste ferie e permessi','Notifiche in-app ed email','Export CSV'].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <a href="#demo" className="mt-8 inline-flex items-center justify-center h-10 px-5 rounded-md border border-slate-900 text-slate-900 text-sm font-medium hover:bg-slate-50 transition">Richiedi una demo</a>
            </div>

            {/* Professional */}
            <div className="pricing-featured rounded-xl p-7 sm:p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center h-6 px-3 rounded-full bg-brand-blue text-white text-[11px] font-medium mono uppercase tracking-[0.12em]">Più funzionale</span>
              </div>
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-3">Professional</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">€99</span>
                <span className="text-slate-400 text-sm">/mese</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Fino a 50 dipendenti</p>
              <div className="mt-6 border-t border-slate-700 pt-6 space-y-3 flex-1">
                {['Tutto di Starter','Cedolini e documenti','Task management','Analytics & consuntivi paghe','Contatori ferie / ROL','Contratti e straordinari automatici'].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <a href="#demo" className="mt-8 inline-flex items-center justify-center h-10 px-5 rounded-md bg-brand-blue text-white text-sm font-medium hover:opacity-90 transition">Richiedi una demo</a>
            </div>

            {/* Enterprise */}
            <div className="rounded-xl border hairline bg-white p-7 sm:p-8 flex flex-col">
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-3">Enterprise</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">Su richiesta</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Oltre 50 dipendenti</p>
              <div className="mt-6 border-t hairline pt-6 space-y-3 flex-1">
                {['Tutto di Professional','AI Copilot per la pianificazione','White label (dominio personalizzato)','Fabbisogno staffing','Onboarding e supporto dedicato'].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <a href="#demo" className="mt-8 inline-flex items-center justify-center h-10 px-5 rounded-md border border-slate-900 text-slate-900 text-sm font-medium hover:bg-slate-50 transition">Contattaci</a>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Tutti i piani includono subdomain dedicato, SSL, backup giornalieri e aggiornamenti automatici. Nessun contratto annuale obbligatorio.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-t hairline">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ FAQ</div>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
              Domande <span className="serif">frequenti.</span>
            </h2>
          </div>

          <div className="mt-12 max-w-3xl space-y-3">
            {[
              { q: "I dipendenti devono installare un'app?", a: "No. Opero Hub è una web app che funziona su qualsiasi browser, da smartphone o PC. I dipendenti ricevono un link via email e accedono senza installare nulla." },
              { q: "Serve un reparto IT per configurarlo?", a: "Assolutamente no. La configurazione iniziale richiede circa 30–60 minuti: aggiungi i dipendenti, definisci i posti di servizio e sei pronto. Durante la demo ti accompagniamo passo per passo." },
              { q: "Posso importare i dati da Excel?", a: "Sì. Puoi importare l'elenco dei dipendenti tramite CSV. Per i turni storici, durante l'onboarding valutiamo insieme la migrazione più adatta alla tua situazione." },
              { q: "I dati della mia azienda sono al sicuro?", a: "Ogni azienda ha un ambiente completamente isolato (multi-tenant con RLS a livello database). I dati sono ospitati su infrastruttura europea, con backup giornalieri e connessioni cifrate." },
              { q: "Posso disdire quando voglio?", a: "Sì, nessun vincolo contrattuale. Puoi disdire in qualsiasi momento dalla dashboard. Prima della disdetta puoi esportare tutti i tuoi dati in formato CSV." },
              { q: "Come funziona la demo?", a: "Compila il modulo con i tuoi dati e una breve descrizione della tua azienda. Ti ricontattiamo noi entro 24 ore lavorative per organizzare una call illustrativa, senza fretta e senza impegno." },
            ].map(({ q, a }) => (
              <details key={q} className="faq-item rounded-xl border hairline bg-white overflow-hidden">
                <summary className="flex items-center justify-between p-6 gap-4">
                  <span className="font-semibold text-slate-900">{q}</span>
                  <span className="faq-icon shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-lg font-light">+</span>
                </summary>
                <div className="px-6 pb-6 text-[15px] text-slate-600 leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO CTA ── */}
      <section id="demo" className="border-t hairline bg-brand-dark text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
            <div>
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-4">/ Inizia oggi</div>
              <h2 className="text-3xl sm:text-5xl tracking-tight">
                Pronto a mettere ordine? <span className="serif text-white/90">Iniziamo.</span>
              </h2>
              <p className="mt-5 text-slate-300 max-w-lg leading-relaxed">
                Compila il modulo con i tuoi dati. Ti ricontatteremo noi per organizzare una call illustrativa, così possiamo capire insieme le esigenze della tua azienda e mostrarti la piattaforma nel modo più utile.
              </p>
              <ul className="mt-6 space-y-2">
                {['Nessuna carta di credito richiesta','Ti ricontattiamo entro 24 ore lavorative','Call su misura per il tuo settore'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6 sm:p-7">
              <DemoForm />
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Inviando la richiesta accetti la nostra{' '}
                <a href="#" className="underline decoration-slate-600 hover:text-white">Privacy Policy</a>.
                {' '}Niente spam.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contatti" className="bg-[#FAFAF8] border-t hairline">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-2">
              <a href="#" className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-brand-dark text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 7h14"/><path d="M5 12h9"/><path d="M5 17h14"/>
                  </svg>
                </span>
                <span className="font-semibold tracking-tight text-slate-900">Opero Hub</span>
              </a>
              <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-xs">
                La piattaforma di gestione turni e operazioni per PMI italiane.
              </p>
              <div className="mt-5 mono text-[11px] uppercase tracking-[0.16em] text-slate-400 leading-relaxed">
                Opero S.r.l.<br/>
                Via Roma 12, 20121 Milano<br/>
                P.IVA · IT 00000000000
              </div>
            </div>

            <div>
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-4">Prodotto</div>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li><a href="#funzionalita" className="hover:text-slate-900">Funzionalità</a></li>
                <li><a href="#prezzi" className="hover:text-slate-900">Prezzi</a></li>
                <li><a href="#faq" className="hover:text-slate-900">FAQ</a></li>
                <li><a href="/login" className="hover:text-slate-900">Accedi</a></li>
              </ul>
            </div>

            <div>
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-4">Legale</div>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-slate-900">Cookie Policy</a></li>
                <li><a href="mailto:info@operohub.com" className="hover:text-slate-900">info@operohub.com</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="mono text-[11px] uppercase tracking-[0.16em] text-slate-400">© 2026 Opero S.r.l. — Tutti i diritti riservati</span>
            <span className="mono text-[11px] uppercase tracking-[0.16em] text-slate-400">Made in Italy</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat(landing): pagina landing Next.js"
```

---

### Task 6: Aggiornamento middleware

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Aggiungere helper `isRootDomain` e aggiornare la logica di `/`**

Trovare la riga:
```typescript
const pubbliche = ['/login', '/reset-password', '/auth/callback']
```

Sostituire con:
```typescript
function isRootDomain(host: string): boolean {
  return (
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host === 'operohub.com' ||
    host === 'www.operohub.com'
  )
}

// ...dentro middleware():
const pubbliche = ['/login', '/reset-password', '/auth/callback']
const isLandingRoot = path === '/' && isRootDomain(host)
```

Trovare la riga:
```typescript
if (!user && !pubbliche.includes(path)) {
```

Sostituire con:
```typescript
if (!user && !pubbliche.includes(path) && !isLandingRoot) {
```

Il blocco `if (user)` più avanti contiene già:
```typescript
if (path === '/' || path === '/login') {
  return NextResponse.redirect(new URL('/home', request.url))
}
```
Questo rimane invariato: gli utenti autenticati su `/` vengono sempre mandati a `/home`.

- [ ] **Step 2: Verificare che la funzione helper sia a livello modulo**

La funzione `isRootDomain` deve essere definita FUORI dalla funzione `middleware()`, a livello del modulo (prima di `export async function middleware`). Questo perché è una funzione pura che non dipende da alcun parametro della request.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(landing): middleware serve landing su root domain"
```

---

### Task 7: Smoke test

- [ ] **Step 1: Avviare il dev server**

```bash
npm run dev
```

Attesa: nessun errore TypeScript o di compilazione nel terminale.

- [ ] **Step 2: Verificare la landing a `localhost:3000`**

Aprire `http://localhost:3000` nel browser.

Atteso:
- La landing page è visibile (non redirect a `/login`)
- Navbar, hero, pain points, features, how it works, pricing, FAQ, demo form, footer tutti visibili
- Font serif (Instrument Serif corsivo) applicato su titoli con classe `.serif`
- Font mono (JetBrains Mono) applicato su label con classe `.mono`
- Dot grid visibile in alto a destra nella hero
- Hero mockup prodotto con griglia turni visibile

- [ ] **Step 3: Verificare scroll e anchor link**

Cliccare i link della navbar (`#funzionalita`, `#prezzi`, `#faq`, `#demo`).

Atteso: scroll smooth verso le sezioni corrispondenti.

- [ ] **Step 4: Verificare il pulsante Accedi**

Cliccare "Accedi alla piattaforma" nella hero e "Accedi" nella navbar.

Atteso: navigazione a `/login`.

- [ ] **Step 5: Verificare FAQ accordion**

Cliccare su una domanda FAQ.

Atteso: il testo risposta appare, l'icona `+` ruota a `×`.

- [ ] **Step 6: Verificare il form — validazione client**

Cliccare "Richiedi una demo" con tutti i campi vuoti.

Atteso: messaggio di errore inline rosso `"Per favore compila tutti i campi prima di inviare."` (no alert browser).

Inserire email non valida (es. `notanemail`) con gli altri campi compilati.

Atteso: messaggio di errore `"Inserisci un indirizzo email valido."`.

- [ ] **Step 7: Verificare il form — submit reale**

Compilare tutti i campi con dati validi e inviare.

Atteso: il form scompare, appare il div di successo con checkmark blu e testo `"Richiesta inviata!"`.

Verificare su Supabase Table Editor che il record sia presente in `demo_requests`.

- [ ] **Step 8: Verificare redirect utente autenticato**

Fare login come admin, poi aprire `http://localhost:3000`.

Atteso: redirect automatico a `/home` (comportamento invariato).
