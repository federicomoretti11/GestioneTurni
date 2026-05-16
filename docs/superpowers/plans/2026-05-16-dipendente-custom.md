# Dipendente Custom (Emergenza) — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consentire la creazione di turni per dipendenti esterni (senza account) riutilizzabili, identificati solo da nome e cognome.

**Architecture:** Nuova tabella `dipendenti_custom` separata da `profiles`; la tabella `turni` riceve `dipendente_custom_id` con un CHECK constraint XOR che garantisce sempre esattamente un dipendente per turno. Il `ModaleTurno` aggiunge un toggle "Dipendente / Esterno Emergenza" con combobox e creazione inline.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS

---

## Mappa file

| File | Azione |
|------|--------|
| `supabase/migrations/043_dipendenti_custom.sql` | Create — migration DB |
| `lib/types.ts` | Modify — aggiunge `DipendenteCustom`, aggiorna `Turno` e `TurnoConDettagli` |
| `lib/utils/turni.ts` | Modify — aggiunge utility `nomeDipendente` |
| `app/api/dipendenti-custom/route.ts` | Create — GET lista, POST crea |
| `app/api/turni/route.ts` | Modify — estende SELECT e POST handler |
| `components/calendario/ModaleTurno.tsx` | Modify — toggle + combobox + creazione inline |
| `app/admin/calendario/page.tsx` | Modify — carica custom, passa al modale |

---

### Task 1: Migrazione DB

**Files:**
- Create: `supabase/migrations/043_dipendenti_custom.sql`

- [ ] **Step 1: Crea il file di migrazione**

```sql
-- supabase/migrations/043_dipendenti_custom.sql

-- 1. Tabella dipendenti esterni riutilizzabili
CREATE TABLE dipendenti_custom (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  cognome    text        NOT NULL,
  attivo     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dipendenti_custom ENABLE ROW LEVEL SECURITY;

-- RLS: admin e manager vedono e creano sul proprio tenant
CREATE POLICY "dipendenti_custom_select" ON dipendenti_custom
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "dipendenti_custom_insert" ON dipendenti_custom
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- 2. Colonna su turni
ALTER TABLE turni ADD COLUMN dipendente_custom_id uuid
  REFERENCES dipendenti_custom(id) ON DELETE RESTRICT;

-- 3. CHECK XOR: esattamente uno dei due deve essere valorizzato.
--    Le righe esistenti (dipendente_id NOT NULL, dipendente_custom_id NULL)
--    soddisfano già la prima condizione.
ALTER TABLE turni ADD CONSTRAINT check_dipendente_xor CHECK (
  (dipendente_id IS NOT NULL AND dipendente_custom_id IS NULL) OR
  (dipendente_id IS NULL     AND dipendente_custom_id IS NOT NULL)
);
```

- [ ] **Step 2: Applica la migrazione su Supabase**

Tramite Supabase MCP `apply_migration` (tool `mcp__claude_ai_Supabase__apply_migration`) oppure CLI:
```bash
supabase db push
```

- [ ] **Step 3: Verifica su SQL Editor Supabase**

```sql
-- Atteso: 2 righe, entrambe YES per is_nullable
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'turni'
  AND column_name IN ('dipendente_id', 'dipendente_custom_id');

-- Atteso: 1 riga
SELECT table_name FROM information_schema.tables WHERE table_name = 'dipendenti_custom';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/043_dipendenti_custom.sql
git commit -m "feat(db): tabella dipendenti_custom e colonna turni.dipendente_custom_id"
```

---

### Task 2: Tipi TypeScript

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Aggiungi interfaccia DipendenteCustom**

