# Storico Consuntivi Paghe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere nella pagina `/admin/paghe` una sezione "Storico approvazioni" che lista i mesi già approvati con un pulsante "Riapri" per ricaricarli e ri-approvarli.

**Architecture:** Nuova API `GET /api/admin/paghe/storico` restituisce la lista dei consuntivi_paghe approvati del tenant. La pagina paghe la fetcha al mount e mostra la sezione collapsible; "Riapri" imposta il mese e chiama `handleCalcola`.

**Tech Stack:** Next.js 14 App Router, Supabase (client + admin), TypeScript, Tailwind CSS. Commit su branch `dev`.

---

## File Map

| File | Azione |
|------|--------|
| `app/api/admin/paghe/storico/route.ts` | Crea — GET lista consuntivi approvati |
| `app/admin/paghe/page.tsx` | Modifica — fetch storico + sezione lista + logica Riapri |

---

### Task 1: API GET storico

**Files:**
- Crea: `app/api/admin/paghe/storico/route.ts`

- [ ] **Step 1: Crea il file API**

```typescript
// app/api/admin/paghe/storico/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.ruolo ?? '')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  let tenantId: string
  try { tenantId = requireTenantId() } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('consuntivi_paghe')
    .select('id, mese, stato, approvato_at, approvato_da, profiles!consuntivi_paghe_approvato_da_fkey(nome, cognome)')
    .eq('tenant_id', tenantId)
    .eq('stato', 'approvato')
    .order('mese', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const storico = (data ?? []).map(c => {
    const approvatore = c.profiles as unknown as { nome: string; cognome: string } | null
    return {
      id: c.id,
      mese: c.mese,
      approvato_at: c.approvato_at,
      approvato_da_nome: approvatore ? `${approvatore.nome} ${approvatore.cognome}` : null,
    }
  })

  return NextResponse.json({ storico })
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/paghe/storico/route.ts
git commit -m "feat(paghe): API GET storico consuntivi approvati"
```

---

### Task 2: Sezione storico nella pagina paghe

**Files:**
- Modifica: `app/admin/paghe/page.tsx`

- [ ] **Step 1: Aggiungi tipo StoricoItem e stato**

In cima al file, dopo le interfacce esistenti, aggiungi:

```typescript
interface StoricoItem {
  id: string
  mese: string
  approvato_at: string
  approvato_da_nome: string | null
}
```

Aggiungi gli stati dopo `const [dati, setDati] = useState<DatiConsuntivo | null>(null)`:

```typescript
const [storico, setStorico] = useState<StoricoItem[]>([])
const [storicoAperto, setStoricoAperto] = useState(false)
```

- [ ] **Step 2: Fetch storico al mount**

Aggiungi `useEffect` dopo gli stati (aggiorna anche l'import di React per includere `useEffect`):

```typescript
useEffect(() => {
  fetch('/api/admin/paghe/storico')
    .then(r => r.ok ? r.json() : { storico: [] })
    .then(d => {
      setStorico(d.storico ?? [])
      setStoricoAperto((d.storico ?? []).length > 0)
    })
    .catch(() => {})
}, [])
```

Aggiorna l'import in cima al file da:
```typescript
import { useState } from 'react'
```
a:
```typescript
import { useState, useEffect } from 'react'
```

- [ ] **Step 3: Aggiungi funzione helper formatMese**

Aggiungi dopo `formatData`:

```typescript
function formatMese(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}
```

- [ ] **Step 4: Aggiungi funzione handleRiapri**

Aggiungi dopo `handleExportCsv`:

```typescript
function handleRiapri(item: StoricoItem) {
  const mesePart = item.mese.slice(0, 7) // "YYYY-MM-01" → "YYYY-MM"
  setMese(mesePart)
  setDati(null)
  setLoading(true)
  setErrore('')
  fetch(`/api/admin/paghe?mese=${mesePart}`)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => setDati(d))
    .catch(() => setErrore('Errore nel caricamento.'))
    .finally(() => setLoading(false))
}
```

- [ ] **Step 5: Aggiungi la sezione storico nel JSX**

Nel return, aggiungi la sezione PRIMA del `<div className="bg-white rounded-xl border ...">` esistente (cioè prima del selettore mese):

```typescript
{storico.length > 0 && (
  <div className="bg-white rounded-xl border border-slate-900/20 overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
    <button
      onClick={() => setStoricoAperto(v => !v)}
      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
    >
      <span className="text-sm font-semibold text-slate-900">Storico approvazioni</span>
      <span className="text-slate-400 text-sm">{storicoAperto ? '▲' : '▼'}</span>
    </button>
    {storicoAperto && (
      <div className="border-t border-slate-900/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-2">Mese</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2">Approvato il</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2">Da</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {storico.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 font-medium text-slate-900 capitalize">{formatMese(item.mese)}</td>
                <td className="px-4 py-3 text-slate-600">{formatData(item.approvato_at)}</td>
                <td className="px-4 py-3 text-slate-600">{item.approvato_da_nome ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleRiapri(item)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Riapri
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 6: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 7: Commit**

```bash
git add app/admin/paghe/page.tsx
git commit -m "feat(paghe): sezione storico consuntivi con pulsante Riapri"
```

---

## Test manuale

1. Approva un consuntivo per il mese corrente
2. Ricarica `/admin/paghe` → appare la sezione "Storico approvazioni" con il mese appena approvato
3. Clicca sulla freccia per collassare → la sezione si chiude
4. Clicca "Riapri" → il selettore mese si aggiorna e parte il ricalcolo automaticamente
5. Verifica che il badge mostri "Approvato" con i dati del consuntivo esistente
6. Modifica un turno nel mese riaperto, poi ri-approva → il consuntivo viene sovrascritto
