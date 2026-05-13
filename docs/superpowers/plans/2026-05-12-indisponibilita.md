# Indisponibilità Dipendente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettere ai dipendenti di segnalare i giorni di indisponibilità, visibili come indicatore rosso nel calendario programmazione admin.

**Architecture:** Feature gated da `modulo_indisponibilita_abilitato`. Nuova tabella `indisponibilita`. API REST per CRUD. Sezione in `/dipendente/profilo`. Indicatore visivo nel calendario programmazione admin tramite prop dedicata su `GrigliaCalendario`.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript. Stessa struttura delle altre feature.

---

## File Map

| File | Azione |
|------|--------|
| `supabase/migrations/041_indisponibilita.sql` | Crea |
| `lib/types.ts` | Modifica — aggiunge `Indisponibilita` |
| `app/api/indisponibilita/route.ts` | Crea — GET + POST |
| `app/api/indisponibilita/[id]/route.ts` | Crea — DELETE |
| `app/dipendente/profilo/page.tsx` | Modifica — sezione indisponibilità |
| `components/calendario/GrigliaCalendario.tsx` | Modifica — prop `indisponibilita` + indicatore rosso |
| `app/admin/calendario-programmazione/page.tsx` | Modifica — fetch + passa prop |

---

### Task 1: Migration SQL

**Files:**
- Create: `supabase/migrations/041_indisponibilita.sql`

- [ ] **Step 1: Scrivi migration**

```sql
CREATE TABLE indisponibilita (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dipendente_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_inizio      DATE NOT NULL,
  data_fine        DATE NOT NULL,
  motivo           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE indisponibilita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_indisponibilita" ON indisponibilita
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

CREATE POLICY "manager_indisponibilita_select" ON indisponibilita
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin','manager')
  ));

CREATE POLICY "dipendente_indisponibilita" ON indisponibilita
  FOR ALL USING (tenant_id = get_my_tenant_id() AND dipendente_id = auth.uid());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/041_indisponibilita.sql
git commit -m "feat(indisponibilita): migration tabella indisponibilita + RLS"
```

---

### Task 2: Tipo TypeScript

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Aggiungi il tipo in coda a `lib/types.ts`**

```typescript
export interface Indisponibilita {
  id: string
  tenant_id: string
  dipendente_id: string
  data_inizio: string
  data_fine: string
  motivo: string | null
  created_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat(indisponibilita): tipo Indisponibilita"
```

---

### Task 3: API GET + POST

**Files:**
- Create: `app/api/indisponibilita/route.ts`

- [ ] **Step 1: Crea il file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkAccesso } from '@/lib/auth'
import { requireTenantId } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Indisponibilita } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { user, error } = await checkAccesso()
  if (error || !user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const tenantId = requireTenantId()
  const supabase = createAdminClient()

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const isAdminOrManager = user.ruolo === 'admin' || user.ruolo === 'manager'

  let query = supabase
    .from('indisponibilita')
    .select('id, dipendente_id, data_inizio, data_fine, motivo')
    .eq('tenant_id', tenantId)
    .order('data_inizio', { ascending: true })

  if (!isAdminOrManager) {
    query = query.eq('dipendente_id', user.id)
  }
  if (from) query = query.gte('data_fine', from)
  if (to) query = query.lte('data_inizio', to)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data as Indisponibilita[])
}

