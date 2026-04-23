# Calendario di programmazione (bozza) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un secondo calendario parallelo dove admin/manager possono pianificare turni in bozza e l'admin può confermarli in blocco per un periodo scelto, con notifiche aggregate solo alla conferma.

**Architecture:** Una singola colonna `stato` (`'bozza' | 'confermato'`) su `turni`. RLS filtra le bozze per i dipendenti. Helper `queryTurni` centralizza le letture e impone il filtro esplicito. 4 nuove pagine (admin + manager, per-dipendente + per-posto) che riusano i componenti calendario esistenti. 4 nuovi endpoint API: `conferma-periodo`, `copia-da-periodo`, `svuota-bozza-periodo`, `bozza-count`.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS + Realtime), TypeScript, Tailwind, Vitest per i test unitari.

**Spec di riferimento:** `docs/superpowers/specs/2026-04-23-calendario-programmazione-design.md`

**Contesto produzione:** un solo ambiente Supabase = prod. Ogni migration va applicata dall'utente a mano o tramite MCP con conferma esplicita. Stesso ambiente vale come "test" e "prod".

---

## Task 1: Migration 007 — Colonna `stato` e RLS dipendente

**Files:**
- Create: `supabase/migrations/007_turni_stato.sql`

- [ ] **Step 1: Scrivi la migration**

Crea `supabase/migrations/007_turni_stato.sql`:

```sql
-- supabase/migrations/007_turni_stato.sql
-- Aggiunge lo stato bozza/confermato ai turni e aggiorna la RLS
-- del dipendente per non esporgli mai le bozze.

create type stato_turno as enum ('bozza', 'confermato');

alter table turni
  add column stato stato_turno not null default 'confermato';

create index idx_turni_stato_data on turni(stato, data);

-- Dipendente: vede solo i propri turni CONFERMATI.
drop policy "dipendente_turni_select" on turni;
create policy "dipendente_turni_select" on turni
  for select using (
    get_my_role() = 'dipendente'
    and dipendente_id = auth.uid()
    and stato = 'confermato'
  );
```

- [ ] **Step 2: Applica la migration in produzione**

Conferma con l'utente prima di applicarla. Poi esegui via MCP (`mcp__claude_ai_Supabase__apply_migration`) oppure chiedi all'utente di eseguirla a mano nell'editor SQL di Supabase.

Verifica post-applicazione:
```sql
-- Ci si aspetta: stato_turno registrato come enum
select typname from pg_type where typname = 'stato_turno';
-- Ci si aspetta: tutti i turni esistenti a 'confermato'
select stato, count(*) from turni group by stato;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_turni_stato.sql
git commit -m "feat(programmazione): migration stato turni + RLS dipendente"
```

---

## Task 2: TypeScript — estendi `Turno` con `stato`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Aggiungi il tipo `StatoTurno` e il campo `stato` su `Turno`**

In `lib/types.ts`, dopo l'interfaccia `TurnoTemplate`, aggiungi il tipo e aggiorna `Turno`:

```ts
export type StatoTurno = 'bozza' | 'confermato'

export interface Turno {
  id: string
  dipendente_id: string
  template_id: string | null
  data: string
  ora_inizio: string
  ora_fine: string
  posto_id: string | null
  note: string | null
  creato_da: string
  created_at: string
  updated_at: string
  ora_ingresso_effettiva: string | null
  ora_uscita_effettiva: string | null
  stato: StatoTurno
  profile?: Profile
  template?: TurnoTemplate | null | undefined
  posto?: PostoDiServizio | null
}
```

- [ ] **Step 2: Verifica typecheck**

```bash
npx tsc --noEmit
```
Atteso: errori sui punti dove il select non include `stato` ma il tipo lo richiede. Li sistemiamo nei task successivi. Se non ci sono errori, ottimo.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(programmazione): tipo StatoTurno su Turno"
```

---

## Task 3: Helper `queryTurni` + test

**Files:**
- Create: `lib/supabase/turni.ts`
- Create: `tests/unit/queryTurni.test.ts`

- [ ] **Step 1: Scrivi il test (deve fallire perché l'helper non esiste ancora)**

Crea `tests/unit/queryTurni.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { queryTurni } from '@/lib/supabase/turni'

function makeClientMock() {
  const eq = vi.fn().mockReturnThis()
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from, select, eq, client: { from } as never }
}

describe('queryTurni', () => {
  it('filtra per stato=confermato di default', () => {
    const m = makeClientMock()
    queryTurni(m.client)
    expect(m.from).toHaveBeenCalledWith('turni')
    expect(m.select).toHaveBeenCalledWith('*')
    expect(m.eq).toHaveBeenCalledWith('stato', 'confermato')
  })

  it('filtra per stato=bozza quando richiesto', () => {
    const m = makeClientMock()
    queryTurni(m.client, 'bozza')
    expect(m.eq).toHaveBeenCalledWith('stato', 'bozza')
  })

  it('non applica alcun filtro con "tutti"', () => {
    const m = makeClientMock()
    queryTurni(m.client, 'tutti')
    expect(m.eq).not.toHaveBeenCalled()
  })

  it('passa una select custom se fornita', () => {
    const m = makeClientMock()
    queryTurni(m.client, 'confermati', '*, profile:profiles(*)')
    expect(m.select).toHaveBeenCalledWith('*, profile:profiles(*)')
  })
})
```

- [ ] **Step 2: Esegui il test — deve fallire**

```bash
npm test -- queryTurni
```
Atteso: fail — "Cannot find module '@/lib/supabase/turni'".

- [ ] **Step 3: Implementa l'helper**

Crea `lib/supabase/turni.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type FiltroTurni = 'confermati' | 'bozza' | 'tutti'

/**
 * Helper centralizzato per leggere turni.
 * Default: solo turni confermati. Per leggere bozze o entrambi, passarlo esplicitamente.
 */
export function queryTurni(
  client: SupabaseClient,
  filtro: FiltroTurni = 'confermati',
  select = '*'
) {
  const q = client.from('turni').select(select)
  if (filtro === 'confermati') return q.eq('stato', 'confermato')
  if (filtro === 'bozza') return q.eq('stato', 'bozza')
  return q
}
```

- [ ] **Step 4: Esegui il test — deve passare**

```bash
npm test -- queryTurni
```
Atteso: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/turni.ts tests/unit/queryTurni.test.ts
git commit -m "feat(programmazione): helper queryTurni centralizzato"
```

---

## Task 4: Migrazione delle letture esistenti a `queryTurni`

**Files:**
- Modify: `app/api/turni/route.ts`
- Modify: ogni route/componente che usa `.from('turni').select(...)` per leggere

- [ ] **Step 1: Trova tutte le letture**

```bash
grep -rn "from('turni')" --include='*.ts' --include='*.tsx' app lib components | grep -v "queryTurni\|export.ts"
```

Attesi (indicativi, verifica dalla tua lista reale):
- `app/api/turni/route.ts` — GET
- `app/api/turni/[id]/route.ts` — PUT/DELETE (letture del turno)
- `app/api/turni/copia-settimana/route.ts`
- `app/api/turni/[id]/check-in/route.ts`, `check-out/route.ts`
- `lib/utils/export.ts` (se legge turni)
- Altri endpoint di utility

