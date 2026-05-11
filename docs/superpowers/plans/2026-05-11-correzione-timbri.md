# Correzione Manuale Timbri — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettere ad admin e manager di correggere manualmente `ora_ingresso_effettiva` e `ora_uscita_effettiva` di un turno tramite un pulsante "Correggi timbri" nel ModaleTurno.

**Architecture:** Nuova API `PATCH /api/turni/[id]/timbri` accetta HH:mm e costruisce i timestamp ISO usando la data del turno. Il ModaleTurno aggiunge uno stato `correzioneAperta` e una sezione inline con due `<input type="time">` visibile solo quando il turno esiste.

**Tech Stack:** Next.js 14 App Router, Supabase admin client, TypeScript, Tailwind CSS. Commit su branch `dev`.

---

## File Map

| File | Azione |
|------|--------|
| `app/api/turni/[id]/timbri/route.ts` | Crea — PATCH ora_ingresso/uscita_effettiva |
| `components/calendario/ModaleTurno.tsx` | Modifica — pulsante + sezione correzione inline |

---

### Task 1: API PATCH timbri

**Files:**
- Crea: `app/api/turni/[id]/timbri/route.ts`

- [ ] **Step 1: Crea il file API**

```typescript
// app/api/turni/[id]/timbri/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const { id } = params
  const body = await request.json().catch(() => ({}))
  const { ora_ingresso_effettiva, ora_uscita_effettiva } = body as {
    ora_ingresso_effettiva: string | null
    ora_uscita_effettiva: string | null
  }

  const admin = createAdminClient()

  // Legge la data del turno per costruire il timestamp
  const { data: turno, error: readErr } = await admin
    .from('turni')
    .select('data')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (readErr || !turno) {
    return NextResponse.json({ error: 'Turno non trovato' }, { status: 404 })
  }

  // Converte HH:mm in timestamp ISO, null se vuoto
  function toISO(data: string, hhmm: string | null): string | null {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null
    return `${data}T${hhmm}:00`
  }

  const { error: updErr } = await admin
    .from('turni')
    .update({
      ora_ingresso_effettiva: toISO(turno.data, ora_ingresso_effettiva),
      ora_uscita_effettiva: toISO(turno.data, ora_uscita_effettiva),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add app/api/turni/[id]/timbri/route.ts
git commit -m "feat(timbri): API PATCH correzione manuale ora ingresso/uscita"
```

---

### Task 2: UI correzione timbri in ModaleTurno

**Files:**
- Modifica: `components/calendario/ModaleTurno.tsx`

La sezione timbri attuale (linee 299–315 circa) è read-only. Aggiungiamo sotto di essa il pulsante e la sezione inline di correzione.

- [ ] **Step 1: Aggiungi prop onTimbriAggiornati e stati correzione**

Aggiungi alla interface `ModaleTurnoProps`:

```typescript
onTimbriAggiornati?: (ingresso: string | null, uscita: string | null) => void
```

Aggiungi negli `useState` del componente (dopo `const [salvando, setSalvando] = useState(false)`):

```typescript
const [correzioneAperta, setCorrezioneAperta] = useState(false)
const [ingressoCorretto, setIngressoCorretto] = useState('')
const [uscitaCorretto, setUscitaCorretto] = useState('')
const [salvandoTimbri, setSalvandoTimbri] = useState(false)
const [erroreTimbri, setErroreTimbri] = useState('')
```

Aggiungi nel `useEffect([turno, open])` il reset degli stati:

```typescript
setCorrezioneAperta(false)
setIngressoCorretto('')
setUscitaCorretto('')
setSalvandoTimbri(false)
setErroreTimbri('')
```

- [ ] **Step 2: Aggiungi funzione handleSalvaTimbri**

Aggiungi dopo `handleSave`:

```typescript
async function handleSalvaTimbri() {
  if (!turno) return
  setSalvandoTimbri(true)
  setErroreTimbri('')
  const res = await fetch(`/api/turni/${turno.id}/timbri`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ora_ingresso_effettiva: ingressoCorretto || null,
      ora_uscita_effettiva: uscitaCorretto || null,
    }),
  })
  setSalvandoTimbri(false)
  if (!res.ok) {
    setErroreTimbri('Errore nel salvataggio dei timbri.')
    return
  }
  setCorrezioneAperta(false)
  onTimbriAggiornati?.(ingressoCorretto || null, uscitaCorretto || null)
}
```

- [ ] **Step 3: Sostituisci la sezione timbri nel render (path edit, NON readOnly)**

Trova il blocco `{mostraTimbri && (` nella parte NON readOnly del render (circa linea 299) e sostituiscilo con:

```typescript
{turno && (
  <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">Timbrature</p>
      <button
        type="button"
        onClick={() => {
          setCorrezioneAperta(v => !v)
          setIngressoCorretto(timbroIngresso ? oraDaISO(timbroIngresso) : '')
          setUscitaCorretto(timbroUscita ? oraDaISO(timbroUscita) : '')
          setErroreTimbri('')
        }}
        className="text-[11px] text-blue-600 hover:underline"
      >
        {correzioneAperta ? 'Annulla' : 'Correggi timbri'}
      </button>
    </div>
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <span className="inline-flex items-center gap-2 text-slate-700">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-slate-400">Ingresso</span>
        <span className="font-semibold">{timbroIngresso ? oraDaISO(timbroIngresso) : '—'}</span>
      </span>
      <span className="inline-flex items-center gap-2 text-slate-700">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-slate-400">Uscita</span>
        <span className="font-semibold">{timbroUscita ? oraDaISO(timbroUscita) : '—'}</span>
      </span>
    </div>
    {correzioneAperta && (
      <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-slate-500">Ingresso</label>
            <input
              type="time"
              value={ingressoCorretto}
              onChange={e => setIngressoCorretto(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-slate-500">Uscita</label>
            <input
              type="time"
              value={uscitaCorretto}
              onChange={e => setUscitaCorretto(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {erroreTimbri && <p className="text-xs text-red-600">{erroreTimbri}</p>}
        <button
          type="button"
          onClick={handleSalvaTimbri}
          disabled={salvandoTimbri}
          className="w-full py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {salvandoTimbri ? 'Salvataggio...' : 'Salva correzione'}
        </button>
      </div>
    )}
  </div>
)}
```

Rimuovi il vecchio blocco `{mostraTimbri && (...)}` che è stato sostituito.

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add components/calendario/ModaleTurno.tsx
git commit -m "feat(timbri): pulsante Correggi timbri nel ModaleTurno"
```

---

## Test manuale

1. Apri un turno esistente nel calendario admin → deve apparire il box "Timbrature" con pulsante "Correggi timbri"
2. Clicca "Correggi timbri" → si espande con i campi Ingresso/Uscita precompilati se già timbrati
3. Modifica un valore e clicca "Salva correzione" → il box torna read-only con i nuovi valori
4. Verifica nel DB che `ora_ingresso_effettiva` / `ora_uscita_effettiva` siano aggiornati
5. Prova a lasciare entrambi vuoti → deve azzerare i timbri (NULL in DB)
