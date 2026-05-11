# Assenze nel Calendario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrare ferie, permessi e malattie approvate come blocchi colorati nella griglia calendario admin e manager, con click che apre il dettaglio della richiesta.

**Architecture:** Nuova API `GET /api/richieste/calendario` restituisce le assenze nel periodo. Le pagine calendario fetchano assenze in parallelo ai turni. `GrigliaCalendario` riceve una prop `assenze` e renderizza `BloccoAssenza` al posto della cella turno quando c'è un'assenza attiva.

**Tech Stack:** Next.js 14 App Router, Supabase (client + admin), TypeScript, Tailwind CSS. Commit su branch `dev`.

---

## File Map

| File | Azione |
|------|--------|
| `app/api/richieste/calendario/route.ts` | Crea — GET assenze per periodo |
| `components/calendario/BloccoAssenza.tsx` | Crea — blocco colorato cliccabile |
| `components/calendario/GrigliaCalendario.tsx` | Modifica — prop assenze + rendering |
| `app/admin/calendario/page.tsx` | Modifica — fetch assenze + modale dettaglio |
| `app/manager/calendario/page.tsx` | Modifica — idem |

---

### Task 1: API GET assenze calendario

**Files:**
- Crea: `app/api/richieste/calendario/route.ts`

- [ ] **Step 1: Crea il file API**

```typescript
// app/api/richieste/calendario/route.ts
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const data_inizio = searchParams.get('data_inizio')
  const data_fine = searchParams.get('data_fine')

  if (!data_inizio || !data_fine ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data_inizio) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data_fine)) {
    return NextResponse.json({ error: 'data_inizio e data_fine (YYYY-MM-DD) richiesti' }, { status: 400 })
  }

  // Overlap: l'assenza è attiva nel periodo se inizia prima della fine e finisce dopo l'inizio
  const { data, error } = await supabase
    .from('richieste')
    .select('id, dipendente_id, tipo, data_inizio, data_fine, note')
    .eq('tenant_id', tenantId)
    .eq('stato', 'approvata')
    .in('tipo', ['ferie', 'permesso', 'malattia'])
    .lte('data_inizio', data_fine)
    .gte('data_fine', data_inizio)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add app/api/richieste/calendario/route.ts
git commit -m "feat(calendario): API GET assenze per periodo"
```

---

### Task 2: Componente BloccoAssenza

**Files:**
- Crea: `components/calendario/BloccoAssenza.tsx`

- [ ] **Step 1: Crea il componente**

```typescript
// components/calendario/BloccoAssenza.tsx

export type TipoAssenza = 'ferie' | 'permesso' | 'malattia'

const STILI: Record<TipoAssenza, { bg: string; text: string; label: string }> = {
  ferie:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Ferie' },
  malattia: { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'Malattia' },
  permesso: { bg: 'bg-violet-100', text: 'text-violet-800', label: 'Permesso' },
}

interface BloccoAssenzaProps {
  tipo: TipoAssenza
  onClick: () => void
  compact?: boolean
}

export function BloccoAssenza({ tipo, onClick, compact }: BloccoAssenzaProps) {
  const s = STILI[tipo]
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md px-1.5 text-left font-medium cursor-pointer hover:opacity-80 transition-opacity ${s.bg} ${s.text} ${compact ? 'py-0.5 text-[10px]' : 'py-1 text-xs'}`}
    >
      {s.label}
    </button>
  )
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add components/calendario/BloccoAssenza.tsx
git commit -m "feat(calendario): componente BloccoAssenza"
```

---

### Task 3: Modifica GrigliaCalendario

**Files:**
- Modifica: `components/calendario/GrigliaCalendario.tsx`

La griglia attualmente renderizza `CellaCalendario` per ogni dipendente×giorno. Aggiungiamo la prop `assenze` e sostituiamo la cella con `BloccoAssenza` quando c'è un'assenza attiva.

- [ ] **Step 1: Aggiungi tipo AssenzaCalendario e prop assenze**

In cima al file, aggiungi dopo gli import esistenti:

```typescript
import { BloccoAssenza, TipoAssenza } from './BloccoAssenza'