- [ ] **Step 2: Aggiorna `app/api/turni/route.ts` GET per accettare parametro `stato`**

In `app/api/turni/route.ts`, sostituisci il body del `GET` così:

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notificaTurnoAssegnato } from '@/lib/notifiche'
import { queryTurni, FiltroTurni } from '@/lib/supabase/turni'

const SELECT = '*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const dataInizio = searchParams.get('data_inizio')
  const dataFine = searchParams.get('data_fine')
  const statoParam = searchParams.get('stato')
  const filtro: FiltroTurni = statoParam === 'bozza' ? 'bozza' : statoParam === 'tutti' ? 'tutti' : 'confermati'

  let query = queryTurni(supabase, filtro, SELECT).order('data')
  if (dataInizio) query = query.gte('data', dataInizio)
  if (dataFine) query = query.lte('data', dataFine)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Le altre letture di turni per ID (non liste)**

Letture singole tipo `select('...').eq('id', x).single()` NON passano da `queryTurni` perché il filtro per id è già univoco; non è rischioso. Lasciale invariate, ma in `[id]/check-in` e `check-out` aggiungeremo una guard `stato` nel task dedicato.

- [ ] **Step 4: Aggiorna `lib/utils/export.ts` (se legge turni direttamente)**

Se `export.ts` contiene un `.from('turni').select(...)`, sostituiscilo con una chiamata a `queryTurni(supabase, 'confermati', SELECT)`. Se usa turni passati già pronti dalla pagina, nessun cambiamento qui (la pagina invocante filtra `stato='confermato'` in fetch).

- [ ] **Step 5: Verifica build**