Subito dopo la chiusura di `Profile` (dopo la riga `}`  che chiude l'interfaccia, attorno alla riga 11), aggiungi:

```typescript
export interface DipendenteCustom {
  id: string
  nome: string
  cognome: string
  attivo: boolean
  created_at: string
}
```

- [ ] **Step 2: Aggiorna l'interfaccia Turno**

Sostituisci l'intera interfaccia `Turno` (righe 37-61) con:

```typescript
export interface Turno {
  id: string
  dipendente_id: string | null          // null quando è un dipendente custom
  dipendente_custom_id: string | null   // null quando è un dipendente reale
  template_id: string | null
  data: string        // "YYYY-MM-DD"
  ora_inizio: string  // "HH:MM:SS"
  ora_fine: string    // "HH:MM:SS"
  posto_id: string | null
  note: string | null
  creato_da: string
  created_at: string
  updated_at: string
  ora_ingresso_effettiva: string | null
  ora_uscita_effettiva: string | null
  stato: StatoTurno
  lat_checkin: number | null
  lng_checkin: number | null
  geo_anomalia: boolean
  sblocco_checkin_valido_fino: string | null
  sblocco_usato_at: string | null
  // join opzionali
  profile?: Profile | null
  dipendente_custom?: DipendenteCustom | null
  template?: TurnoTemplate | null | undefined
  posto?: PostoDiServizio | null
}
```

- [ ] **Step 3: Aggiorna TurnoConDettagli**

Sostituisci l'interfaccia `TurnoConDettagli` (righe 63-67) con:

```typescript
export interface TurnoConDettagli extends Turno {
  profile: Profile | null
  dipendente_custom: DipendenteCustom | null
  template: TurnoTemplate | null
  posto: PostoDiServizio | null
}
```

- [ ] **Step 4: Controlla gli errori TypeScript introdotti**

```bash
npx tsc --noEmit 2>&1
```

Annota tutti gli errori `Object is possibly 'null'` su `turno.profile.X` — saranno risolti nel Task 8. Per ora è atteso che ci siano errori.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): DipendenteCustom, Turno.dipendente_custom_id, profile nullable"
```

---

### Task 3: Utility nomeDipendente

**Files:**
- Modify: `lib/utils/turni.ts`

- [ ] **Step 1: Aggiungi import e funzione in fondo al file**

Alla fine di `lib/utils/turni.ts` aggiungi:

```typescript
import type { DipendenteCustom, Profile } from '@/lib/types'

