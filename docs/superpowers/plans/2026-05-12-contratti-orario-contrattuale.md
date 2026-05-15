# Feature 1: Contratti e Orario Contrattuale — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Associare a ogni dipendente un contratto di lavoro (tipo, ore settimanali, ore giornaliere, data inizio) per abilitare il calcolo automatico degli straordinari futuro.

**Architecture:** Nuova tabella `contratti_dipendenti` con UNIQUE(tenant_id, dipendente_id) — un solo contratto attivo per dipendente, nessuno storico. API upsert GET+PUT a `/api/admin/contratti/[id]`. Card nella pagina admin utente, visibile solo se `modulo_contratti_abilitato`. Helper server-side `lib/contratti.ts` per uso futuro da straordinari.

**Tech Stack:** Next.js 14 App Router (client component), Supabase PostgreSQL con RLS, TypeScript, pattern esistente `requireTenantId` + `createAdminClient`.

---

### Task 1: Migration — tabella `contratti_dipendenti`

**Files:**
- Create: `supabase/migrations/038_contratti_dipendenti.sql`

- [ ] **Step 1: Creare il file migration**

```sql
-- supabase/migrations/038_contratti_dipendenti.sql
CREATE TABLE IF NOT EXISTS contratti_dipendenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dipendente_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('full_time','part_time','turni_fissi','turni_rotanti')),
  ore_settimanali  NUMERIC(5,2) NOT NULL,
  ore_giornaliere  NUMERIC(5,2) NOT NULL,
  data_inizio      DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, dipendente_id)
);

ALTER TABLE contratti_dipendenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_contratti" ON contratti_dipendenti
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

CREATE POLICY "manager_contratti_select" ON contratti_dipendenti
  FOR SELECT USING (tenant_id = get_my_tenant_id());
```

- [ ] **Step 2: Applicare la migration sul DB (Supabase dashboard o CLI)**

Aprire Supabase SQL editor e incollare il contenuto del file, oppure:
```bash
supabase db push
```
Verifica: la tabella `contratti_dipendenti` appare in Table Editor con le due policy RLS attive.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/038_contratti_dipendenti.sql
git commit -m "feat(contratti): migration tabella contratti_dipendenti con RLS"
```

---

### Task 2: Tipo TypeScript + helper server-side

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/contratti.ts`

- [ ] **Step 1: Aggiungere il tipo `ContrattoDipendente` in `lib/types.ts`**

Aggiungere alla fine del file, dopo `PianoTenant`:

```typescript
export type TipoContratto = 'full_time' | 'part_time' | 'turni_fissi' | 'turni_rotanti'

export interface ContrattoDipendente {
  id: string
  tenant_id: string
  dipendente_id: string
  tipo: TipoContratto
  ore_settimanali: number
  ore_giornaliere: number
  data_inizio: string   // "YYYY-MM-DD"
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Creare `lib/contratti.ts`**

```typescript
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ContrattoDipendente } from '@/lib/types'