```bash
npm run build
```
Atteso: build pulita.

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "refactor(turni): passa le letture da queryTurni con filtro esplicito"
```

---

## Task 5: API `POST /api/turni` — accetta `stato`, dup check stato-aware, skip notify su bozza

**Files:**
- Modify: `app/api/turni/route.ts`

- [ ] **Step 1: Aggiorna POST**

In `app/api/turni/route.ts`, sostituisci il POST con questa versione:

```ts
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json()
  const stato: 'bozza' | 'confermato' = body.stato === 'bozza' ? 'bozza' : 'confermato'

  // Controllo sovrapposizione STESSO STATO — bozza e confermato vivono in namespace distinti
  const { data: esistente } = await supabase
    .from('turni')
    .select('id')
    .eq('dipendente_id', body.dipendente_id)
    .eq('data', body.data)
    .eq('stato', stato)
    .maybeSingle()
  if (esistente) {
    return NextResponse.json(
      { error: `Il dipendente ha già un turno ${stato === 'bozza' ? 'in bozza' : 'ufficiale'} in questa data.` },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('turni')
    .insert({
      dipendente_id: body.dipendente_id,
      template_id: body.template_id ?? null,
      data: body.data,
      ora_inizio: body.ora_inizio,
      ora_fine: body.ora_fine,
      posto_id: body.posto_id ?? null,
      note: body.note ?? null,
      creato_da: user!.id,
      stato,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Nessuna notifica sulle bozze: i dipendenti non sanno nulla finché non confermi.
  if (stato === 'confermato') {
    await notificaTurnoAssegnato({
      turnoId: data.id,
      dipendenteId: data.dipendente_id,
      data: data.data,
      oraInizio: data.ora_inizio,
      oraFine: data.ora_fine,
      actorId: user!.id,
    })
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Verifica typecheck**

```bash
npx tsc --noEmit
```
Atteso: pulito.

- [ ] **Step 3: Commit**

```bash
git add app/api/turni/route.ts
git commit -m "feat(programmazione): POST /api/turni accetta stato e salta la notifica su bozza"
```

---

## Task 6: API `PUT` e `DELETE` `/api/turni/[id]` — notifiche consapevoli dello stato

**Files:**
- Modify: `app/api/turni/[id]/route.ts`

- [ ] **Step 1: Leggi il file attuale**

```bash
cat app/api/turni/[id]/route.ts
```
Prendi nota del pattern di PUT/DELETE. La regola da applicare: se il turno è (o era, in caso di delete) in `bozza`, nessuna notifica.

- [ ] **Step 2: Modifica PUT**

Nell'handler PUT, dopo aver caricato il turno pre-update (o dopo l'update, a seconda del pattern attuale), aggiungi la guard:

```ts
// Pseudocodice — adatta al tuo handler esistente.
// Leggi il turno PRIMA dell'update per sapere lo stato precedente:
const { data: precedente } = await supabase
  .from('turni')
  .select('stato, template_id, data, ora_inizio, ora_fine, posto_id')
  .eq('id', params.id)
  .single()

// ... esegui l'update ...

// Notifica solo se il turno è (rimasto/diventato) CONFERMATO.
// Bozza → bozza: nessuna notifica.
// Bozza → confermato: non accade via PUT (succede via /conferma-periodo). Per sicurezza, skippa qui.
// Confermato → confermato: notifica come oggi, se i campi rilevanti sono cambiati.
if (precedente?.stato === 'confermato' && aggiornato.stato === 'confermato') {
  if (turnoCambiatoRilevante(precedente, aggiornato)) {
    await notificaTurnoModificato({ ... })
  }
}
```

Mantieni invariato il resto della logica di PUT (compreso `turnoCambiatoRilevante`).

- [ ] **Step 3: Modifica DELETE**

Guard analogo: leggi `stato` del turno prima del delete. Se era `'bozza'`, niente notifica.

```ts
const { data: precedente } = await supabase
  .from('turni')
  .select('stato, dipendente_id, data')
  .eq('id', params.id)
  .single()

// ... esegui il delete ...

if (precedente?.stato === 'confermato') {
  await notificaTurnoEliminato({
    dipendenteId: precedente.dipendente_id,
    data: precedente.data,
    actorId: user!.id,
  })
}
```

- [ ] **Step 4: Verifica typecheck**

```bash
npx tsc --noEmit
```
Atteso: pulito.

- [ ] **Step 5: Commit**

```bash
git add app/api/turni/[id]/route.ts
git commit -m "feat(programmazione): PUT/DELETE turno non notificano se bozza"
```

---

## Task 7: API `POST /api/turni/copia-settimana` — accetta `stato`

**Files:**
- Modify: `app/api/turni/copia-settimana/route.ts`

- [ ] **Step 1: Leggi il file**

```bash
cat app/api/turni/copia-settimana/route.ts
```

- [ ] **Step 2: Aggiungi il parametro `stato` al body e propagalo**

Alla ricezione del body, leggi `stato`:

```ts
const stato: 'bozza' | 'confermato' = body.stato === 'bozza' ? 'bozza' : 'confermato'
```

Quando costruisci le righe `insert` dei turni clonati, aggiungi `stato`:

```ts
const nuove = origine.map(t => ({
  dipendente_id: t.dipendente_id,
  template_id: t.template_id,
  ora_inizio: t.ora_inizio,
  ora_fine: t.ora_fine,
  posto_id: t.posto_id,
  note: t.note,
  data: /* data shiftata di 7 giorni */,
  creato_da: user!.id,
  stato,
}))
```

Se il codice attuale fa un pre-check di sovrapposizione, fallo filtrando per lo stesso `stato` (coerente con Task 5).

Alla fine, notifica solo se `stato === 'confermato'`:

```ts
if (stato === 'confermato') {
  await notificaSettimanaPianificata({ ... })
}
```

- [ ] **Step 3: Verifica typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/turni/copia-settimana/route.ts
git commit -m "feat(programmazione): copia-settimana supporta stato bozza"
```

---

## Task 8: API check-in/check-out — guard su `stato='bozza'`

**Files:**
- Modify: `app/api/turni/[id]/check-in/route.ts`
- Modify: `app/api/turni/[id]/check-out/route.ts`

- [ ] **Step 1: Aggiungi la guard in check-in**

In `app/api/turni/[id]/check-in/route.ts`, dopo aver caricato il turno, prima di qualsiasi altra validazione:

```ts
const { data: turno } = await supabase
  .from('turni')
  .select('dipendente_id, stato, ora_ingresso_effettiva, data, ora_inizio, ora_fine')
  .eq('id', params.id)
  .single()

if (!turno || turno.stato === 'bozza') {
  return NextResponse.json({ error: 'Turno non disponibile' }, { status: 404 })
}
```

404 (non 403) per non rivelare l'esistenza di bozze al dipendente.

- [ ] **Step 2: Stesso in check-out**

Applica lo stesso pattern a `check-out/route.ts`.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/turni/[id]/check-in/route.ts app/api/turni/[id]/check-out/route.ts
git commit -m "feat(programmazione): check-in/out 404 sui turni bozza"
```

---

## Task 9: Migration 008 + helper `notificaTurniPubblicati`

**Files:**
- Create: `supabase/migrations/008_notifiche_turni_pubblicati.sql`
- Modify: `lib/notifiche.ts`
- Modify: `components/layout/Notifiche.tsx`

- [ ] **Step 1: Scrivi la migration**

Crea `supabase/migrations/008_notifiche_turni_pubblicati.sql`:

```sql
-- supabase/migrations/008_notifiche_turni_pubblicati.sql
-- Aggiunge il tipo notifica 'turni_pubblicati' per la conferma in blocco.

alter table notifiche drop constraint if exists notifiche_tipo_check;
alter table notifiche add constraint notifiche_tipo_check
  check (tipo in (
    'turno_assegnato',
    'turno_modificato',
    'turno_eliminato',
    'settimana_pianificata',
    'check_in',
    'check_out',
    'turni_pubblicati'
  ));
```

Conferma con l'utente prima di applicarla.

- [ ] **Step 2: Estendi il tipo `Riga` e aggiungi il helper**

In `lib/notifiche.ts`, aggiungi `'turni_pubblicati'` all'union `tipo` dentro `Riga`:

```ts
type Riga = {
  destinatario_id: string
  tipo: 'turno_assegnato' | 'turno_modificato' | 'turno_eliminato' | 'settimana_pianificata' | 'check_in' | 'check_out' | 'turni_pubblicati'
  titolo: string
  messaggio: string
  turno_id?: string | null
  data_turno?: string | null
}
```

Aggiungi il nuovo helper alla fine del file:

```ts
export async function notificaTurniPubblicati(params: {
  dipendenteIds: string[]
  dataInizio: string
  dataFine: string
  actorId: string
  conteggioPerDipendente: Record<string, number>
}) {
  const righe: Riga[] = params.dipendenteIds
    .filter(id => id !== params.actorId)
    .map(id => ({
      destinatario_id: id,
      tipo: 'turni_pubblicati' as const,
      titolo: 'Turni pubblicati',
      messaggio: `${params.conteggioPerDipendente[id] ?? 0} turni dal ${formatDateIT(params.dataInizio)} al ${formatDateIT(params.dataFine)}`,
      turno_id: null,
      data_turno: params.dataInizio,
    }))
  await insertNotifiche(righe)
}
```

- [ ] **Step 3: Aggiungi il tipo a `TipoNotifica` in `lib/types.ts`**

```ts
export type TipoNotifica =
  | 'turno_assegnato'
  | 'turno_modificato'
  | 'turno_eliminato'
  | 'settimana_pianificata'
  | 'check_in'
  | 'check_out'
  | 'turni_pubblicati'
```

- [ ] **Step 4: Aggiungi l'icona in `Notifiche.tsx`**

In `components/layout/Notifiche.tsx`, estendi `iconaPerTipo`:

```ts
const iconaPerTipo: Record<Notifica['tipo'], string> = {
  turno_assegnato: '📅',
  turno_modificato: '✏️',
  turno_eliminato: '🗑️',
  settimana_pianificata: '🗓️',
  check_in: '🟢',
  check_out: '🔴',
  turni_pubblicati: '📣',
}
```

- [ ] **Step 5: Typecheck + build + commit**

```bash
npx tsc --noEmit && npm run build
git add supabase/migrations/008_notifiche_turni_pubblicati.sql lib/notifiche.ts lib/types.ts components/layout/Notifiche.tsx
git commit -m "feat(programmazione): tipo notifica turni_pubblicati + helper"
```

---

## Task 10: API `POST /api/turni/conferma-periodo`

**Files:**
- Create: `app/api/turni/conferma-periodo/route.ts`

- [ ] **Step 1: Scrivi la route**

Crea `app/api/turni/conferma-periodo/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { notificaTurniPubblicati } from '@/lib/notifiche'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profile?.ruolo !== 'admin') return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { data_inizio, data_fine } = body
  if (typeof data_inizio !== 'string' || typeof data_fine !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data_inizio) || !/^\d{4}-\d{2}-\d{2}$/.test(data_fine)) {
    return NextResponse.json({ error: 'data_inizio e data_fine (YYYY-MM-DD) richiesti' }, { status: 400 })
  }
  if (data_fine < data_inizio) {
    return NextResponse.json({ error: 'data_fine precede data_inizio' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Conta i turni bozza nel periodo, raggruppati per dipendente.
  const { data: bozze, error: readErr } = await admin
    .from('turni')
    .select('dipendente_id')
    .eq('stato', 'bozza')
    .gte('data', data_inizio)
    .lte('data', data_fine)
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!bozze || bozze.length === 0) {
    return NextResponse.json({ confermati: 0, dipendenti: 0 })
  }

  const conteggio: Record<string, number> = {}
  for (const t of bozze) {
    conteggio[t.dipendente_id] = (conteggio[t.dipendente_id] ?? 0) + 1
  }
  const dipendenteIds = Object.keys(conteggio)

  const { error: updErr } = await admin
    .from('turni')
    .update({ stato: 'confermato' })
    .eq('stato', 'bozza')
    .gte('data', data_inizio)
    .lte('data', data_fine)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await notificaTurniPubblicati({
    dipendenteIds,
    dataInizio: data_inizio,
    dataFine: data_fine,
    actorId: user.id,
    conteggioPerDipendente: conteggio,
  })

  return NextResponse.json({ confermati: bozze.length, dipendenti: dipendenteIds.length })
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add app/api/turni/conferma-periodo/route.ts
git commit -m "feat(programmazione): endpoint conferma-periodo"
```

---

## Task 11: API `POST /api/turni/copia-da-periodo`

**Files:**
- Create: `app/api/turni/copia-da-periodo/route.ts`

- [ ] **Step 1: Scrivi la route**

Crea `app/api/turni/copia-da-periodo/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { toDateString } from '@/lib/utils/date'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profile?.ruolo !== 'admin') return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { origine_inizio, origine_fine, destinazione_inizio } = body
  const re = /^\d{4}-\d{2}-\d{2}$/
  if (!re.test(origine_inizio) || !re.test(origine_fine) || !re.test(destinazione_inizio)) {
    return NextResponse.json({ error: 'Date non valide' }, { status: 400 })
  }
  if (origine_fine < origine_inizio) {
    return NextResponse.json({ error: 'origine_fine precede origine_inizio' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: origine, error: readErr } = await admin
    .from('turni')
    .select('dipendente_id, template_id, ora_inizio, ora_fine, posto_id, note, data')
    .eq('stato', 'confermato')
    .gte('data', origine_inizio)
    .lte('data', origine_fine)
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!origine || origine.length === 0) {
    return NextResponse.json({ copiati: 0 })
  }

  const giornoMs = 1000 * 60 * 60 * 24
  const shiftGiorni = Math.round(
    (new Date(destinazione_inizio).getTime() - new Date(origine_inizio).getTime()) / giornoMs
  )

  const nuove = origine.map(t => {
    const d = new Date(t.data + 'T00:00:00')
    d.setDate(d.getDate() + shiftGiorni)
    return {
      dipendente_id: t.dipendente_id,
      template_id: t.template_id,
      ora_inizio: t.ora_inizio,
      ora_fine: t.ora_fine,
      posto_id: t.posto_id,
      note: t.note,
      data: toDateString(d),
      stato: 'bozza' as const,
      creato_da: user.id,
    }
  })

  const { error: insErr } = await admin.from('turni').insert(nuove)
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ copiati: nuove.length })
}
```

Nota: nessuna notifica (tutti i record nuovi sono bozza).

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add app/api/turni/copia-da-periodo/route.ts
git commit -m "feat(programmazione): endpoint copia-da-periodo"
```

---

## Task 12: API `POST /api/turni/svuota-bozza-periodo`

**Files:**
- Create: `app/api/turni/svuota-bozza-periodo/route.ts`

- [ ] **Step 1: Scrivi la route**

Crea `app/api/turni/svuota-bozza-periodo/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profile?.ruolo !== 'admin') return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { data_inizio, data_fine } = body
  const re = /^\d{4}-\d{2}-\d{2}$/
  if (!re.test(data_inizio) || !re.test(data_fine)) {
    return NextResponse.json({ error: 'Date non valide' }, { status: 400 })
  }
  if (data_fine < data_inizio) {
    return NextResponse.json({ error: 'data_fine precede data_inizio' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('turni')
    .delete()
    .eq('stato', 'bozza')
    .gte('data', data_inizio)
    .lte('data', data_fine)
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ eliminati: data?.length ?? 0 })
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add app/api/turni/svuota-bozza-periodo/route.ts
git commit -m "feat(programmazione): endpoint svuota-bozza-periodo"
```

---

## Task 13: API `GET /api/turni/bozza-count`

**Files:**
- Create: `app/api/turni/bozza-count/route.ts`

- [ ] **Step 1: Scrivi la route**

Crea `app/api/turni/bozza-count/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const { count, error } = await supabase
    .from('turni')
    .select('id', { count: 'exact', head: true })
    .eq('stato', 'bozza')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: count ?? 0 })
}
```

RLS già filtra correttamente (admin/manager vedono le proprie bozze; dipendente comunque non vedrebbe perché la policy SELECT del dipendente richiede `stato='confermato'`).

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add app/api/turni/bozza-count/route.ts
git commit -m "feat(programmazione): endpoint bozza-count"
```

---

## Task 14: Utility preset periodo

**Files:**
- Create: `lib/utils/periodi.ts`
- Create: `tests/unit/periodi.test.ts`

- [ ] **Step 1: Scrivi i test (falliranno)**

Crea `tests/unit/periodi.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { presetPeriodo, type Periodo } from '@/lib/utils/periodi'

function d(s: string) { return new Date(s + 'T12:00:00') }

describe('presetPeriodo', () => {
  it('"settimana-corrente" ritorna lunedì-domenica', () => {
    // Mercoledì 22 aprile 2026
    const p: Periodo = presetPeriodo('settimana-corrente', d('2026-04-22'))
    expect(p.inizio).toBe('2026-04-20') // lunedì
    expect(p.fine).toBe('2026-04-26')   // domenica
  })

  it('"settimana-prossima"', () => {
    const p = presetPeriodo('settimana-prossima', d('2026-04-22'))
    expect(p.inizio).toBe('2026-04-27')
    expect(p.fine).toBe('2026-05-03')
  })

  it('"mese-corrente"', () => {
    const p = presetPeriodo('mese-corrente', d('2026-04-22'))
    expect(p.inizio).toBe('2026-04-01')
    expect(p.fine).toBe('2026-04-30')
  })

  it('"mese-prossimo"', () => {
    const p = presetPeriodo('mese-prossimo', d('2026-04-22'))
    expect(p.inizio).toBe('2026-05-01')
    expect(p.fine).toBe('2026-05-31')
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

```bash
npm test -- periodi
```
Atteso: "Cannot find module '@/lib/utils/periodi'".

- [ ] **Step 3: Implementa**

Crea `lib/utils/periodi.ts`:

```ts
import { toDateString } from './date'

export type PresetPeriodo = 'settimana-corrente' | 'settimana-prossima' | 'mese-corrente' | 'mese-prossimo'

export interface Periodo {
  inizio: string // YYYY-MM-DD
  fine: string   // YYYY-MM-DD
}

function lunediDellaSettimana(d: Date): Date {
  const r = new Date(d)
  const g = r.getDay() // 0=dom, 1=lun...
  const diff = g === 0 ? -6 : 1 - g
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

export function presetPeriodo(preset: PresetPeriodo, oggi: Date = new Date()): Periodo {
  if (preset === 'settimana-corrente') {
    const lun = lunediDellaSettimana(oggi)
    const dom = new Date(lun)
    dom.setDate(dom.getDate() + 6)
    return { inizio: toDateString(lun), fine: toDateString(dom) }
  }
  if (preset === 'settimana-prossima') {
    const lun = lunediDellaSettimana(oggi)
    lun.setDate(lun.getDate() + 7)
    const dom = new Date(lun)
    dom.setDate(dom.getDate() + 6)
    return { inizio: toDateString(lun), fine: toDateString(dom) }
  }
  if (preset === 'mese-corrente') {
    const inizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
    const fine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0)
    return { inizio: toDateString(inizio), fine: toDateString(fine) }
  }
  // mese-prossimo
  const inizio = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 1)
  const fine = new Date(oggi.getFullYear(), oggi.getMonth() + 2, 0)
  return { inizio: toDateString(inizio), fine: toDateString(fine) }
}
```

- [ ] **Step 4: Esegui — deve passare**

```bash
npm test -- periodi
```

- [ ] **Step 5: Commit**

```bash
git add lib/utils/periodi.ts tests/unit/periodi.test.ts
git commit -m "feat(programmazione): utility preset periodo"
```

---

## Task 15: Componente `HeaderProgrammazione`

**Files:**
- Create: `components/programmazione/HeaderProgrammazione.tsx`

- [ ] **Step 1: Scrivi il componente**

Crea `components/programmazione/HeaderProgrammazione.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { presetPeriodo, type PresetPeriodo, type Periodo } from '@/lib/utils/periodi'
import { formatDateIT } from '@/lib/utils/date'