export function nomeDipendente(turno: {
  profile?: Profile | null
  dipendente_custom?: DipendenteCustom | null
}): string {
  if (turno.profile) return `${turno.profile.cognome} ${turno.profile.nome}`
  if (turno.dipendente_custom) return `${turno.dipendente_custom.cognome} ${turno.dipendente_custom.nome}`
  return '—'
}
```

> Se `lib/types.ts` è già importato nel file, aggiorna l'import esistente invece di aggiungerne uno duplicato.

- [ ] **Step 2: Verifica compilazione del file**

```bash
npx tsc --noEmit 2>&1 | grep "utils/turni"
```

Atteso: nessun errore in questo file.

- [ ] **Step 3: Commit**

```bash
git add lib/utils/turni.ts
git commit -m "feat(utils): nomeDipendente helper per turni reali e custom"
```

---

### Task 4: API /api/dipendenti-custom

**Files:**
- Create: `app/api/dipendenti-custom/route.ts`

- [ ] **Step 1: Crea il file**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const tenantId = requireTenantId()
  const { data, error } = await supabase
    .from('dipendenti_custom')
    .select('id, nome, cognome')
    .eq('tenant_id', tenantId)
    .eq('attivo', true)
    .order('cognome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('ruolo')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'manager'].includes(profile.ruolo)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const tenantId = requireTenantId()
  let body: { nome?: string; cognome?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
  }

  const nome = body.nome?.trim()
  const cognome = body.cognome?.trim()
  if (!nome || !cognome) {
    return NextResponse.json({ error: 'nome e cognome sono obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('dipendenti_custom')
    .insert({ nome, cognome, tenant_id: tenantId })
    .select('id, nome, cognome')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Verifica TypeScript del file**

```bash
npx tsc --noEmit 2>&1 | grep "dipendenti-custom"
```

Atteso: nessun errore in questo file.

- [ ] **Step 3: Commit**

```bash
git add app/api/dipendenti-custom/route.ts
git commit -m "feat(api): GET e POST /api/dipendenti-custom"
```

---

### Task 5: Aggiornamento POST /api/turni

**Files:**
- Modify: `app/api/turni/route.ts`

- [ ] **Step 1: Aggiorna la costante SELECT (riga 8)**

Sostituisci:
```typescript
const SELECT = '*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)'
```
Con:
```typescript
const SELECT = '*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), dipendente_custom:dipendenti_custom!turni_dipendente_custom_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)'
```

- [ ] **Step 2: Sostituisci l'intera funzione POST**

Sostituisci tutto il blocco `export async function POST(request: Request) { ... }` con:

```typescript
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const tenantId = requireTenantId()
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON non valido' }, { status: 400 }) }

  const dipId = body.dipendente_id as string | null | undefined
  const dipCustomId = body.dipendente_custom_id as string | null | undefined
  const stato: 'bozza' | 'confermato' = body.stato === 'bozza' ? 'bozza' : 'confermato'

  if ((!dipId && !dipCustomId) || (dipId && dipCustomId)) {
    return NextResponse.json(
      { error: 'Specificare esattamente uno tra dipendente_id e dipendente_custom_id' },
      { status: 400 }
    )
  }

  // Controllo sovrapposizione per lo stesso stato
  let sovQuery = supabase.from('turni').select('id').eq('data', body.data as string).eq('stato', stato)
  if (dipId) sovQuery = sovQuery.eq('dipendente_id', dipId)
  else sovQuery = sovQuery.eq('dipendente_custom_id', dipCustomId!)
  const { data: esistente } = await sovQuery.maybeSingle()
  if (esistente) {
    return NextResponse.json(
      { error: `Il dipendente ha già un turno ${stato === 'bozza' ? 'in bozza' : 'ufficiale'} in questa data.` },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('turni')
    .insert({
      dipendente_id: dipId ?? null,
      dipendente_custom_id: dipCustomId ?? null,
      template_id: body.template_id ?? null,
      data: body.data,
      ora_inizio: body.ora_inizio,
      ora_fine: body.ora_fine,
      posto_id: body.posto_id ?? null,
      note: body.note ?? null,
      creato_da: user!.id,
      stato,
      tenant_id: tenantId,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifiche solo per dipendenti reali con account
  if (stato === 'confermato' && dipId) {
    await notificaTurnoAssegnato({
      turnoId: data.id,
      dipendenteId: dipId,
      data: data.data,
      oraInizio: data.ora_inizio,
      oraFine: data.ora_fine,
      actorId: user!.id,
      tenantId,
    })
  }

  logAzione({
    tabella: 'turni', recordId: data.id, azione: 'creato', utenteId: user!.id,
    dettagli: { dipendente_id: dipId ?? null, dipendente_custom_id: dipCustomId ?? null, data: data.data, stato },
    tenantId,
  })

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "turni/route"
```

Atteso: nessun errore in questo file.

- [ ] **Step 4: Commit**

```bash
git add app/api/turni/route.ts
git commit -m "feat(api): POST /api/turni supporta dipendente_custom_id"
```

---

### Task 6: Aggiornamento ModaleTurno

**Files:**
- Modify: `components/calendario/ModaleTurno.tsx`

- [ ] **Step 1: Aggiorna import da types (riga 6)**

Sostituisci:
```typescript
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio } from '@/lib/types'
```
Con:
```typescript
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio, DipendenteCustom } from '@/lib/types'
```

- [ ] **Step 2: Aggiungi import nomeDipendente (dopo gli import esistenti)**

```typescript
import { nomeDipendente } from '@/lib/utils/turni'
```

- [ ] **Step 3: Aggiorna ModaleTurnoProps (righe 11-25)**

Sostituisci l'intera interfaccia:
```typescript
interface ModaleTurnoProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    template_id: string | null
    ora_inizio: string
    ora_fine: string
    posto_id: string | null
    note: string
    dipendente_id?: string
    dipendente_custom_id?: string
  }) => Promise<string | void>
  onDelete?: () => void
  turno?: TurnoConDettagli | null
  templates: TurnoTemplate[]
  posti: PostoDiServizio[]
  dipendenteNome?: string
  dipendenti?: Profile[]
  dipendentiCustom?: DipendenteCustom[]
  data?: string   // YYYY-MM-DD
  postoIdDefault?: string
  readOnly?: boolean
  onTimbriAggiornati?: (ingresso: string | null, uscita: string | null) => void
}
```

- [ ] **Step 4: Aggiorna la destructuring (riga 34)**

```typescript
export function ModaleTurno({ open, onClose, onSave, onDelete, turno, templates, posti, dipendenteNome, dipendenti, dipendentiCustom, data, postoIdDefault, readOnly, onTimbriAggiornati }: ModaleTurnoProps) {
```

- [ ] **Step 5: Aggiungi nuovi stati (dopo riga 50, dopo `timbriCorretti`)**

```typescript
  const [modoDipendente, setModoDipendente] = useState<'reale' | 'custom'>('reale')
  const [dipendenteCustomId, setDipendenteCustomId] = useState('')
  const [aggiungendoNuovoCustom, setAggiungendoNuovoCustom] = useState(false)
  const [nuovoCustomNome, setNuovoCustomNome] = useState('')
  const [nuovoCustomCognome, setNuovoCustomCognome] = useState('')
```

- [ ] **Step 6: Aggiorna riga 52 — rinomina mostraSelectDipendente**

Sostituisci:
```typescript
  const mostraSelectDipendente = !turno && !dipendenteNome && !!dipendenti && dipendenti.length > 0
```
Con:
```typescript
  const mostraSezioneDipendente = !turno && !dipendenteNome && !!dipendenti && dipendenti.length > 0
```

- [ ] **Step 7: Aggiungi reset dei nuovi stati nell'useEffect (dopo `setTimbriCorretti(null)` a riga 78)**

```typescript
    setModoDipendente('reale')
    setDipendenteCustomId('')
    setAggiungendoNuovoCustom(false)
    setNuovoCustomNome('')
    setNuovoCustomCognome('')
```

- [ ] **Step 8: Sostituisci handleSave (righe 139-152)**

```typescript
  async function handleSave() {
    if (mostraSezioneDipendente) {
      if (modoDipendente === 'reale' && !dipendenteId) {
        setErrore('Seleziona un dipendente'); return
      }
      if (modoDipendente === 'custom' && !aggiungendoNuovoCustom && !dipendenteCustomId) {
        setErrore('Seleziona un dipendente esterno'); return
      }
      if (modoDipendente === 'custom' && aggiungendoNuovoCustom && (!nuovoCustomNome.trim() || !nuovoCustomCognome.trim())) {
        setErrore('Inserisci nome e cognome del dipendente esterno'); return
      }
    }
    if (!isRiposo && !postoId) { setErrore('Il posto di servizio è obbligatorio'); return }
    setSalvando(true)
    setErrore('')

    let customIdDaUsare = dipendenteCustomId
    if (mostraSezioneDipendente && modoDipendente === 'custom' && aggiungendoNuovoCustom) {
      const res = await fetch('/api/dipendenti-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nuovoCustomNome.trim(), cognome: nuovoCustomCognome.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErrore(d.error ?? 'Errore nella creazione del dipendente esterno')
        setSalvando(false)
        return
      }
      const created = await res.json()
      customIdDaUsare = created.id
    }

    const erroreApi = await onSave({
      template_id: templateId || null,
      ora_inizio: oraInizio + ':00',
      ora_fine: oraFine + ':00',
      posto_id: postoId || null,
      note,
      ...(mostraSezioneDipendente && modoDipendente === 'reale' ? { dipendente_id: dipendenteId } : {}),
      ...(mostraSezioneDipendente && modoDipendente === 'custom' ? { dipendente_custom_id: customIdDaUsare } : {}),
    })
    if (erroreApi) { setErrore(erroreApi); setSalvando(false) }
  }
```

- [ ] **Step 9: Sostituisci il blocco JSX "Dipendente" (righe 414-428)**

Sostituisci:
```tsx
        {mostraSelectDipendente && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500">Dipendente *</label>
            <select
              value={dipendenteId}
              onChange={e => { setDipendenteId(e.target.value); setErrore(''); setModificato(true) }}
              className={`w-full h-10 border rounded-lg px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors ${errore && !dipendenteId ? 'border-red-500' : 'border-gray-200'}`}
            >
              <option value="">— Seleziona —</option>
              {dipendenti!.map(d => (
                <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>
              ))}
            </select>
          </div>
        )}