export async function POST(req: NextRequest) {
  const { user, error } = await checkAccesso()
  if (error || !user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const tenantId = requireTenantId()
  const supabase = createAdminClient()

  const body = await req.json()
  const dipendente_id = body.dipendente_id ?? user.id
  const { data_inizio, data_fine, motivo } = body

  if (!data_inizio || !data_fine) {
    return NextResponse.json({ error: 'data_inizio e data_fine obbligatori' }, { status: 400 })
  }
  if (data_fine < data_inizio) {
    return NextResponse.json({ error: 'data_fine deve essere >= data_inizio' }, { status: 400 })
  }
  if (user.ruolo !== 'admin' && dipendente_id !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { data, error: dbError } = await supabase
    .from('indisponibilita')
    .insert({ tenant_id: tenantId, dipendente_id, data_inizio, data_fine, motivo: motivo ?? null })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Verifica che `checkAccesso` restituisca il ruolo**

Controlla che in `lib/auth.ts` il `user` ritornato abbia il campo `ruolo`. Se `checkAccesso` non ritorna il ruolo, leggi il profilo separatamente:

```typescript
// Alternativa se checkAccesso non ha ruolo:
const { data: profilo } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
const ruolo = profilo?.ruolo
```

- [ ] **Step 3: Commit**

```bash
git add app/api/indisponibilita/route.ts
git commit -m "feat(indisponibilita): API GET+POST /api/indisponibilita"
```

---

### Task 4: API DELETE

**Files:**
- Create: `app/api/indisponibilita/[id]/route.ts`

- [ ] **Step 1: Crea il file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkAccesso } from '@/lib/auth'
import { requireTenantId } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await checkAccesso()
  if (error || !user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const tenantId = requireTenantId()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('indisponibilita')
    .select('dipendente_id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  if (user.ruolo !== 'admin' && existing.dipendente_id !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { error: dbError } = await supabase
    .from('indisponibilita')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/indisponibilita/[id]/route.ts
git commit -m "feat(indisponibilita): API DELETE /api/indisponibilita/[id]"
```

---

### Task 5: UI Profilo Dipendente

**Files:**
- Modify: `app/dipendente/profilo/page.tsx`

Il file usa già `useState`, `useEffect`, `Promise.all`. Aggiunge una sezione condizionale sotto i contatori ferie (o sotto dati personali se contatori assenti).

- [ ] **Step 1: Aggiungi i nuovi state e il fetch**

In cima alle dichiarazioni state, aggiungi:

```typescript
const [indisponibilitaAbilitato, setIndisponibilitaAbilitato] = useState(false)
const [indisponibilita, setIndisponibilita] = useState<Array<{ id: string; data_inizio: string; data_fine: string; motivo: string | null }>>([])
const [formIndisp, setFormIndisp] = useState({ data_inizio: '', data_fine: '', motivo: '' })
const [salvandoIndisp, setSalvandoIndisp] = useState(false)
```

- [ ] **Step 2: Espandi il `Promise.all` per fetchare le indisponibilità future**

Nel `useEffect`, il Promise.all attuale ha 3 fetch (profiles, impostazioni, contatori). Espandilo a 4:

```typescript
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
```

- [ ] **Step 3: Aggiungi le funzioni aggiungiIndisponibilita ed eliminaIndisponibilita**

```typescript
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
```

- [ ] **Step 4: Aggiungi la card JSX prima della sezione "Cambia password"**

```tsx
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
```

- [ ] **Step 5: Commit**

```bash
git add app/dipendente/profilo/page.tsx
git commit -m "feat(indisponibilita): sezione indisponibilita nel profilo dipendente"
```

---

### Task 6: Calendario Programmazione Admin

**Files:**
- Modify: `components/calendario/GrigliaCalendario.tsx`
- Modify: `app/admin/calendario-programmazione/page.tsx`

**Strategia:** aggiungere una prop `indisponibilita` separata a `GrigliaCalendario` (non riutilizzare il meccanismo `assenze` che sostituisce la cella con BloccoAssenza). Mostrare un piccolo dot rosso nell'angolo della cella senza nascondere i turni.

- [ ] **Step 1: Modifica `GrigliaCalendario.tsx` — aggiungi prop e helper**

Nella interfaccia `GrigliaProps` (riga 19), aggiungi dopo `onAssenzaClick?`:

```typescript
indisponibilita?: Array<{ dipendente_id: string; data_inizio: string; data_fine: string }>
```

Nella funzione `GrigliaCalendario`, aggiungi l'helper (dopo `getAssenzaCella`):

```typescript
function hasIndisponibilita(dipendenteId: string, data: string): boolean {
  return (indisponibilita ?? []).some(
    i => i.dipendente_id === dipendenteId && i.data_inizio <= data && i.data_fine >= data
  )
}
```

Nella firma della funzione, destruttura anche `indisponibilita`:

```typescript
export function GrigliaCalendario({ giorni, dipendenti, turni, onAddTurno, onEditTurno, readonly, onTurnoClick, compact, assenze, onAssenzaClick, indisponibilita }: GrigliaProps) {
```

- [ ] **Step 2: Modifica la cella della griglia per mostrare il dot rosso**

Nella sezione `return` del tbody, nel ramo `else` (cella normale senza assenza), avvolgi `CellaCalendario` con un wrapper `relative` e aggiungi il dot:

```tsx
return (
  <td key={data} className="relative border border-slate-200/60">
    {hasIndisponibilita(d.id, data) && (
      <span className="absolute top-0.5 right-0.5 z-10 w-2 h-2 rounded-full bg-red-500" title="Indisponibile" />
    )}
    <CellaCalendario
      turni={getTurniCella(d.id, data)}
      onAdd={() => onAddTurno(d.id, data)}
      onEdit={onEditTurno}
      readonly={readonly}
      onReadonlyClick={onTurnoClick}
      isOggi={data === oggi}
      isPassato={data < oggi}
      compact={compact}
    />
  </td>
)
```

Nota: il ramo con assenza (riga ~99-109) rimane invariato — quella `<td>` già ha `className="border border-slate-200/60 px-1 py-1"`.

- [ ] **Step 3: Modifica `app/admin/calendario-programmazione/page.tsx`**

Aggiungi state:

```typescript
const [indisponibilitaAbilitato, setIndisponibilitaAbilitato] = useState(false)
const [indisponibilita, setIndisponibilita] = useState<Array<{ dipendente_id: string; data_inizio: string; data_fine: string }>>([])
```

Espandi il `caricaDati` `Promise.all` da 4 a 5 fetch. **Prima** dei 4 fetch esistenti, fetch le impostazioni per capire se il modulo è abilitato; poi condizionalmente fetch le indisponibilità:

```typescript
const caricaDati = useCallback(async () => {
  setErrore('')
  setLoading(true)
  try {
    const [imp, u, tp, tr, po] = await Promise.all([
      fetch('/api/impostazioni').then(r => r.json()),
      fetch('/api/utenti').then(r => r.json()),
      fetch('/api/template').then(r => r.json()),
      fetch(`/api/turni?stato=tutti&data_inizio=${periodo.inizio}&data_fine=${periodo.fine}`).then(r => r.json()),
      fetch('/api/posti').then(r => r.json()),
    ])
    setIndisponibilitaAbilitato(imp?.modulo_indisponibilita_abilitato ?? false)
    setDipendenti(u.filter((x: Profile) => x.includi_in_turni && x.attivo))
    setTemplates(tp)
    setTurni(tr)
    setPosti(po)

    if (imp?.modulo_indisponibilita_abilitato) {
      const indisp = await fetch(`/api/indisponibilita?from=${periodo.inizio}&to=${periodo.fine}`).then(r => r.json())
      setIndisponibilita(Array.isArray(indisp) ? indisp : [])
    } else {
      setIndisponibilita([])
    }
  } catch {
    setErrore('Errore nel caricamento dei dati.')
  } finally {
    setLoading(false)
  }
}, [periodo])
```

Aggiungi la prop a `GrigliaCalendario` (riga ~226):

```tsx
<GrigliaCalendario
  giorni={giorni}
  dipendenti={dipendenti}
  turni={turni}
  onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
  onEditTurno={turno => setModale({ open: true, turno })}
  compact
  indisponibilita={indisponibilitaAbilitato ? indisponibilita : undefined}
/>
```

- [ ] **Step 4: Commit**

```bash
git add components/calendario/GrigliaCalendario.tsx app/admin/calendario-programmazione/page.tsx
git commit -m "feat(indisponibilita): indicatore rosso nel calendario programmazione admin"
```