interface Props {
  periodo: Periodo
  onPeriodoChange: (p: Periodo) => void
  onConferma: () => void
  onCopiaDaPeriodo: () => void
  onSvuotaBozza: () => void
  readOnly?: boolean
  bozzeNelPeriodo: number
}

const PRESETS: { id: PresetPeriodo; label: string }[] = [
  { id: 'settimana-corrente', label: 'Questa settimana' },
  { id: 'settimana-prossima', label: 'Prossima settimana' },
  { id: 'mese-corrente', label: 'Mese corrente' },
  { id: 'mese-prossimo', label: 'Prossimo mese' },
]

export function HeaderProgrammazione({
  periodo, onPeriodoChange, onConferma, onCopiaDaPeriodo, onSvuotaBozza, readOnly, bozzeNelPeriodo
}: Props) {
  const [custom, setCustom] = useState(false)

  function applicaPreset(id: PresetPeriodo) {
    onPeriodoChange(presetPeriodo(id))
    setCustom(false)
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-900">
        📝 <strong>Modalità bozza</strong> — i turni non sono visibili ai dipendenti finché non li confermi.
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => applicaPreset(p.id)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setCustom(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${custom ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            Personalizzato
          </button>
        </div>

        {custom && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-gray-600 flex items-center gap-2">
              Da
              <input
                type="date"
                value={periodo.inizio}
                onChange={e => onPeriodoChange({ ...periodo, inizio: e.target.value })}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-gray-600 flex items-center gap-2">
              a
              <input
                type="date"
                value={periodo.fine}
                onChange={e => onPeriodoChange({ ...periodo, fine: e.target.value })}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              />
            </label>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            Periodo: <strong>{formatDateIT(periodo.inizio)} → {formatDateIT(periodo.fine)}</strong>
            {' · '}
            <span className="text-gray-500">{bozzeNelPeriodo} turni bozza</span>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <button onClick={onCopiaDaPeriodo} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                Copia da ufficiale
              </button>
              <button
                onClick={onSvuotaBozza}
                disabled={bozzeNelPeriodo === 0}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Svuota bozza
              </button>
              <button
                onClick={onConferma}
                disabled={bozzeNelPeriodo === 0}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
              >
                Conferma periodo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/programmazione/HeaderProgrammazione.tsx
git commit -m "feat(programmazione): componente HeaderProgrammazione"
```

---

## Task 16: Modali azioni (Conferma, Copia, Svuota)

**Files:**
- Create: `components/programmazione/ModaleConfermaPeriodo.tsx`
- Create: `components/programmazione/ModaleCopiaDaPeriodo.tsx`
- Create: `components/programmazione/ModaleSvuotaBozza.tsx`

- [ ] **Step 1: `ModaleConfermaPeriodo.tsx`**

```tsx
'use client'
import { formatDateIT } from '@/lib/utils/date'

interface Props {
  open: boolean
  periodo: { inizio: string; fine: string }
  bozze: number
  onConferma: () => void
  onAnnulla: () => void
  loading: boolean
}

export function ModaleConfermaPeriodo({ open, periodo, bozze, onConferma, onAnnulla, loading }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Conferma periodo</h2>
        <p className="text-sm text-gray-700 mt-3">
          Pubblicare <strong>{bozze} turni</strong> dal {formatDateIT(periodo.inizio)} al {formatDateIT(periodo.fine)}?
        </p>
        <p className="text-xs text-gray-500 mt-2">
          I dipendenti riceveranno una notifica aggregata e vedranno i turni sul calendario.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onAnnulla} disabled={loading} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
            Annulla
          </button>
          <button onClick={onConferma} disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50">
            {loading ? 'Conferma in corso…' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `ModaleCopiaDaPeriodo.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { formatDateIT } from '@/lib/utils/date'

interface Props {
  open: boolean
  destinazione: { inizio: string; fine: string }
  onConferma: (origineInizio: string, origineFine: string) => void
  onAnnulla: () => void
  loading: boolean
}

export function ModaleCopiaDaPeriodo({ open, destinazione, onConferma, onAnnulla, loading }: Props) {
  // Default: periodo origine = stesso range traslato all'indietro.
  const durata = (new Date(destinazione.fine).getTime() - new Date(destinazione.inizio).getTime()) / 86400000
  const defaultInizio = new Date(destinazione.inizio)
  defaultInizio.setDate(defaultInizio.getDate() - (durata + 1))
  const defaultFine = new Date(defaultInizio)
  defaultFine.setDate(defaultFine.getDate() + durata)

  const toStr = (d: Date) => d.toISOString().slice(0, 10)
  const [inizio, setInizio] = useState(toStr(defaultInizio))
  const [fine, setFine] = useState(toStr(defaultFine))

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Copia da periodo ufficiale</h2>
        <p className="text-sm text-gray-700 mt-3">
          Copia i turni ufficiali selezionati nella bozza del periodo{' '}
          <strong>{formatDateIT(destinazione.inizio)} → {formatDateIT(destinazione.fine)}</strong>.
          Le date verranno shiftate automaticamente.
        </p>
        <div className="mt-4 space-y-2">
          <label className="text-xs text-gray-600 flex items-center gap-2">
            Origine da
            <input type="date" value={inizio} onChange={e => setInizio(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="text-xs text-gray-600 flex items-center gap-2">
            Origine a
            <input type="date" value={fine} onChange={e => setFine(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm" />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onAnnulla} disabled={loading} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
            Annulla
          </button>
          <button onClick={() => onConferma(inizio, fine)} disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50">
            {loading ? 'Copia in corso…' : 'Copia'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `ModaleSvuotaBozza.tsx`**

```tsx
'use client'
import { formatDateIT } from '@/lib/utils/date'

interface Props {
  open: boolean
  periodo: { inizio: string; fine: string }
  bozze: number
  onConferma: () => void
  onAnnulla: () => void
  loading: boolean
}

export function ModaleSvuotaBozza({ open, periodo, bozze, onConferma, onAnnulla, loading }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Svuota bozza del periodo</h2>
        <p className="text-sm text-gray-700 mt-3">
          Eliminare <strong>{bozze} turni bozza</strong> dal {formatDateIT(periodo.inizio)} al {formatDateIT(periodo.fine)}?
        </p>
        <p className="text-xs text-red-600 mt-2">
          L'operazione è irreversibile. I turni ufficiali non vengono toccati.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onAnnulla} disabled={loading} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
            Annulla
          </button>
          <button onClick={onConferma} disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold disabled:opacity-50">
            {loading ? 'Eliminazione…' : 'Svuota'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/programmazione/
git commit -m "feat(programmazione): modali conferma, copia, svuota"
```

---

## Task 17: Chip "BOZZA" nel `ModaleTurno`

**Files:**
- Modify: `components/calendario/ModaleTurno.tsx`

- [ ] **Step 1: Passa lo `stato` del turno al modale e mostra chip**

In `ModaleTurno.tsx`, nell'header del modale (accanto al titolo), aggiungi:

```tsx
{turno?.stato === 'bozza' && (
  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-semibold tracking-wide">
    BOZZA
  </span>
)}
```

`turno?.stato` è già nel tipo `Turno` (Task 2), nessuna prop nuova.

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add components/calendario/ModaleTurno.tsx
git commit -m "feat(programmazione): chip BOZZA nel ModaleTurno"
```

---

## Task 18: Pagina `/admin/calendario-programmazione`

**Files:**
- Create: `app/admin/calendario-programmazione/page.tsx`

- [ ] **Step 1: Crea la pagina copiando la struttura di `/admin/calendario/page.tsx`**

Punti chiave di differenza rispetto alla pagina ufficiale:

1. Aggiunge state `periodo: Periodo` inizializzato a `presetPeriodo('mese-corrente')`
2. Il fetch turni usa il periodo (non la settimana corrente): `fetch(\`/api/turni?stato=bozza&data_inizio=\${periodo.inizio}&data_fine=\${periodo.fine}\`)`
3. Render di `<HeaderProgrammazione>` in cima
4. Le azioni del header aprono i tre modali
5. Nella POST/PUT/DELETE turno, passa `stato: 'bozza'` al body
6. Nell'operazione di copia-settimana dalla pagina passa `stato: 'bozza'`

Template:

```tsx
'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { GrigliaCalendario } from '@/components/calendario/GrigliaCalendario'
import { GrigliaCalendarioMobile } from '@/components/calendario/GrigliaCalendarioMobile'
import { ModaleTurno } from '@/components/calendario/ModaleTurno'
import { HeaderProgrammazione } from '@/components/programmazione/HeaderProgrammazione'
import { ModaleConfermaPeriodo } from '@/components/programmazione/ModaleConfermaPeriodo'
import { ModaleCopiaDaPeriodo } from '@/components/programmazione/ModaleCopiaDaPeriodo'
import { ModaleSvuotaBozza } from '@/components/programmazione/ModaleSvuotaBozza'
import { Profile, TurnoConDettagli, TurnoTemplate, PostoDiServizio } from '@/lib/types'
import { getDaysBetween, toDateString } from '@/lib/utils/date'
import { presetPeriodo, type Periodo } from '@/lib/utils/periodi'
import { AlertErrore } from '@/components/ui/AlertErrore'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'

export default function CalendarioProgrammazionePage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => presetPeriodo('mese-corrente'))
  const [dipendenti, setDipendenti] = useState<Profile[]>([])
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [templates, setTemplates] = useState<TurnoTemplate[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [modale, setModale] = useState<{ open: boolean; dipendenteId?: string; data?: string; turno?: TurnoConDettagli | null }>({ open: false })
  const [modaleConferma, setModaleConferma] = useState(false)
  const [modaleCopia, setModaleCopia] = useState(false)
  const [modaleSvuota, setModaleSvuota] = useState(false)
  const [loadingAzione, setLoadingAzione] = useState(false)
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(true)

  const giorni = useMemo(() => getDaysBetween(periodo.inizio, periodo.fine), [periodo])

  const caricaDati = useCallback(async () => {
    setErrore('')
    setLoading(true)
    try {
      const [u, tp, tr, po] = await Promise.all([
        fetch('/api/utenti').then(r => r.json()),
        fetch('/api/template').then(r => r.json()),
        fetch(`/api/turni?stato=bozza&data_inizio=${periodo.inizio}&data_fine=${periodo.fine}`).then(r => r.json()),
        fetch('/api/posti').then(r => r.json()),
      ])
      setDipendenti(u.filter((x: Profile) => x.ruolo === 'dipendente' && x.attivo))
      setTemplates(tp)
      setTurni(tr)
      setPosti(po)
    } catch {
      setErrore('Errore nel caricamento dei dati.')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { caricaDati() }, [caricaDati])

  async function handleSalvaTurno(payload: { template_id: string | null; ora_inizio: string; ora_fine: string; posto_id: string | null; note: string; dipendente_id?: string }) {
    const res = modale.turno
      ? await fetch(`/api/turni/${modale.turno.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, dipendente_id: modale.turno.dipendente_id, data: modale.turno.data, stato: 'bozza' }),
        })
      : await fetch('/api/turni', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, dipendente_id: payload.dipendente_id ?? modale.dipendenteId, data: modale.data, stato: 'bozza' }),
        })
    if (!res.ok) {
      const d = await res.json()
      return d.error ?? 'Errore nel salvataggio.'
    }
    setModale({ open: false })
    caricaDati()
  }

  async function handleEliminaTurno() {
    if (!modale.turno) return
    await fetch(`/api/turni/${modale.turno.id}`, { method: 'DELETE' })
    setModale({ open: false })
    caricaDati()
  }

  async function handleConferma() {
    setLoadingAzione(true)
    const res = await fetch('/api/turni/conferma-periodo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_inizio: periodo.inizio, data_fine: periodo.fine }),
    })
    const d = await res.json()
    setLoadingAzione(false)
    setModaleConferma(false)
    if (res.ok) {
      alert(`${d.confermati} turni pubblicati per ${d.dipendenti} dipendenti.`)
      caricaDati()
    } else {
      alert(d.error ?? 'Errore durante la conferma.')
    }
  }

  async function handleCopia(origineInizio: string, origineFine: string) {
    setLoadingAzione(true)
    const res = await fetch('/api/turni/copia-da-periodo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origine_inizio: origineInizio,
        origine_fine: origineFine,
        destinazione_inizio: periodo.inizio,
      }),
    })
    const d = await res.json()
    setLoadingAzione(false)
    setModaleCopia(false)
    if (res.ok) {
      alert(`${d.copiati} turni copiati in bozza.`)
      caricaDati()
    } else {
      alert(d.error ?? 'Errore durante la copia.')
    }
  }

  async function handleSvuota() {
    setLoadingAzione(true)
    const res = await fetch('/api/turni/svuota-bozza-periodo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_inizio: periodo.inizio, data_fine: periodo.fine }),
    })
    const d = await res.json()
    setLoadingAzione(false)
    setModaleSvuota(false)
    if (res.ok) {
      alert(`${d.eliminati} turni bozza eliminati.`)
      caricaDati()
    } else {
      alert(d.error ?? 'Errore durante lo svuotamento.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Programmazione</h1>
      </div>

      <HeaderProgrammazione
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onConferma={() => setModaleConferma(true)}
        onCopiaDaPeriodo={() => setModaleCopia(true)}
        onSvuotaBozza={() => setModaleSvuota(true)}
        bozzeNelPeriodo={turni.length}
      />

      {errore && <AlertErrore messaggio={errore} onRetry={caricaDati} />}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <SkeletonCalendario righe={dipendenti.length || 4} colonne={giorni.length} />
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <GrigliaCalendario
              giorni={giorni}
              dipendenti={dipendenti}
              turni={turni}
              onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
              onEditTurno={turno => setModale({ open: true, turno })}
            />
          </div>
          <div className="md:hidden">
            <GrigliaCalendarioMobile
              giorni={giorni}
              dipendenti={dipendenti}
              turni={turni}
              onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
              onEditTurno={turno => setModale({ open: true, turno })}
              onDataSelezionataChange={() => {}}
            />
          </div>
        </>
      )}

      <ModaleTurno
        open={modale.open}
        onClose={() => setModale({ open: false })}
        onSave={handleSalvaTurno}
        onDelete={modale.turno ? handleEliminaTurno : undefined}
        turno={modale.turno}
        templates={templates}
        posti={posti}
        dipendenti={dipendenti}
        data={modale.data}
      />

      <ModaleConfermaPeriodo
        open={modaleConferma}
        periodo={periodo}
        bozze={turni.length}
        onConferma={handleConferma}
        onAnnulla={() => setModaleConferma(false)}
        loading={loadingAzione}
      />
      <ModaleCopiaDaPeriodo
        open={modaleCopia}
        destinazione={periodo}
        onConferma={handleCopia}
        onAnnulla={() => setModaleCopia(false)}
        loading={loadingAzione}
      />
      <ModaleSvuotaBozza
        open={modaleSvuota}
        periodo={periodo}
        bozze={turni.length}
        onConferma={handleSvuota}
        onAnnulla={() => setModaleSvuota(false)}
        loading={loadingAzione}
      />
    </div>
  )
}
```

- [ ] **Step 2: Se non esiste già, aggiungi `getDaysBetween` in `lib/utils/date.ts`**

Verifica in `lib/utils/date.ts` se c'è un helper che genera array di `Date` dati due estremi. Se no, aggiungi:

```ts
export function getDaysBetween(inizio: string, fine: string): Date[] {
  const giorni: Date[] = []
  const d = new Date(inizio + 'T00:00:00')
  const end = new Date(fine + 'T00:00:00')
  while (d <= end) {
    giorni.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return giorni
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add app/admin/calendario-programmazione/page.tsx lib/utils/date.ts
git commit -m "feat(programmazione): pagina /admin/calendario-programmazione"
```

---

## Task 19: Pagina `/admin/calendario-programmazione-posti`

**Files:**
- Create: `app/admin/calendario-programmazione-posti/page.tsx`

- [ ] **Step 1: Crea la pagina**

Specchio di Task 18 ma basato su `GrigliaCalendarioPosti` + `GrigliaCalendarioPostiMobile`. Parti da `app/admin/calendario-posti/page.tsx`, copia la struttura, e applica le stesse modifiche descritte in Task 18 (periodo, filtri stato, modali azione, header programmazione).

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add app/admin/calendario-programmazione-posti/page.tsx
git commit -m "feat(programmazione): pagina /admin/calendario-programmazione-posti"
```

---

## Task 20: Pagine manager read-only

**Files:**
- Create: `app/manager/calendario-programmazione/page.tsx`
- Create: `app/manager/calendario-programmazione-posti/page.tsx`

- [ ] **Step 1: Pagina `/manager/calendario-programmazione`**

Clone della pagina admin di Task 18 con due differenze:

1. `<HeaderProgrammazione readOnly bozzeNelPeriodo={turni.length} ... />` (nasconde i bottoni azione)
2. Su `ModaleTurno`, passa `onSave={undefined}` e `onDelete={undefined}` — oppure, più pulito: non apri neanche la modale e su `onEditTurno` apri una versione read-only (se esiste) o una versione "readonly" con `onSave={() => Promise.resolve()}` disabled. Pragmatico: disabilita il click su celle vuote e mostra il modale solo in sola lettura.

Versione semplice: mostra la griglia SENZA onAddTurno (riga sotto) e onEditTurno apre la modale in "read" — se `ModaleTurno` non ha un flag read-only esplicito, puoi passarle onSave che fa `alert('Read-only')` o una no-op.

Scelta raccomandata: aggiungi una prop `readOnly?: boolean` al `ModaleTurno` (piccola modifica, Task 17-bis implicita) che nasconde `Salva` e `Elimina`. Se la riservi al manager, la coerenza della UI è migliore.

Se preferisci non toccare `ModaleTurno`, la versione quick-and-dirty: non agganciare `onAddTurno`/`onEditTurno` alle griglie (la mappa `onEditTurno={() => {}}`). Il manager può comunque navigare periodi e vedere le bozze, che è il requisito MVP.

- [ ] **Step 2: Pagina `/manager/calendario-programmazione-posti`**

Stessa cosa, su posti.

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add app/manager/calendario-programmazione/ app/manager/calendario-programmazione-posti/
git commit -m "feat(programmazione): pagine manager read-only"
```

---

## Task 21: Sidebar — voce Programmazione + badge contatore

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `app/manager/layout.tsx`
- Modify: `components/layout/Sidebar.tsx` (per supportare badge numerico)
- Create: `components/layout/BozzaCounter.tsx` (client, gestisce Realtime)

- [ ] **Step 1: Estendi `Sidebar` per accettare un badge numerico per voce**

In `components/layout/Sidebar.tsx`, estendi `NavItem` e il rendering:

```tsx
interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number // Se > 0, mostra un badge accanto al label
}
```

Nel rendering del link:

```tsx
<Link ...>
  <span className="text-[15px] leading-none">{item.icon}</span>
  <span className="flex-1">{item.label}</span>
  {typeof item.badge === 'number' && item.badge > 0 && (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center">
      {item.badge > 99 ? '99+' : item.badge}
    </span>
  )}
</Link>
```

- [ ] **Step 2: Hook/componente `BozzaCounter`**

Crea `components/layout/BozzaCounter.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useBozzaCount(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function carica() {
      const res = await fetch('/api/turni/bozza-count')
      if (!res.ok) return
      const d = await res.json()
      if (mounted) setCount(d.count ?? 0)
    }
    carica()

    const canale = supabase
      .channel('bozza_count_turni')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turni' }, () => carica())
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(canale) }
  }, [])
  return count
}
```

- [ ] **Step 3: Aggiungi la voce in `app/admin/layout.tsx`**

Siccome `NAV_ITEMS` è statico mentre `bozzaCount` è dinamico, il layout è server — spostiamo il blocco `Sidebar` in un wrapper client. Opzione più semplice: layout server come oggi, ma la Sidebar si auto-popola del contatore tramite un componente client che la wrappa.

Soluzione pragmatica: crea `components/layout/SidebarAdmin.tsx` (client) che tiene l'array voci e aggancia `useBozzaCount`:

```tsx
'use client'
import { Sidebar } from './Sidebar'
import { useBozzaCount } from './BozzaCounter'