export interface AssenzaCalendario {
  id: string
  dipendente_id: string
  tipo: TipoAssenza
  data_inizio: string
  data_fine: string
  note: string | null
}
```

Aggiungi `assenze` a `GrigliaProps`:

```typescript
interface GrigliaProps {
  giorni: Date[]
  dipendenti: Profile[]
  turni: TurnoConDettagli[]
  onAddTurno: (dipendenteId: string, data: string) => void
  onEditTurno: (turno: TurnoConDettagli) => void
  readonly?: boolean
  onTurnoClick?: (turno: TurnoConDettagli) => void
  compact?: boolean
  assenze?: AssenzaCalendario[]
  onAssenzaClick?: (assenza: AssenzaCalendario) => void
}
```

- [ ] **Step 2: Aggiungi helper getAssenzaCella e modifica il rendering**

Dentro la funzione `GrigliaCalendario`, dopo `getTurniCella`:

```typescript
function getAssenzaCella(dipendenteId: string, data: string): AssenzaCalendario | null {
  return (assenze ?? []).find(
    a => a.dipendente_id === dipendenteId && a.data_inizio <= data && a.data_fine >= data
  ) ?? null
}
```

Modifica il blocco `{giorni.map(g => {` dentro il `tbody` (attualmente renderizza solo `CellaCalendario`):

```typescript
{giorni.map(g => {
  const data = toDateString(g)
  const assenza = getAssenzaCella(d.id, data)
  if (assenza) {
    return (
      <td key={data} className="border border-slate-200/60 px-1 py-1">
        <BloccoAssenza
          tipo={assenza.tipo}
          onClick={() => onAssenzaClick?.(assenza)}
          compact={compact}
        />
      </td>
    )
  }
  return (
    <CellaCalendario
      key={data}
      turni={getTurniCella(d.id, data)}
      onAdd={() => onAddTurno(d.id, data)}
      onEdit={onEditTurno}
      readonly={readonly}
      onReadonlyClick={onTurnoClick}
      isOggi={data === oggi}
      isPassato={data < oggi}
      compact={compact}
    />
  )
})}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add components/calendario/GrigliaCalendario.tsx
git commit -m "feat(calendario): GrigliaCalendario mostra BloccoAssenza quando assenza attiva"
```

---

### Task 4: Integrazione in admin/calendario

**Files:**
- Modifica: `app/admin/calendario/page.tsx`

- [ ] **Step 1: Aggiungi import, stato e fetch assenze**

Aggiungi agli import:

```typescript
import { AssenzaCalendario } from '@/components/calendario/GrigliaCalendario'
```

Aggiungi stati dopo `const [loading, setLoading] = useState(true)`:

```typescript
const [assenze, setAssenze] = useState<AssenzaCalendario[]>([])
const [assenzaDettaglio, setAssenzaDettaglio] = useState<AssenzaCalendario | null>(null)
```

- [ ] **Step 2: Aggiungi fetch assenze in caricaDati**

Modifica `caricaDati` per fetchare assenze in parallelo:

```typescript
const caricaDati = useCallback(async () => {
  setErrore('')
  setLoading(true)
  try {
    const [utentiRes, templateRes, turniRes, postiRes, assenzeRes] = await Promise.all([
      fetch('/api/utenti'),
      fetch('/api/template'),
      fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
      fetch('/api/posti'),
      fetch(`/api/richieste/calendario?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
    ])
    const [utenti, tmpl, trn, pst, asz] = await Promise.all([
      utentiRes.json(), templateRes.json(), turniRes.json(), postiRes.json(), assenzeRes.json()
    ])
    setDipendenti(utenti.filter((u: Profile) => u.includi_in_turni && u.attivo))
    setTemplates(tmpl)
    setTurni(trn)
    setPosti(pst)
    setAssenze(Array.isArray(asz) ? asz : [])
  } catch {
    setErrore('Errore nel caricamento dei dati. Riprova.')
  } finally {
    setLoading(false)
  }
}, [dataCorrente, vista])
```

- [ ] **Step 3: Passa assenze a GrigliaCalendario e aggiungi modale dettaglio**

Trova tutte le occorrenze di `<GrigliaCalendario` nella pagina e aggiungi le prop:

```typescript
assenze={assenze}
onAssenzaClick={setAssenzaDettaglio}
```

Aggiungi il modale dettaglio prima del `</div>` finale del return:

```typescript
{assenzaDettaglio && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAssenzaDettaglio(null)}>
    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
      <h2 className="text-base font-semibold text-slate-900 mb-4">
        {assenzaDettaglio.tipo === 'ferie' ? 'Ferie' : assenzaDettaglio.tipo === 'malattia' ? 'Malattia' : 'Permesso'}
      </h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Periodo</span>
          <span className="font-medium text-slate-900">
            {assenzaDettaglio.data_inizio === assenzaDettaglio.data_fine
              ? assenzaDettaglio.data_inizio
              : `${assenzaDettaglio.data_inizio} — ${assenzaDettaglio.data_fine}`}
          </span>
        </div>
        {assenzaDettaglio.note && (
          <div className="pt-2">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 mb-1">Note</p>
            <p className="text-slate-700 whitespace-pre-wrap">{assenzaDettaglio.note}</p>
          </div>
        )}
      </div>
      <button
        onClick={() => setAssenzaDettaglio(null)}
        className="mt-5 w-full py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
      >
        Chiudi
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/admin/calendario/page.tsx
git commit -m "feat(calendario): mostra assenze admin con dettaglio su click"
```

---

### Task 5: Integrazione in manager/calendario

**Files:**
- Modifica: `app/manager/calendario/page.tsx`

- [ ] **Step 1: Aggiungi import e stati**

Aggiungi agli import:

```typescript
import { AssenzaCalendario } from '@/components/calendario/GrigliaCalendario'
```

Aggiungi stati dopo `const [loading, setLoading] = useState(true)`:

```typescript
const [assenze, setAssenze] = useState<AssenzaCalendario[]>([])
const [assenzaDettaglio, setAssenzaDettaglio] = useState<AssenzaCalendario | null>(null)
```

- [ ] **Step 2: Modifica caricaDati aggiungendo fetch assenze in parallelo**

```typescript
const caricaDati = useCallback(async () => {
  setErrore('')
  setLoading(true)
  try {
    const [utentiRes, templateRes, turniRes, postiRes, assenzeRes] = await Promise.all([
      fetch('/api/utenti'),
      fetch('/api/template'),
      fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
      fetch('/api/posti'),
      fetch(`/api/richieste/calendario?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
    ])
    const [utenti, tmpl, trn, pst, asz] = await Promise.all([
      utentiRes.json(), templateRes.json(), turniRes.json(), postiRes.json(), assenzeRes.json()
    ])
    setDipendenti(utenti.filter((u: Profile) => u.includi_in_turni && u.attivo))
    setTemplates(tmpl)
    setTurni(trn)
    setPosti(pst)
    setAssenze(Array.isArray(asz) ? asz : [])
  } catch {
    setErrore('Errore nel caricamento dei dati. Riprova.')
  } finally {
    setLoading(false)
  }
}, [dataCorrente, vista])
```

- [ ] **Step 3: Passa assenze a GrigliaCalendario e aggiungi modale dettaglio**

Trova tutte le occorrenze di `<GrigliaCalendario` nella pagina e aggiungi le prop:

```typescript
assenze={assenze}
onAssenzaClick={setAssenzaDettaglio}
```

Aggiungi il modale dettaglio prima del `</div>` finale del return:

```typescript
{assenzaDettaglio && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAssenzaDettaglio(null)}>
    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
      <h2 className="text-base font-semibold text-slate-900 mb-4">
        {assenzaDettaglio.tipo === 'ferie' ? 'Ferie' : assenzaDettaglio.tipo === 'malattia' ? 'Malattia' : 'Permesso'}
      </h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Periodo</span>
          <span className="font-medium text-slate-900">
            {assenzaDettaglio.data_inizio === assenzaDettaglio.data_fine
              ? assenzaDettaglio.data_inizio
              : `${assenzaDettaglio.data_inizio} — ${assenzaDettaglio.data_fine}`}
          </span>
        </div>
        {assenzaDettaglio.note && (
          <div className="pt-2">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 mb-1">Note</p>
            <p className="text-slate-700 whitespace-pre-wrap">{assenzaDettaglio.note}</p>
          </div>
        )}
      </div>
      <button
        onClick={() => setAssenzaDettaglio(null)}
        className="mt-5 w-full py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
      >
        Chiudi
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/manager/calendario/page.tsx
git commit -m "feat(calendario): mostra assenze manager con dettaglio su click"
```

---

## Test manuale

1. Crea una richiesta ferie approvata per un dipendente su un giorno con turno confermato
2. Apri `/admin/calendario` e naviga a quella settimana → la cella deve mostrare il blocco verde "Ferie"
3. Clicca il blocco → si apre il mini-modale con periodo e nota
4. Ripeti con permesso (viola) e malattia (ambra)
5. Verifica che gli stessi blocchi appaiano in `/manager/calendario`