```
Con:
```tsx
        {mostraSezioneDipendente && (
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500">Dipendente *</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => { setModoDipendente('reale'); setDipendenteCustomId(''); setAggiungendoNuovoCustom(false); setErrore('') }}
                className={`flex-1 py-2 font-medium transition-colors ${modoDipendente === 'reale' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Dipendente
              </button>
              <button
                type="button"
                onClick={() => { setModoDipendente('custom'); setDipendenteId(''); setErrore('') }}
                className={`flex-1 py-2 font-medium transition-colors ${modoDipendente === 'custom' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Esterno / Emergenza
              </button>
            </div>

            {modoDipendente === 'reale' && (
              <select
                value={dipendenteId}
                onChange={e => { setDipendenteId(e.target.value); setErrore(''); setModificato(true) }}
                className={`w-full h-10 border rounded-lg px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors ${errore && !dipendenteId ? 'border-red-500' : 'border-gray-200'}`}
              >
                <option value="">— Seleziona —</option>
                {dipendenti!.map(d => (
                  <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>
                ))}
              </select>
            )}

            {modoDipendente === 'custom' && !aggiungendoNuovoCustom && (
              <select
                value={dipendenteCustomId}
                onChange={e => {
                  if (e.target.value === '__nuovo__') {
                    setAggiungendoNuovoCustom(true)
                    setDipendenteCustomId('')
                  } else {
                    setDipendenteCustomId(e.target.value)
                    setErrore('')
                    setModificato(true)
                  }
                }}
                className={`w-full h-10 border rounded-lg px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors ${errore && !dipendenteCustomId ? 'border-red-500' : 'border-gray-200'}`}
              >
                <option value="">— Seleziona esterno —</option>
                {(dipendentiCustom ?? []).map(d => (
                  <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>
                ))}
                <option value="__nuovo__">+ Aggiungi nuovo...</option>
              </select>
            )}

            {modoDipendente === 'custom' && aggiungendoNuovoCustom && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-600">Nuovo dipendente esterno</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Nome"
                    value={nuovoCustomNome}
                    onChange={e => { setNuovoCustomNome(e.target.value); setModificato(true) }}
                  />
                  <Input
                    label="Cognome"
                    value={nuovoCustomCognome}
                    onChange={e => { setNuovoCustomCognome(e.target.value); setModificato(true) }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setAggiungendoNuovoCustom(false); setNuovoCustomNome(''); setNuovoCustomCognome('') }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Annulla
                </button>
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 10: Correggi l'accesso a turno.profile nel readOnly (riga ~200)**

Trova la riga:
```tsx
<span className="font-medium text-gray-900">{turno.profile.cognome} {turno.profile.nome}</span>
```
Sostituisci con:
```tsx
<span className="font-medium text-gray-900">{nomeDipendente(turno)}</span>
```

- [ ] **Step 11: Verifica TypeScript nel file**

```bash
npx tsc --noEmit 2>&1 | grep "ModaleTurno"
```

Atteso: nessun errore.

- [ ] **Step 12: Commit**

```bash
git add components/calendario/ModaleTurno.tsx
git commit -m "feat(ui): ModaleTurno supporta dipendenti esterni/emergenza"
```

---

### Task 7: Aggiornamento CalendarioPage

**Files:**
- Modify: `app/admin/calendario/page.tsx`

- [ ] **Step 1: Aggiorna import da types**

Trova la riga che importa da `@/lib/types` e aggiungi `DipendenteCustom`:
```typescript
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio, DipendenteCustom } from '@/lib/types'
```

- [ ] **Step 2: Aggiungi stato dipendentiCustom**

Dopo la riga `const [posti, setPosti] = useState<PostoDiServizio[]>([])`, aggiungi:
```typescript
  const [dipendentiCustom, setDipendentiCustom] = useState<DipendenteCustom[]>([])
```

- [ ] **Step 3: Aggiorna caricaDati per includere /api/dipendenti-custom**

Trova il `Promise.all` con le 5 fetch dentro `caricaDati` e sostituiscilo con:
```typescript
    const [utentiRes, templateRes, turniRes, postiRes, assenzeRes, dipCustomRes] = await Promise.all([
      fetch('/api/utenti'),
      fetch('/api/template'),
      fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
      fetch('/api/posti'),
      fetch(`/api/richieste/calendario?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
      fetch('/api/dipendenti-custom'),
    ])
    const [utenti, tmpl, trn, pst, asz, dipCustom] = await Promise.all([
      utentiRes.json(), templateRes.json(), turniRes.json(), postiRes.json(),
      assenzeRes.ok ? assenzeRes.json() : Promise.resolve([]),
      dipCustomRes.ok ? dipCustomRes.json() : Promise.resolve([]),
    ])
```

Poi aggiungi questa riga nel blocco dei `set*` subito dopo `setAssenze(...)`:
```typescript
    setDipendentiCustom(Array.isArray(dipCustom) ? dipCustom : [])
```

- [ ] **Step 4: Aggiorna la firma e il body di handleSalvaTurno**

Sostituisci l'intera funzione `handleSalvaTurno`:
```typescript
  async function handleSalvaTurno(payload: {
    template_id: string | null
    ora_inizio: string
    ora_fine: string
    posto_id: string | null
    note: string
    dipendente_id?: string
    dipendente_custom_id?: string
  }): Promise<string | void> {
    const res = modale.turno
      ? await fetch(`/api/turni/${modale.turno.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            dipendente_id: modale.turno.dipendente_id,
            data: modale.turno.data,
          }),
        })
      : await fetch('/api/turni', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            dipendente_id: payload.dipendente_id ?? modale.dipendenteId ?? null,
            dipendente_custom_id: payload.dipendente_custom_id ?? null,
            data: modale.data,
          }),
        })
    if (!res.ok) {
      const d = await res.json()
      return d.error ?? 'Errore nel salvataggio.'
    }
    setModale({ open: false })
    caricaDati()
  }
```

- [ ] **Step 5: Passa dipendentiCustom al ModaleTurno nel JSX**

Trova il tag `<ModaleTurno` nella pagina e aggiungi la prop `dipendentiCustom`:
```tsx
<ModaleTurno
  {/* ... props esistenti ... */}
  dipendentiCustom={dipendentiCustom}
  {/* ... */}
/>
```

- [ ] **Step 6: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "calendario/page"
```

Atteso: nessun errore.

- [ ] **Step 7: Commit**

```bash
git add app/admin/calendario/page.tsx
git commit -m "feat(calendario): carica dipendenti custom e passa a ModaleTurno"
```

---

### Task 8: Fix errori TypeScript residui e test manuale

**Files:**
- Modify: vari file con errori `Object is possibly 'null'` su `turno.profile`

- [ ] **Step 1: Raccogli tutti gli errori TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Per ogni errore del tipo `Object is possibly 'null'` su `turno.profile.X`:

**Pattern di fix — display nome:**
```typescript
// Prima
turno.profile.cognome + ' ' + turno.profile.nome
// Dopo (aggiungi import { nomeDipendente } from '@/lib/utils/turni' se mancante)
nomeDipendente(turno)
```

**Pattern di fix — accesso a proprietà specifica:**
```typescript
// Prima
turno.profile.id
// Dopo
turno.profile?.id
```

- [ ] **Step 2: Verifica finale zero errori**

```bash
npx tsc --noEmit
```

Atteso: nessun output (zero errori).

- [ ] **Step 3: Test manuale end-to-end**

1. Avvia `npm run dev`
2. Vai a `/admin/calendario`
3. Clicca "Nuovo turno" dal pulsante generale (non su una cella dipendente)
4. Verifica che appaia il toggle **Dipendente / Esterno Emergenza**
5. Clicca "Esterno / Emergenza" — il toggle si attiva
6. Seleziona "+ Aggiungi nuovo..." dal dropdown
7. Inserisci Nome: "Mario", Cognome: "Bianchi"
8. Completa il turno (ora inizio/fine, posto) e clicca Salva
9. Atteso: turno salvato senza errori (verifica su Supabase `SELECT * FROM turni WHERE dipendente_custom_id IS NOT NULL`)
10. Riapri "Nuovo turno" → "Esterno / Emergenza" → "Mario Bianchi" appare nel dropdown

- [ ] **Step 4: Commit finale**

```bash
git add .
git commit -m "fix(types): null-safety turno.profile dopo introduzione dipendenti custom"
```

---

## Limitazioni note (MVP)

- I turni di dipendenti custom non appaiono nella griglia del calendario (nessuna riga dedicata) — limitazione prevista, affrontabile in un secondo momento
- Nessun endpoint di modifica/cancellazione per `dipendenti_custom` (YAGNI)
- I manager non vedono i turni custom tramite le policy RLS attuali — solo gli admin li gestiscono
- L'export (`/api/admin/export-dati`) non include ancora i turni: quando verrà implementato, usare `nomeDipendente(turno)` per il nome e il join `dipendente_custom` già incluso nel SELECT di `/api/turni`