const BASE_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { label: 'Calendario', href: '/admin/calendario', icon: '📅' },
  { label: 'Per posto', href: '/admin/calendario-posti', icon: '📍' },
  { label: 'Programmazione', href: '/admin/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per posto', href: '/admin/calendario-programmazione-posti', icon: '📝' },
  { label: 'Template', href: '/admin/template', icon: '🏷️' },
  { label: 'Export', href: '/admin/export', icon: '📤' },
  { label: 'Utenti', href: '/admin/utenti', icon: '👥' },
  { label: 'Posti', href: '/admin/posti', icon: '📍' },
  { label: 'Festivi', href: '/admin/festivi', icon: '🎉' },
]

export function SidebarAdmin() {
  const bozza = useBozzaCount()
  const items = BASE_ITEMS.map(it => it.href === '/admin/calendario-programmazione'
    ? { ...it, badge: bozza }
    : it)
  return <Sidebar items={items} title="GestioneTurni" ruolo="admin" />
}
```

In `app/admin/layout.tsx`, sostituisci `<Sidebar items={NAV_ITEMS} ... />` con `<SidebarAdmin />`. Rimuovi l'import inutilizzato di `Sidebar` e la costante `NAV_ITEMS` se non usata altrove (nota: `BottomNav` la usa, quindi tienila o riorganizza — duplica per mantenere il cambio locale).

- [ ] **Step 4: Stesso trattamento per manager (senza badge)**

Crea `components/layout/SidebarManager.tsx` simile, ma senza `useBozzaCount` (spec: niente badge per manager). Aggiungi solo le due voci programmazione:

```tsx
const ITEMS = [
  ...,
  { label: 'Programmazione', href: '/manager/calendario-programmazione', icon: '📝' },
  { label: 'Programmazione per posto', href: '/manager/calendario-programmazione-posti', icon: '📝' },
  ...
]
```

Sostituisci in `app/manager/layout.tsx`.

- [ ] **Step 5: Aggiorna anche `BottomNav` se include le stesse voci**

Leggi `components/layout/BottomNav.tsx`. Se mostra un subset delle voci (tipo solo Dashboard/Calendario/Export), non aggiungere Programmazione lì (la bottom nav deve restare compatta). Altrimenti adatta in modo consistente.

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add components/layout/ app/admin/layout.tsx app/manager/layout.tsx
git commit -m "feat(programmazione): sidebar entry + badge contatore"
```