export async function getContrattoDipendente(
  dipendente_id: string,
  tenant_id: string
): Promise<ContrattoDipendente | null> {
  const { data } = await createAdminClient()
    .from('contratti_dipendenti')
    .select('*')
    .eq('dipendente_id', dipendente_id)
    .eq('tenant_id', tenant_id)
    .single()
  return (data as ContrattoDipendente | null) ?? null
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/contratti.ts
git commit -m "feat(contratti): tipo ContrattoDipendente e helper getContrattoDipendente"
```

---

### Task 3: API GET + PUT `/api/admin/contratti/[id]`

**Files:**
- Create: `app/api/admin/contratti/[id]/route.ts`

- [ ] **Step 1: Creare il file API**

```typescript
// app/api/admin/contratti/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function checkAccesso() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return { ruolo: data.ruolo as string }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { data } = await createAdminClient()
    .from('contratti_dipendenti')
    .select('*')
    .eq('dipendente_id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  return NextResponse.json(data ?? null)
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  if (ctx.ruolo !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const tenantId = requireTenantId()
  const body = await req.json() as {
    tipo: string
    ore_settimanali: number
    ore_giornaliere: number
    data_inizio: string
  }

  const tipiValidi = ['full_time', 'part_time', 'turni_fissi', 'turni_rotanti']
  if (!tipiValidi.includes(body.tipo)) {
    return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('contratti_dipendenti')
    .upsert({
      tenant_id: tenantId,
      dipendente_id: params.id,
      tipo: body.tipo,
      ore_settimanali: body.ore_settimanali,
      ore_giornaliere: body.ore_giornaliere,
      data_inizio: body.data_inizio,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,dipendente_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Verificare che la directory esiste**

La directory `app/api/admin/contratti/[id]/` viene creata dal file. Nessuna azione necessaria.

- [ ] **Step 3: Commit**

```bash
git add "app/api/admin/contratti/[id]/route.ts"
git commit -m "feat(contratti): API GET+PUT upsert contratto dipendente"
```

---

### Task 4: UI — card Contratto nella pagina admin utente

**Files:**
- Modify: `app/admin/utenti/[id]/page.tsx`

La pagina è un Client Component. Aggiungere:
1. State per il flag `modulo_contratti_abilitato`
2. State per il form contratto
3. useEffect che fetcha impostazioni e contratto in parallelo
4. Funzione `salvaContratto`
5. Card JSX condizionale (dopo il form anagrafica, prima della sezione azioni pericolose)

- [ ] **Step 1: Aggiungere import del tipo**

In cima al file, aggiungere al blocco import esistente:
```typescript
import type { ContrattoDipendente } from '@/lib/types'
```

- [ ] **Step 2: Aggiungere state contratto nel componente**

Dopo la riga `const [form, setForm] = useState(...)` aggiungere:

```typescript
const [contrattiAbilitato, setContrattiAbilitato] = useState(false)
const [contratto, setContratto] = useState<ContrattoDipendente | null>(null)
const [contrattoForm, setContrattoForm] = useState({
  tipo: 'full_time',
  ore_settimanali: 40,
  ore_giornaliere: 8,
  data_inizio: '',
})
const [salvandoContratto, setSalvandoContratto] = useState(false)
```

- [ ] **Step 3: Aggiungere fetch di impostazioni e contratto nell'useEffect esistente**

L'useEffect attuale fetcha `/api/utenti`. Modificarlo per fetchare anche le impostazioni e il contratto in parallelo:

```typescript
useEffect(() => {
  Promise.all([
    fetch('/api/utenti').then(r => r.json()),
    fetch('/api/impostazioni').then(r => r.json()),
    fetch(`/api/admin/contratti/${id}`).then(r => r.json()),
  ]).then(([utenti, imp, c]: [Profile[], { modulo_contratti_abilitato?: boolean }, ContrattoDipendente | null]) => {
    const u = utenti.find(u => u.id === id)
    if (u) setForm({ nome: u.nome, cognome: u.cognome, ruolo: u.ruolo, attivo: u.attivo, includi_in_turni: u.includi_in_turni, matricola: (u as unknown as { matricola?: string }).matricola ?? '' })
    setContrattiAbilitato(imp?.modulo_contratti_abilitato ?? false)
    if (c) {
      setContratto(c)
      setContrattoForm({
        tipo: c.tipo,
        ore_settimanali: c.ore_settimanali,
        ore_giornaliere: c.ore_giornaliere,
        data_inizio: c.data_inizio,
      })
    }
  })
}, [id])
```

- [ ] **Step 4: Aggiungere la funzione `salvaContratto`**

Dopo la funzione `anonimizza`, aggiungere:

```typescript
async function salvaContratto(e: React.FormEvent) {
  e.preventDefault()
  setSalvandoContratto(true)
  const res = await fetch(`/api/admin/contratti/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contrattoForm),
  })
  if (res.ok) {
    const c = await res.json() as ContrattoDipendente
    setContratto(c)
  }
  setSalvandoContratto(false)
}
```

- [ ] **Step 5: Aggiungere la card contratto nel JSX**

Nella sezione `return`, dopo la chiusura del tag `</form>` del form anagrafica (dopo la riga che chiude `</form>` a riga ~115) e prima della chiusura del `</div>` esterno, aggiungere:

```tsx
{contrattiAbilitato && (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
    <h2 className="text-base font-semibold text-gray-900">Contratto</h2>
    {!contratto && (
      <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
        Nessun contratto impostato per questo dipendente.
      </p>
    )}
    <form onSubmit={salvaContratto} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Tipo contratto"
          value={contrattoForm.tipo}
          onChange={e => setContrattoForm(f => ({ ...f, tipo: e.target.value }))}
        >
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="turni_fissi">Turni fissi</option>
          <option value="turni_rotanti">Turni rotanti</option>
        </Select>
        <Input
          label="Data inizio"
          type="date"
          value={contrattoForm.data_inizio}
          onChange={e => setContrattoForm(f => ({ ...f, data_inizio: e.target.value }))}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Ore settimanali"
          type="number"
          min={1}
          max={60}
          step={0.5}
          value={contrattoForm.ore_settimanali}
          onChange={e => setContrattoForm(f => ({ ...f, ore_settimanali: parseFloat(e.target.value) }))}
          required
        />
        <Input
          label="Ore giornaliere"
          type="number"
          min={0.5}
          max={24}
          step={0.5}
          value={contrattoForm.ore_giornaliere}
          onChange={e => setContrattoForm(f => ({ ...f, ore_giornaliere: parseFloat(e.target.value) }))}
          required
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={salvandoContratto}>
          {salvandoContratto ? 'Salvataggio...' : 'Salva contratto'}
        </Button>
      </div>
    </form>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add "app/admin/utenti/[id]/page.tsx"
git commit -m "feat(contratti): card contratto nella pagina admin utente"
```

---

### Task 5: Smoke test manuale

- [ ] **Step 1: Verificare che senza il flag la card non appare**

Login come admin → `/admin/utenti/[id]` → la sezione "Contratto" non deve essere visibile se `modulo_contratti_abilitato = false` nelle impostazioni.

- [ ] **Step 2: Abilitare il modulo**

`/admin/impostazioni` → sezione "Moduli HR avanzati" → attivare "Contratti e orario contrattuale" → Salva.

- [ ] **Step 3: Verificare la card appare**

Tornare su `/admin/utenti/[id]` → la card "Contratto" deve essere visibile con il banner "Nessun contratto impostato".

- [ ] **Step 4: Salvare un contratto**

Compilare tipo=Full time, ore settimanali=40, ore giornaliere=8, data inizio=2024-01-01 → "Salva contratto". La card deve salvarsi senza errori.

- [ ] **Step 5: Verificare la persistenza**

Ricaricare la pagina. La card deve mostrare i valori salvati precompilati.

- [ ] **Step 6: Verificare accesso manager (read-only)**

Login come manager → verificare che il GET `/api/admin/contratti/[id]` restituisce 200 e il PUT restituisce 403.

_Nota: la card è visibile in pagina admin; la pagina manager non ha la card — solo l'API è protetta correttamente._