---

## Task 22: Testing manuale end-to-end

- [ ] **Step 1: Avvia dev server**

```bash
npm run dev
```

- [ ] **Step 2: Scenario admin — creazione e conferma**

1. Login come admin
2. Sidebar: clicca "Programmazione" → pagina caricata con banner "Modalità bozza" + header preset
3. Seleziona "Mese prossimo"
4. Crea 3 turni per 2 dipendenti diversi → turni compaiono nella griglia → badge sidebar sale (verifica sul numero)
5. Click "Copia da ufficiale" → copia l'ultima settimana ufficiale nelle prime date del mese prossimo
6. Verifica: turni di bozza si moltiplicano; badge aggiornato
7. Click "Conferma periodo" → modale: "Pubblicare X turni per Y dipendenti?"
8. Conferma → alert "X turni pubblicati per Y dipendenti" → griglia programmazione si svuota → badge scende

- [ ] **Step 3: Scenario dipendente — visibilità**

Prima e durante la fase bozza: apri in un altro browser (o incognito) come dipendente.

1. `/dipendente/turni` → non deve mostrare i turni bozza
2. Campanella notifiche → nessun INSERT nuovo durante la bozza
3. Dopo la conferma: appare una notifica aggregata "N turni pubblicati dal X al Y" → click → apre `/dipendente/turni?data=<inizio>` che ora mostra i turni nuovi

- [ ] **Step 4: Scenario manager — read-only**

Login come manager:

1. Sidebar: "Programmazione" visibile senza badge
2. Pagina accessibile, turni bozza del reparto visibili, nessun bottone azione
3. Tap su un turno → modale in read-only (o chiusa senza onEdit, a seconda scelta implementativa)

- [ ] **Step 5: Scenario svuotamento e preset custom**

1. Torna admin → programmazione
2. Crea alcune bozze
3. Usa "Personalizzato" e metti un range che le copre
4. "Svuota bozza" → modale → conferma → le bozze spariscono → badge aggiornato

- [ ] **Step 6: Verifica esclusioni (regressioni)**

1. Calendario ufficiale admin: nessuna bozza visibile anche se presenti in DB
2. Calendario manager ufficiale: idem
3. Export PDF/Excel: nessuna bozza inclusa
4. Check-in/out banner dipendente: non compare per bozza
5. Dashboard admin contatori: non conta bozze

- [ ] **Step 7: Se tutto ok, push**

```bash
git push origin master
```

---

## Self-review del plan

**Spec coverage:**

- Sezione 1 Obiettivo → Task 17-21
- Sezione 2 Scope → tutti i task contribuiscono
- Sezione 3 Data model → Task 1, 2
- Sezione 4 RLS → Task 1
- Sezione 5 Helper queryTurni → Task 3, 4
- Sezione 6 API → Task 5, 6, 7, 8, 10, 11, 12, 13
- Sezione 7 Notifiche → Task 9
- Sezione 8 UI nuove pagine → Task 14, 15, 16, 17, 18, 19, 20
- Sezione 9 Navigazione e badge → Task 21
- Sezione 10 Esclusioni → Task 4 (helper) + Task 22 Step 6 (verifica)
- Sezione 11 Edge cases → gestiti nelle singole route (idempotenza, validazione date, guard bozza)
- Sezione 12 Testing manuale → Task 22

**Placeholder scan:** nessun "TBD" o "implement later". Ogni task ha codice pronto o istruzioni puntuali.

**Type consistency:**
- `FiltroTurni` (Task 3) usato in Task 4 ✓
- `Periodo` (Task 14) usato in Task 15, 16, 18-20 ✓
- `StatoTurno` (Task 2) usato in Task 5 ✓
- `notificaTurniPubblicati` firma (Task 9) usata in Task 10 ✓

**Gap noti da tenere in mente durante l'esecuzione:**
- Task 20 ha una scelta "quick vs clean" su `ModaleTurno` read-only. Durante l'esecuzione scegli la versione clean (nuova prop `readOnly`) se ti trovi bene a toccare `ModaleTurno`, altrimenti la quick.
- Task 4 grep è aperto: la lista esatta dei file da migrare emerge dal grep stesso.
- Task 21 se `NAV_ITEMS` è condiviso con `BottomNav`, tienilo a mente per non lasciare la bottom-nav inconsistente.
