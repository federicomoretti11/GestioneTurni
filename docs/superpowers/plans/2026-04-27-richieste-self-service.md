# Sistema Richieste Self-Service — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettere ai dipendenti di inviare richieste di ferie/permesso/malattia/cambio turno dalla propria schermata; manager e admin approvano in-app con tracciamento e aggiornamento automatico del calendario.

**Architecture:** Una singola tabella `richieste` copre tutti i tipi con catena di approvazione gerarchica (pending → approvata_manager → approvata). Le approvazioni di ferie/permesso/malattia creano automaticamente turni usando i template per categoria. Le email (Resend) e le notifiche in-app sono non-bloccanti.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RLS + Realtime), TypeScript, Vitest, Resend

---

## Mappa file

### Nuovi file
- `supabase/migrations/009_richieste.sql`
- `supabase/migrations/010_templates_categoria.sql`
- `supabase/migrations/011_notifiche_richieste.sql`
- `lib/richieste/config.ts`
- `lib/richieste/validations.ts`
- `lib/richieste/notifiche.ts`
- `lib/richieste/turni.ts`
- `lib/email.ts`
- `app/api/richieste/route.ts`
- `app/api/richieste/[id]/route.ts`
- `app/api/richieste/pending-count/route.ts`
- `app/api/richieste/[id]/rientro/route.ts`
- `components/richieste/CardRichiesta.tsx`
- `components/richieste/FormNuovaRichiesta.tsx`
- `components/richieste/ModaleApprovaRifiuta.tsx`
- `components/richieste/ModaleConflitti.tsx`
- `components/richieste/RichiesteCounter.tsx`
- `components/layout/SidebarDipendente.tsx`
- `app/dipendente/richieste/page.tsx`
- `app/admin/richieste/page.tsx`
- `app/manager/richieste/page.tsx`
- `tests/unit/richieste-validations.test.ts`
- `tests/unit/richieste-turni.test.ts`

### File modificati
- `lib/types.ts` — aggiunge tipi Richiesta, TipoRichiesta, StatoRichiesta, PermessoTipo, CategoriaTemplate
- `app/dipendente/layout.tsx` — usa SidebarDipendente
- `app/dipendente/turni/page.tsx` — aggiunge pulsante "Non posso fare questo turno"
- `components/layout/SidebarAdmin.tsx` — aggiunge voce Richieste con badge
- `components/layout/SidebarManager.tsx` — aggiunge voce Richieste con badge

---

## FASE 1 — Foundation

### Task 1: Migration 009 — tabella richieste

**Files:**
- Create: `supabase/migrations/009_richieste.sql`

> Le migrazioni si applicano manualmente nel SQL Editor di Supabase Dashboard.

- [ ] **Step 1: Crea il file migration**

```sql
-- supabase/migrations/009_richieste.sql

create type tipo_richiesta as enum ('ferie','permesso','malattia','cambio_turno');
create type stato_richiesta as enum ('pending','approvata_manager','approvata','rifiutata','annullata','comunicata');
create type permesso_tipo as enum ('giornata','mezza_mattina','mezza_pomeriggio','ore');

create table richieste (
  id                    uuid primary key default gen_random_uuid(),
  dipendente_id         uuid not null references profiles(id) on delete cascade,
  tipo                  tipo_richiesta not null,
  data_inizio           date not null,
  data_fine             date,
  permesso_tipo         permesso_tipo,
  ora_inizio            time,
  ora_fine              time,
  turno_id              uuid references turni(id) on delete set null,
  stato                 stato_richiesta not null default 'pending',
  note_dipendente       text,
  motivazione_decisione text,
  manager_id            uuid references profiles(id),
  manager_decisione_at  timestamptz,
  admin_id              uuid references profiles(id),
  admin_decisione_at    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_richieste_dipendente on richieste(dipendente_id, created_at desc);
create index idx_richieste_stato on richieste(stato) where stato in ('pending','approvata_manager');
create index idx_richieste_tipo_data on richieste(tipo, data_inizio);

create trigger richieste_updated_at
  before update on richieste
  for each row execute function update_updated_at();

-- RLS
alter table richieste enable row level security;

-- Dipendente: vede e crea solo le proprie
create policy "dipendente_select_proprie" on richieste
  for select using (dipendente_id = auth.uid());

create policy "dipendente_insert" on richieste
  for insert with check (dipendente_id = auth.uid());

-- Dipendente: UPDATE solo per annullare (pending → annullata)
create policy "dipendente_annulla" on richieste
  for update using (
    dipendente_id = auth.uid()
    and stato = 'pending'
  );

-- Manager/Admin: vedono tutto
create policy "staff_select_all" on richieste
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid() and ruolo in ('admin','manager')
    )
  );

-- Manager/Admin: UPDATE per transizioni stato
create policy "staff_update" on richieste
  for update using (
    exists (
      select 1 from profiles
      where id = auth.uid() and ruolo in ('admin','manager')
    )
  );

-- Admin: DELETE
create policy "admin_delete" on richieste
  for delete using (
    exists (
      select 1 from profiles
      where id = auth.uid() and ruolo = 'admin'
    )
  );

-- Realtime
alter publication supabase_realtime add table richieste;
```

- [ ] **Step 2: Esegui nel SQL Editor di Supabase Dashboard**

Copia il contenuto del file e incollalo nel SQL Editor. Clicca Run.
Expected: nessun errore, tabella `richieste` visibile in Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_richieste.sql
git commit -m "feat(db): migration 009 tabella richieste con RLS e realtime"
```

---

### Task 2: Migration 010 (categoria template) + 011 (notifiche tipi)

**Files:**
- Create: `supabase/migrations/010_templates_categoria.sql`
- Create: `supabase/migrations/011_notifiche_richieste.sql`

- [ ] **Step 1: Crea 010**

```sql
-- supabase/migrations/010_templates_categoria.sql

create type categoria_template as enum ('lavoro','ferie','permesso','malattia');

alter table turni_template
  add column categoria categoria_template not null default 'lavoro';
```

- [ ] **Step 2: Crea 011**

```sql
-- supabase/migrations/011_notifiche_richieste.sql
-- Aggiunge i tipi notifica per il sistema richieste self-service.

alter table notifiche drop constraint if exists notifiche_tipo_check;
alter table notifiche add constraint notifiche_tipo_check
  check (tipo in (
    'turno_assegnato',
    'turno_modificato',
    'turno_eliminato',
    'settimana_pianificata',
    'check_in',
    'check_out',
    'turni_pubblicati',
    'richiesta_creata',
    'richiesta_approvata_manager',
    'richiesta_approvata',
    'richiesta_rifiutata',
    'richiesta_cancellata',
    'malattia_comunicata'
  ));
```

- [ ] **Step 3: Esegui entrambe nel SQL Editor (in ordine)**

Expected: nessun errore. Colonna `categoria` visibile su `turni_template`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/010_templates_categoria.sql supabase/migrations/011_notifiche_richieste.sql
git commit -m "feat(db): migration 010 categoria template + 011 tipi notifica richieste"
```

---

### Task 3: Tipi TypeScript + lib/richieste/config.ts + lib/richieste/validations.ts

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/richieste/config.ts`
- Create: `lib/richieste/validations.ts`
- Create: `tests/unit/richieste-validations.test.ts`

- [ ] **Step 1: Scrivi il test (fallirà perché i file non esistono)**

```ts
// tests/unit/richieste-validations.test.ts
import { describe, it, expect } from 'vitest'
import { validateLeadTime, validateStatoTransition } from '@/lib/richieste/validations'

describe('validateLeadTime', () => {
  it('ferie: rifiuta se data_inizio < 7gg', () => {
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)
    expect(validateLeadTime('ferie', domani.toISOString().slice(0, 10))).not.toBeNull()
  })
  it('ferie: accetta se data_inizio >= 7gg', () => {
    const traOtto = new Date()
    traOtto.setDate(traOtto.getDate() + 8)
    expect(validateLeadTime('ferie', traOtto.toISOString().slice(0, 10))).toBeNull()
  })
  it('permesso: rifiuta se data_inizio < 24h', () => {
    const traUnOra = new Date()
    traUnOra.setHours(traUnOra.getHours() + 1)
    expect(validateLeadTime('permesso', traUnOra.toISOString().slice(0, 10))).not.toBeNull()
  })
  it('malattia: sempre accettata', () => {
    expect(validateLeadTime('malattia', new Date().toISOString().slice(0, 10))).toBeNull()
  })
  it('cambio_turno: rifiuta se < 48h', () => {
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)
    expect(validateLeadTime('cambio_turno', domani.toISOString().slice(0, 10))).not.toBeNull()
  })
})

describe('validateStatoTransition', () => {
  it('dipendente può annullare solo da pending', () => {
    expect(validateStatoTransition('pending', 'annullata', 'dipendente')).toBeNull()
    expect(validateStatoTransition('approvata_manager', 'annullata', 'dipendente')).not.toBeNull()
  })
  it('manager può approvare da pending', () => {
    expect(validateStatoTransition('pending', 'approvata_manager', 'manager')).toBeNull()
  })
  it('manager non può convalidare (solo admin)', () => {
    expect(validateStatoTransition('approvata_manager', 'approvata', 'manager')).not.toBeNull()
  })
  it('admin può bypassare a approvata da pending', () => {
    expect(validateStatoTransition('pending', 'approvata', 'admin')).toBeNull()
  })
  it('admin può convalidare da approvata_manager', () => {
    expect(validateStatoTransition('approvata_manager', 'approvata', 'admin')).toBeNull()
  })
  it('nessuno può tornare da rifiutata', () => {
    expect(validateStatoTransition('rifiutata', 'pending', 'admin')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Esegui il test — deve fallire**

```bash
npx vitest run tests/unit/richieste-validations.test.ts
```
Expected: FAIL con "Cannot find module '@/lib/richieste/validations'"

- [ ] **Step 3: Aggiorna lib/types.ts — aggiungi i nuovi tipi in coda**

```ts
// Aggiungi alla fine di lib/types.ts

export type TipoRichiesta = 'ferie' | 'permesso' | 'malattia' | 'cambio_turno'
export type StatoRichiesta = 'pending' | 'approvata_manager' | 'approvata' | 'rifiutata' | 'annullata' | 'comunicata'
export type PermessoTipo = 'giornata' | 'mezza_mattina' | 'mezza_pomeriggio' | 'ore'
export type CategoriaTemplate = 'lavoro' | 'ferie' | 'permesso' | 'malattia'
export type AzioneRichiesta = 'cancella' | 'approva' | 'rifiuta' | 'convalida'

export interface Richiesta {
  id: string
  dipendente_id: string
  tipo: TipoRichiesta
  data_inizio: string        // "YYYY-MM-DD"
  data_fine: string | null
  permesso_tipo: PermessoTipo | null
  ora_inizio: string | null  // "HH:MM:SS"
  ora_fine: string | null
  turno_id: string | null
  stato: StatoRichiesta
  note_dipendente: string | null
  motivazione_decisione: string | null
  manager_id: string | null
  manager_decisione_at: string | null
  admin_id: string | null
  admin_decisione_at: string | null
  created_at: string
  updated_at: string
  // join opzionali
  profile?: Profile
  turno?: Turno | null
}

// Estendi TurnoTemplate con categoria
// (sostituisci l'interfaccia esistente TurnoTemplate in lib/types.ts)
```

Modifica effettiva su `TurnoTemplate` — aggiungi il campo `categoria`:
```ts
export interface TurnoTemplate {
  id: string
  nome: string
  ora_inizio: string
  ora_fine: string
  colore: string
  categoria: CategoriaTemplate  // ← nuovo
  created_at: string
}
```

Modifica effettiva su `TipoNotifica` — aggiungi nuovi valori:
```ts
export type TipoNotifica =
  | 'turno_assegnato'
  | 'turno_modificato'
  | 'turno_eliminato'
  | 'settimana_pianificata'
  | 'check_in'
  | 'check_out'
  | 'turni_pubblicati'
  | 'richiesta_creata'
  | 'richiesta_approvata_manager'
  | 'richiesta_approvata'
  | 'richiesta_rifiutata'
  | 'richiesta_cancellata'
  | 'malattia_comunicata'
```

- [ ] **Step 4: Crea lib/richieste/config.ts**

```ts
// lib/richieste/config.ts
import type { TipoRichiesta, StatoRichiesta, AzioneRichiesta } from '@/lib/types'

export const LEAD_TIMES_MS: Record<TipoRichiesta, number> = {
  ferie:        7 * 24 * 60 * 60 * 1000,
  permesso:         24 * 60 * 60 * 1000,
  cambio_turno: 2 * 24 * 60 * 60 * 1000,
  malattia:                            0,
}

export const LEAD_TIME_LABEL: Record<TipoRichiesta, string> = {
  ferie:        '7 giorni',
  permesso:     '24 ore',
  cambio_turno: '48 ore',
  malattia:     '',
}

// Transizioni valide: [statoCorrente, nuovoStato] → ruoli ammessi
export const TRANSIZIONI_VALIDE: Array<{
  da: StatoRichiesta
  a: StatoRichiesta
  ruoli: Array<'dipendente' | 'manager' | 'admin'>
  azione: AzioneRichiesta
}> = [
  { da: 'pending',           a: 'annullata',          ruoli: ['dipendente'],          azione: 'cancella'  },
  { da: 'pending',           a: 'approvata_manager',  ruoli: ['manager', 'admin'],    azione: 'approva'   },
  { da: 'pending',           a: 'approvata',          ruoli: ['admin'],               azione: 'approva'   },
  { da: 'approvata_manager', a: 'approvata',          ruoli: ['admin'],               azione: 'convalida' },
  { da: 'pending',           a: 'rifiutata',          ruoli: ['manager', 'admin'],    azione: 'rifiuta'   },
  { da: 'approvata_manager', a: 'rifiutata',          ruoli: ['manager', 'admin'],    azione: 'rifiuta'   },
]
```

- [ ] **Step 5: Crea lib/richieste/validations.ts**

```ts
// lib/richieste/validations.ts
import type { TipoRichiesta, StatoRichiesta, RuoloUtente } from '@/lib/types'
import { LEAD_TIMES_MS, LEAD_TIME_LABEL, TRANSIZIONI_VALIDE } from './config'

export function validateLeadTime(tipo: TipoRichiesta, dataInizio: string): string | null {
  const leadTime = LEAD_TIMES_MS[tipo]
  if (leadTime === 0) return null
  const inizio = new Date(dataInizio).getTime()
  const adesso = Date.now()
  if (inizio - adesso < leadTime) {
    return `Le richieste di tipo "${tipo}" vanno inviate con almeno ${LEAD_TIME_LABEL[tipo]} di anticipo.`
  }
  return null
}

export function validateStatoTransition(
  statoCorrente: StatoRichiesta,
  nuovoStato: StatoRichiesta,
  ruolo: RuoloUtente
): string | null {
  const ok = TRANSIZIONI_VALIDE.some(
    t => t.da === statoCorrente && t.a === nuovoStato && t.ruoli.includes(ruolo)
  )
  if (!ok) return `Transizione ${statoCorrente} → ${nuovoStato} non consentita per ruolo ${ruolo}.`
  return null
}
```

- [ ] **Step 6: Esegui il test — deve passare**

```bash
npx vitest run tests/unit/richieste-validations.test.ts
```
Expected: PASS, 9 test passed

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/richieste/config.ts lib/richieste/validations.ts tests/unit/richieste-validations.test.ts
git commit -m "feat(richieste): tipi TS, config lead-time, validazioni con test"
```

---

### Task 4: lib/richieste/notifiche.ts

**Files:**
- Create: `lib/richieste/notifiche.ts`

- [ ] **Step 1: Crea il file**

```ts
// lib/richieste/notifiche.ts
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateIT } from '@/lib/utils/date'
import type { TipoRichiesta } from '@/lib/types'

type Riga = {
  destinatario_id: string
  tipo: string
  titolo: string
  messaggio: string
}

async function insert(righe: Riga[]) {
  if (!righe.length) return
  try {
    await createAdminClient().from('notifiche').insert(righe)
  } catch (e) {
    console.error('[notifiche-richieste] insert fallita', e)
  }
}

async function idStaff(): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id')
    .in('ruolo', ['admin', 'manager'])
    .eq('attivo', true)
  return (data ?? []).map(r => r.id)
}

async function idAdmin(): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id')
    .eq('ruolo', 'admin')
    .eq('attivo', true)
  return (data ?? []).map(r => r.id)
}

function labelTipo(tipo: TipoRichiesta): string {
  const map: Record<TipoRichiesta, string> = {
    ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', cambio_turno: 'Cambio turno',
  }
  return map[tipo]
}

export async function notificaRichiestaCreata(params: {
  tipo: TipoRichiesta
  dataInizio: string
  dataFine: string | null
  nomeDipendente: string
}) {
  const ids = await idStaff()
  const date = params.dataFine ? `${formatDateIT(params.dataInizio)}–${formatDateIT(params.dataFine)}` : formatDateIT(params.dataInizio)
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'richiesta_creata',
    titolo: `Nuova richiesta: ${labelTipo(params.tipo)}`,
    messaggio: `${params.nomeDipendente} · ${date}`,
  })))
}

export async function notificaRichiestaApprovataManager(params: {
  tipo: TipoRichiesta
  dataInizio: string
  nomeDipendente: string
}) {
  const ids = await idAdmin()
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'richiesta_approvata_manager',
    titolo: `Da convalidare: ${labelTipo(params.tipo)}`,
    messaggio: `${params.nomeDipendente} · approvata dal manager`,
  })))
}

export async function notificaRichiestaApprovata(params: {
  dipendenteId: string
  tipo: TipoRichiesta
  dataInizio: string
  dataFine: string | null
}) {
  const date = params.dataFine ? `${formatDateIT(params.dataInizio)}–${formatDateIT(params.dataFine)}` : formatDateIT(params.dataInizio)
  await insert([{
    destinatario_id: params.dipendenteId,
    tipo: 'richiesta_approvata',
    titolo: `${labelTipo(params.tipo)} approvata`,
    messaggio: `La tua richiesta (${date}) è stata approvata`,
  }])
}

export async function notificaRichiestaRifiutata(params: {
  dipendenteId: string
  tipo: TipoRichiesta
  motivazione: string
}) {
  await insert([{
    destinatario_id: params.dipendenteId,
    tipo: 'richiesta_rifiutata',
    titolo: `${labelTipo(params.tipo)} rifiutata`,
    messaggio: params.motivazione,
  }])
}

export async function notificaMalattiaComunicata(params: {
  tipo: 'malattia'
  dataInizio: string
  nomeDipendente: string
}) {
  const ids = await idStaff()
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'malattia_comunicata',
    titolo: 'Malattia comunicata',
    messaggio: `${params.nomeDipendente} · da ${formatDateIT(params.dataInizio)}`,
  })))
}

export async function notificaRichiestaCancellata(params: {
  tipo: TipoRichiesta
  dataInizio: string
  nomeDipendente: string
}) {
  const ids = await idStaff()
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'richiesta_cancellata',
    titolo: `Richiesta annullata: ${labelTipo(params.tipo)}`,
    messaggio: `${params.nomeDipendente} · ${formatDateIT(params.dataInizio)}`,
  })))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/richieste/notifiche.ts
git commit -m "feat(richieste): funzioni notifica server-only"
```

---

### Task 5: API routes /api/richieste

**Files:**
- Create: `app/api/richieste/route.ts`
- Create: `app/api/richieste/[id]/route.ts`
- Create: `app/api/richieste/pending-count/route.ts`

- [ ] **Step 1: Crea app/api/richieste/route.ts**

```ts
// app/api/richieste/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateLeadTime } from '@/lib/richieste/validations'
import {
  notificaRichiestaCreata,
  notificaMalattiaComunicata,
} from '@/lib/richieste/notifiche'

const SELECT = `*, profile:profiles!richieste_dipendente_id_fkey(id, nome, cognome, ruolo),
  turno:turni(id, data, ora_inizio, ora_fine)`

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const stato = searchParams.get('stato')
  const dipendente_id = searchParams.get('dipendente_id')
  const mese = searchParams.get('mese') // "YYYY-MM"

  let query = supabase.from('richieste').select(SELECT)

  if (profile?.ruolo === 'dipendente') {
    query = query.eq('dipendente_id', user.id)
  } else {
    if (dipendente_id) query = query.eq('dipendente_id', dipendente_id)
  }
  if (tipo) query = query.eq('tipo', tipo)
  if (stato) query = query.eq('stato', stato)
  if (mese) {
    query = query
      .gte('data_inizio', `${mese}-01`)
      .lte('data_inizio', `${mese}-31`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  const { tipo, data_inizio, data_fine, permesso_tipo, ora_inizio, ora_fine,
          turno_id, note_dipendente } = body

  // Validazione lead time
  const leadError = validateLeadTime(tipo, data_inizio)
  if (leadError) return NextResponse.json({ error: leadError }, { status: 422 })

  // Validazioni specifiche per tipo
  if (tipo === 'cambio_turno' && !turno_id) {
    return NextResponse.json({ error: 'turno_id obbligatorio per cambio turno' }, { status: 422 })
  }
  if (tipo === 'cambio_turno' && !note_dipendente?.trim()) {
    return NextResponse.json({ error: 'La motivazione è obbligatoria per il cambio turno' }, { status: 422 })
  }

  // Malattia → stato = 'comunicata' direttamente
  const statoIniziale = tipo === 'malattia' ? 'comunicata' : 'pending'

  const { data, error } = await supabase
    .from('richieste')
    .insert({
      dipendente_id: user.id,
      tipo,
      data_inizio,
      data_fine: data_fine ?? null,
      permesso_tipo: permesso_tipo ?? null,
      ora_inizio: ora_inizio ?? null,
      ora_fine: ora_fine ?? null,
      turno_id: turno_id ?? null,
      note_dipendente: note_dipendente ?? null,
      stato: statoIniziale,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifiche non-bloccanti
  const { data: profilo } = await supabase
    .from('profiles').select('nome, cognome').eq('id', user.id).single()
  const nome = profilo ? `${profilo.nome} ${profilo.cognome}` : 'Dipendente'

  if (tipo === 'malattia') {
    notificaMalattiaComunicata({ tipo: 'malattia', dataInizio: data_inizio, nomeDipendente: nome })
  } else {
    notificaRichiestaCreata({ tipo, dataInizio: data_inizio, dataFine: data_fine ?? null, nomeDipendente: nome })
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Crea app/api/richieste/[id]/route.ts**

```ts
// app/api/richieste/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateStatoTransition } from '@/lib/richieste/validations'
import {
  notificaRichiestaApprovata,
  notificaRichiestaApprovataManager,
  notificaRichiestaRifiutata,
  notificaRichiestaCancellata,
} from '@/lib/richieste/notifiche'
import type { AzioneRichiesta, RuoloUtente } from '@/lib/types'

const SELECT = `*, profile:profiles!richieste_dipendente_id_fkey(id, nome, cognome, ruolo),
  turno:turni(id, data, ora_inizio, ora_fine)`

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('richieste').select(SELECT).eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profilo } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  const ruolo = profilo?.ruolo as RuoloUtente

  const body: { azione: AzioneRichiesta; motivazione?: string; sovrascrivi_conflitti?: boolean }
    = await request.json()
  const { azione, motivazione, sovrascrivi_conflitti } = body

  // Leggi richiesta corrente
  const { data: richiesta, error: fetchErr } = await supabase
    .from('richieste').select('*').eq('id', params.id).single()
  if (fetchErr || !richiesta) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  // Mappa azione → nuovo stato
  const mappaStato: Record<AzioneRichiesta, string> = {
    cancella:  'annullata',
    approva:   ruolo === 'admin' && richiesta.stato === 'pending' ? 'approvata' : 'approvata_manager',
    rifiuta:   'rifiutata',
    convalida: 'approvata',
  }
  const nuovoStato = mappaStato[azione] as any

  // Valida transizione
  const err = validateStatoTransition(richiesta.stato, nuovoStato, ruolo)
  if (err) return NextResponse.json({ error: err }, { status: 422 })

  // Motivazione obbligatoria su rifiuto
  if (azione === 'rifiuta' && (!motivazione || motivazione.trim().length < 5)) {
    return NextResponse.json({ error: 'Motivazione obbligatoria (min 5 caratteri)' }, { status: 422 })
  }

  // Campi da aggiornare
  const aggiornamenti: Record<string, unknown> = { stato: nuovoStato }
  if (azione === 'rifiuta') aggiornamenti.motivazione_decisione = motivazione
  if (ruolo === 'manager' && azione === 'approva') {
    aggiornamenti.manager_id = user.id
    aggiornamenti.manager_decisione_at = new Date().toISOString()
  }
  if (ruolo === 'admin' && (azione === 'approva' || azione === 'convalida' || azione === 'rifiuta')) {
    aggiornamenti.admin_id = user.id
    aggiornamenti.admin_decisione_at = new Date().toISOString()
  }

  // Controllo conflitti per convalida (approvata finale) — non malattia (già gestita in POST)
  if (nuovoStato === 'approvata' && richiesta.tipo !== 'cambio_turno') {
    // La gestione conflitti con createTurniDaRichiesta viene aggiunta in Fase 4.
    // Per ora: se sovrascrivi_conflitti === undefined, risponde con lista conflitti se presenti.
    // Import posticipato a Fase 4: checkConflitti e createTurniDaRichiesta
  }

  const { data: updated, error: updateErr } = await supabase
    .from('richieste')
    .update(aggiornamenti)
    .eq('id', params.id)
    .select(SELECT)
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Notifiche non-bloccanti
  const nomeRichiedente = updated.profile
    ? `${(updated.profile as any).nome} ${(updated.profile as any).cognome}`
    : 'Dipendente'

  if (nuovoStato === 'approvata_manager') {
    notificaRichiestaApprovataManager({ tipo: richiesta.tipo, dataInizio: richiesta.data_inizio, nomeDipendente: nomeRichiedente })
  } else if (nuovoStato === 'approvata') {
    notificaRichiestaApprovata({ dipendenteId: richiesta.dipendente_id, tipo: richiesta.tipo, dataInizio: richiesta.data_inizio, dataFine: richiesta.data_fine })
  } else if (nuovoStato === 'rifiutata') {
    notificaRichiestaRifiutata({ dipendenteId: richiesta.dipendente_id, tipo: richiesta.tipo, motivazione: motivazione! })
  } else if (nuovoStato === 'annullata') {
    notificaRichiestaCancellata({ tipo: richiesta.tipo, dataInizio: richiesta.data_inizio, nomeDipendente: nomeRichiedente })
  }

  return NextResponse.json(updated)
}
```

- [ ] **Step 3: Crea app/api/richieste/pending-count/route.ts**

```ts
// app/api/richieste/pending-count/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const { data: profile } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()

  if (profile?.ruolo === 'dipendente') {
    // Badge dipendente: notifiche non lette di tipo richiesta
    const { count } = await supabase
      .from('notifiche')
      .select('id', { count: 'exact', head: true })
      .eq('destinatario_id', user.id)
      .eq('letta', false)
      .in('tipo', ['richiesta_approvata', 'richiesta_rifiutata'])
    return NextResponse.json({ count: count ?? 0 })
  }

  if (profile?.ruolo === 'manager') {
    const { count } = await supabase
      .from('richieste')
      .select('id', { count: 'exact', head: true })
      .eq('stato', 'pending')
    return NextResponse.json({ count: count ?? 0 })
  }

  // Admin: pending + approvata_manager
  const { count } = await supabase
    .from('richieste')
    .select('id', { count: 'exact', head: true })
    .in('stato', ['pending', 'approvata_manager'])
  return NextResponse.json({ count: count ?? 0 })
}
```

- [ ] **Step 4: Verifica compilazione TypeScript**

```bash
npx tsc --noEmit
```
Expected: nessun errore

- [ ] **Step 5: Commit**

```bash
git add app/api/richieste/
git commit -m "feat(richieste): API routes GET/POST list, PATCH azioni, pending-count"
```

---

## FASE 2 — Dipendente UX

### Task 6: SidebarDipendente con badge richieste

**Files:**
- Create: `components/richieste/RichiesteCounter.tsx`
- Create: `components/layout/SidebarDipendente.tsx`
- Modify: `app/dipendente/layout.tsx`

- [ ] **Step 1: Crea components/richieste/RichiesteCounter.tsx**

```tsx
// components/richieste/RichiesteCounter.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRichiesteCount() {
  const [count, setCount] = useState(0)
  const supabase = createClient()

  async function fetch() {
    const res = await window.fetch('/api/richieste/pending-count')
    if (res.ok) {
      const json = await res.json()
      setCount(json.count ?? 0)
    }
  }

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('richieste-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste' }, fetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifiche' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return count
}
```

- [ ] **Step 2: Crea components/layout/SidebarDipendente.tsx**

```tsx
// components/layout/SidebarDipendente.tsx
'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'

const BASE_ITEMS = [
  { label: 'I miei turni', href: '/dipendente/turni', icon: '📅' },
  { label: 'Richieste',    href: '/dipendente/richieste', icon: '📋' },
  { label: 'Profilo',      href: '/dipendente/profilo', icon: '👤' },
]

export function SidebarDipendente() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const count = useRichiesteCount()
  const pathname = usePathname()

  const items = BASE_ITEMS.map(it => {
    if (it.href === '/dipendente/richieste' && mounted) {
      const badge = pathname === '/dipendente/richieste' ? 0 : count
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="I Miei Turni" ruolo="dipendente" />
}
```

- [ ] **Step 3: Aggiorna app/dipendente/layout.tsx**

```tsx
// app/dipendente/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { SidebarDipendente } from '@/components/layout/SidebarDipendente'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'

const BOTTOM_NAV_ITEMS = [
  { label: 'I miei turni', href: '/dipendente/turni', icon: '📅' },
  { label: 'Richieste',    href: '/dipendente/richieste', icon: '📋' },
  { label: 'Profilo',      href: '/dipendente/profilo', icon: '👤' },
]

export default async function DipendenteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarDipendente />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="dipendente" userId={user!.id} />
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <BottomNav items={BOTTOM_NAV_ITEMS} />
    </div>
  )
}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```
Expected: nessun errore

- [ ] **Step 5: Commit**

```bash
git add components/richieste/RichiesteCounter.tsx components/layout/SidebarDipendente.tsx app/dipendente/layout.tsx
git commit -m "feat(dipendente): sidebar con badge richieste realtime"
```

---

### Task 7: CardRichiesta + pagina /dipendente/richieste

**Files:**
- Create: `components/richieste/CardRichiesta.tsx`
- Create: `app/dipendente/richieste/page.tsx`

- [ ] **Step 1: Crea components/richieste/CardRichiesta.tsx**

```tsx
// components/richieste/CardRichiesta.tsx
'use client'
import type { Richiesta } from '@/lib/types'
import { formatDateIT } from '@/lib/utils/date'

const STATO_CONFIG = {
  pending:            { label: 'In attesa',                       color: 'bg-amber-100 text-amber-800' },
  approvata_manager:  { label: 'Approvata — in attesa convalida', color: 'bg-blue-100 text-blue-800'   },
  approvata:          { label: 'Approvata',                       color: 'bg-green-100 text-green-800' },
  comunicata:         { label: 'Ricevuta',                        color: 'bg-green-100 text-green-800' },
  rifiutata:          { label: 'Rifiutata',                       color: 'bg-red-100 text-red-800'     },
  annullata:          { label: 'Annullata',                       color: 'bg-gray-100 text-gray-500'   },
}

const TIPO_LABEL = {
  ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', cambio_turno: 'Cambio turno',
}

function dateRange(r: Richiesta): string {
  if (r.data_fine) return `${formatDateIT(r.data_inizio)} – ${formatDateIT(r.data_fine)}`
  return formatDateIT(r.data_inizio)
}

interface Props {
  richiesta: Richiesta
  onCancella?: (id: string) => void
  // Slot opzionale per pulsanti azione (usato da admin/manager)
  actions?: React.ReactNode
}

export function CardRichiesta({ richiesta, onCancella, actions }: Props) {
  const cfg = STATO_CONFIG[richiesta.stato]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-sm text-gray-900">{TIPO_LABEL[richiesta.tipo]}</span>
          <span className="ml-2 text-xs text-gray-500">{dateRange(richiesta)}</span>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {richiesta.note_dipendente && (
        <p className="text-xs text-gray-600 italic">"{richiesta.note_dipendente}"</p>
      )}

      {richiesta.stato === 'rifiutata' && richiesta.motivazione_decisione && (
        <p className="text-xs text-red-700 bg-red-50 rounded p-2">
          Motivazione: {richiesta.motivazione_decisione}
        </p>
      )}

      {/* Turno collegato (cambio_turno) */}
      {richiesta.turno && (
        <p className="text-xs text-gray-500">
          Turno: {formatDateIT((richiesta.turno as any).data)} · {(richiesta.turno as any).ora_inizio?.slice(0,5)}–{(richiesta.turno as any).ora_fine?.slice(0,5)}
        </p>
      )}

      <div className="flex items-center justify-between mt-1">
        {actions ?? null}
        {onCancella && richiesta.stato === 'pending' && (
          <button
            onClick={() => onCancella(richiesta.id)}
            className="text-xs text-red-600 hover:underline ml-auto"
          >
            Annulla richiesta
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crea app/dipendente/richieste/page.tsx**

```tsx
// app/dipendente/richieste/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Richiesta } from '@/lib/types'
import { CardRichiesta } from '@/components/richieste/CardRichiesta'
import { FormNuovaRichiesta } from '@/components/richieste/FormNuovaRichiesta'

export default function RichiesteDipendentePage() {
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [formAperto, setFormAperto] = useState(false)
  const [tipoForm, setTipoForm] = useState<'ferie' | 'permesso' | 'malattia' | null>(null)
  const [dropdownAperto, setDropdownAperto] = useState(false)
  const supabase = createClient()

  const carica = useCallback(async () => {
    setErrore('')
    const res = await fetch('/api/richieste')
    if (!res.ok) { setErrore('Errore caricamento'); setLoading(false); return }
    setRichieste(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    carica()
    const channel = supabase
      .channel('richieste-dipendente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste' }, carica)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [carica])

  async function cancella(id: string) {
    if (!confirm('Annullare questa richiesta?')) return
    await fetch(`/api/richieste/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'cancella' }),
    })
    carica()
  }

  function apriForm(tipo: 'ferie' | 'permesso' | 'malattia') {
    setTipoForm(tipo)
    setFormAperto(true)
    setDropdownAperto(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Le mie richieste</h1>
        <div className="relative">
          <button
            onClick={() => setDropdownAperto(v => !v)}
            className="flex items-center gap-1 bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            + Nuova richiesta ▾
          </button>
          {dropdownAperto && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {(['ferie', 'permesso', 'malattia'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => apriForm(t)}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 capitalize"
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {errore && <p className="text-red-600 text-sm">{errore}</p>}
      {loading && <p className="text-gray-500 text-sm">Caricamento...</p>}

      {!loading && richieste.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">Nessuna richiesta inviata.</p>
      )}

      {richieste.map(r => (
        <CardRichiesta key={r.id} richiesta={r} onCancella={cancella} />
      ))}

      {formAperto && tipoForm && (
        <FormNuovaRichiesta
          tipo={tipoForm}
          onClose={() => setFormAperto(false)}
          onSuccess={() => { setFormAperto(false); carica() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/richieste/CardRichiesta.tsx app/dipendente/richieste/
git commit -m "feat(dipendente): pagina richieste con lista realtime e card"
```

---

### Task 8: FormNuovaRichiesta (modale)

**Files:**
- Create: `components/richieste/FormNuovaRichiesta.tsx`

- [ ] **Step 1: Crea il componente**

```tsx
// components/richieste/FormNuovaRichiesta.tsx
'use client'
import { useState } from 'react'
import type { TipoRichiesta, PermessoTipo } from '@/lib/types'

interface Props {
  tipo: Exclude<TipoRichiesta, 'cambio_turno'>
  onClose: () => void
  onSuccess: () => void
}

export function FormNuovaRichiesta({ tipo, onClose, onSuccess }: Props) {
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [openEnded, setOpenEnded] = useState(false)
  const [permessoTipo, setPermessoTipo] = useState<PermessoTipo>('giornata')
  const [oraInizio, setOraInizio] = useState('')
  const [oraFine, setOraFine] = useState('')
  const [note, setNote] = useState('')
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)

  // Calcola la data minima in base al lead time
  function dataMin(): string {
    const ora = new Date()
    const leadMap = { ferie: 7, permesso: 1, malattia: 0 }
    ora.setDate(ora.getDate() + leadMap[tipo])
    return ora.toISOString().slice(0, 10)
  }

  async function invia() {
    setErrore('')
    if (!dataInizio) { setErrore('Inserisci la data di inizio'); return }
    if (tipo !== 'malattia' && !openEnded && !dataFine) { setErrore('Inserisci la data di fine'); return }
    if (tipo === 'permesso' && permessoTipo === 'ore' && (!oraInizio || !oraFine)) {
      setErrore('Inserisci orario inizio e fine'); return
    }

    setLoading(true)
    const body: Record<string, unknown> = {
      tipo,
      data_inizio: dataInizio,
      data_fine: openEnded ? null : (dataFine || null),
      note_dipendente: note || null,
    }
    if (tipo === 'permesso') {
      body.permesso_tipo = permessoTipo
      if (permessoTipo === 'ore') { body.ora_inizio = oraInizio; body.ora_fine = oraFine }
    }

    const res = await fetch('/api/richieste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setErrore(json.error ?? 'Errore invio')
      return
    }
    onSuccess()
  }

  const titolo = { ferie: 'Richiesta ferie', permesso: 'Richiesta permesso', malattia: 'Comunicazione malattia' }[tipo]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{titolo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Data inizio */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Data inizio</label>
          <input type="date" min={dataMin()} value={dataInizio} onChange={e => setDataInizio(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
        </div>

        {/* Data fine (ferie e permesso con tipo 'giornata') */}
        {tipo !== 'malattia' && tipo !== 'permesso' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data fine</label>
            <input type="date" min={dataInizio || dataMin()} value={dataFine} onChange={e => setDataFine(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
        )}

        {/* Malattia: checkbox open-ended */}
        {tipo === 'malattia' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data fine prevista</label>
              <input type="date" min={dataInizio} value={dataFine} disabled={openEnded}
                onChange={e => setDataFine(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm disabled:opacity-40" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={openEnded} onChange={e => setOpenEnded(e.target.checked)} />
              Non so ancora quando rientro
            </label>
          </>
        )}

        {/* Permesso: sub-tipo */}
        {tipo === 'permesso' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo permesso</label>
              <select value={permessoTipo} onChange={e => setPermessoTipo(e.target.value as PermessoTipo)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm">
                <option value="giornata">Giornata intera</option>
                <option value="mezza_mattina">Mezza giornata mattina</option>
                <option value="mezza_pomeriggio">Mezza giornata pomeriggio</option>
                <option value="ore">Ore puntuali</option>
              </select>
            </div>
            {permessoTipo === 'ore' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dalle</label>
                  <input type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Alle</label>
                  <input type="time" value={oraFine} onChange={e => setOraFine(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Note {tipo === 'malattia' ? '(opzionali)' : '(opzionali)'}
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
            placeholder="Aggiungi una nota..." />
        </div>

        {errore && <p className="text-red-600 text-sm">{errore}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">
            Annulla
          </button>
          <button onClick={invia} disabled={loading}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Invio...' : 'Invia richiesta'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/richieste/FormNuovaRichiesta.tsx
git commit -m "feat(dipendente): modale form nuova richiesta ferie/permesso/malattia"
```

---

### Task 9: Pulsante "Non posso fare questo turno"

**Files:**
- Modify: `app/dipendente/turni/page.tsx`

- [ ] **Step 1: Individua il componente che gestisce il click su un turno**

Nel file `app/dipendente/turni/page.tsx`, cerca dove viene renderizzata `GrigliaCalendario` e come vengono gestiti i click sulle celle turno. Aggiungi uno stato per il turno selezionato per cambio.

- [ ] **Step 2: Aggiungi il modale cambio turno alla pagina**

Aggiungi questi stati:
```tsx
const [turnoPerCambio, setTurnoPerCambio] = useState<TurnoConDettagli | null>(null)
const [motivazioneCambio, setMotivazioneCambio] = useState('')
const [erroreCambio, setErroreCambio] = useState('')
const [loadingCambio, setLoadingCambio] = useState(false)
```

Aggiungi questa funzione:
```tsx
async function inviaCambioTurno() {
  if (!turnoPerCambio) return
  if (!motivazioneCambio.trim()) { setErroreCambio('La motivazione è obbligatoria'); return }
  setLoadingCambio(true)
  const res = await fetch('/api/richieste', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo: 'cambio_turno',
      data_inizio: turnoPerCambio.data,
      data_fine: turnoPerCambio.data,
      turno_id: turnoPerCambio.id,
      note_dipendente: motivazioneCambio.trim(),
    }),
  })
  setLoadingCambio(false)
  if (!res.ok) {
    const json = await res.json()
    setErroreCambio(json.error ?? 'Errore invio')
    return
  }
  setTurnoPerCambio(null)
  setMotivazioneCambio('')
}
```

Aggiungi alla prop `onTurnoClick` di `GrigliaCalendario` (o crea un handler equivalente) che apra un piccolo modale con:
- Dettagli turno (data, orario)
- Pulsante "Non posso fare questo turno"
- Textarea motivazione
- Pulsanti Annulla / Invia

Il modale inline da aggiungere nel JSX:
```tsx
{turnoPerCambio && (
  <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
      <h2 className="font-bold text-gray-900">Non posso fare questo turno</h2>
      <p className="text-sm text-gray-600">
        {turnoPerCambio.data} · {turnoPerCambio.ora_inizio?.slice(0,5)}–{turnoPerCambio.ora_fine?.slice(0,5)}
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Motivazione *</label>
        <textarea
          value={motivazioneCambio}
          onChange={e => setMotivazioneCambio(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
          placeholder="Spiega perché non puoi fare questo turno..."
        />
      </div>
      {erroreCambio && <p className="text-red-600 text-sm">{erroreCambio}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => { setTurnoPerCambio(null); setMotivazioneCambio(''); setErroreCambio('') }}
          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg"
        >
          Annulla
        </button>
        <button
          onClick={inviaCambioTurno}
          disabled={loadingCambio}
          className="flex-1 bg-orange-600 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50"
        >
          {loadingCambio ? 'Invio...' : 'Invia richiesta'}
        </button>
      </div>
    </div>
  </div>
)}
```

Collega il clic sul turno al setTurnoPerCambio — cerca il prop `onCellClick` o equivalente di `GrigliaCalendario` e aggiungilo o, se non esiste, avvolgi le celle con un handler.

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/dipendente/turni/page.tsx
git commit -m "feat(dipendente): pulsante 'Non posso fare questo turno' con invio richiesta cambio"
```

---

## FASE 3 — Manager/Admin UX

### Task 10: Badge sidebar admin e manager

**Files:**
- Modify: `components/layout/SidebarAdmin.tsx`
- Modify: `components/layout/SidebarManager.tsx`

- [ ] **Step 1: Aggiorna SidebarAdmin.tsx**

Aggiungi import `useRichiesteCount`:
```tsx
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'
```

Aggiungi la voce a `BASE_ITEMS`:
```tsx
{ label: 'Richieste', href: '/admin/richieste', icon: '📋' },
```

Aggiorna il componente per gestire badge richieste (stessa logica del badge bozze):
```tsx
export function SidebarAdmin() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const bozza = useBozzaCount()
  const richieste = useRichiesteCount()
  const pathname = usePathname()

  const items = BASE_ITEMS.map(it => {
    if (it.href === '/admin/calendario-programmazione' && mounted) {
      const badge = pathname === '/admin/calendario-programmazione' ? 0 : bozza
      return { ...it, badge }
    }
    if (it.href === '/admin/richieste' && mounted) {
      const badge = pathname === '/admin/richieste' ? 0 : richieste
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="GestioneTurni" ruolo="admin" />
}
```

- [ ] **Step 2: Aggiorna SidebarManager.tsx**

```tsx
// components/layout/SidebarManager.tsx
'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useRichiesteCount } from '@/components/richieste/RichiesteCounter'

const BASE_ITEMS = [
  { label: 'Calendario',                  href: '/manager/calendario',                      icon: '📅' },
  { label: 'Per posto',                   href: '/manager/calendario-posti',                icon: '📍' },
  { label: 'Programmazione',              href: '/manager/calendario-programmazione',       icon: '📝' },
  { label: 'Programmazione per posto',    href: '/manager/calendario-programmazione-posti', icon: '📝' },
  { label: 'Richieste',                   href: '/manager/richieste',                       icon: '📋' },
  { label: 'Turni',                       href: '/manager/template',                        icon: '🏷️' },
  { label: 'Export',                      href: '/manager/export',                          icon: '📤' },
]

export function SidebarManager() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const richieste = useRichiesteCount()
  const pathname = usePathname()

  const items = BASE_ITEMS.map(it => {
    if (it.href === '/manager/richieste' && mounted) {
      const badge = pathname === '/manager/richieste' ? 0 : richieste
      return { ...it, badge }
    }
    return it
  })
  return <Sidebar items={items} title="GestioneTurni" ruolo="manager" />
}
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/SidebarAdmin.tsx components/layout/SidebarManager.tsx
git commit -m "feat(staff): badge richieste in sidebar admin e manager"
```

---

### Task 11: ModaleApprovaRifiuta

**Files:**
- Create: `components/richieste/ModaleApprovaRifiuta.tsx`

- [ ] **Step 1: Crea il componente**

```tsx
// components/richieste/ModaleApprovaRifiuta.tsx
'use client'
import { useState } from 'react'
import type { Richiesta, AzioneRichiesta } from '@/lib/types'
import { formatDateIT } from '@/lib/utils/date'

const TIPO_LABEL = {
  ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', cambio_turno: 'Cambio turno',
}

interface Props {
  richiesta: Richiesta
  azione: 'approva' | 'rifiuta' | 'convalida'
  onClose: () => void
  onSuccess: () => void
}

export function ModaleApprovaRifiuta({ richiesta, azione, onClose, onSuccess }: Props) {
  const [motivazione, setMotivazione] = useState('')
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)

  const titoli = {
    approva:   'Approva richiesta',
    rifiuta:   'Rifiuta richiesta',
    convalida: 'Convalida richiesta',
  }

  async function conferma() {
    setErrore('')
    if (azione === 'rifiuta' && motivazione.trim().length < 5) {
      setErrore('Inserisci una motivazione (min 5 caratteri)')
      return
    }
    setLoading(true)
    const body: { azione: AzioneRichiesta; motivazione?: string } = { azione }
    if (azione === 'rifiuta') body.motivazione = motivazione.trim()

    const res = await fetch(`/api/richieste/${richiesta.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setErrore(json.error ?? 'Errore')
      return
    }
    onSuccess()
  }

  const dateTesto = richiesta.data_fine
    ? `${formatDateIT(richiesta.data_inizio)} – ${formatDateIT(richiesta.data_fine)}`
    : formatDateIT(richiesta.data_inizio)

  const nomeDipendente = richiesta.profile
    ? `${(richiesta.profile as any).nome} ${(richiesta.profile as any).cognome}`
    : 'Dipendente'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
        <h2 className="font-bold text-gray-900">{titoli[azione]}</h2>
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p><span className="font-medium">Dipendente:</span> {nomeDipendente}</p>
          <p><span className="font-medium">Tipo:</span> {TIPO_LABEL[richiesta.tipo]}</p>
          <p><span className="font-medium">Date:</span> {dateTesto}</p>
          {richiesta.note_dipendente && (
            <p><span className="font-medium">Note:</span> {richiesta.note_dipendente}</p>
          )}
        </div>

        {azione === 'rifiuta' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Motivazione *</label>
            <textarea
              value={motivazione}
              onChange={e => setMotivazione(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
              placeholder="Specifica il motivo del rifiuto..."
            />
          </div>
        )}

        {errore && <p className="text-red-600 text-sm">{errore}</p>}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg">
            Annulla
          </button>
          <button
            onClick={conferma}
            disabled={loading}
            className={`flex-1 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50 ${
              azione === 'rifiuta' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'Attendere...' : titoli[azione]}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/richieste/ModaleApprovaRifiuta.tsx
git commit -m "feat(staff): modale approva/rifiuta/convalida richieste"
```

---

### Task 12: Pagine /admin/richieste e /manager/richieste

**Files:**
- Create: `app/admin/richieste/page.tsx`
- Create: `app/manager/richieste/page.tsx`

- [ ] **Step 1: Crea app/admin/richieste/page.tsx**

```tsx
// app/admin/richieste/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Richiesta, AzioneRichiesta } from '@/lib/types'
import { CardRichiesta } from '@/components/richieste/CardRichiesta'
import { ModaleApprovaRifiuta } from '@/components/richieste/ModaleApprovaRifiuta'

const STATI_ATTIVI = ['pending', 'approvata_manager']

export default function RichiesteAdminPage() {
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modale, setModale] = useState<{ richiesta: Richiesta; azione: 'approva' | 'rifiuta' | 'convalida' } | null>(null)
  const supabase = createClient()

  const carica = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroStato) params.set('stato', filtroStato)
    if (filtroTipo) params.set('tipo', filtroTipo)
    const res = await fetch(`/api/richieste?${params}`)
    if (res.ok) setRichieste(await res.json())
    setLoading(false)
  }, [filtroStato, filtroTipo])

  useEffect(() => {
    carica()
    const channel = supabase
      .channel('richieste-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste' }, carica)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [carica])

  const daDec = richieste.filter(r => STATI_ATTIVI.includes(r.stato))
  const storico = richieste.filter(r => !STATI_ATTIVI.includes(r.stato))

  function actions(r: Richiesta) {
    const isPending = r.stato === 'pending'
    const isAttesaConvalida = r.stato === 'approvata_manager'
    const isFinal = ['approvata','rifiutata','annullata','comunicata'].includes(r.stato)
    return (
      <div className="flex gap-1 flex-wrap">
        {(isPending || isAttesaConvalida) && (
          <button
            onClick={() => setModale({ richiesta: r, azione: isAttesaConvalida ? 'convalida' : 'approva' })}
            className="text-xs bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700"
          >
            {isAttesaConvalida ? 'Convalida' : 'Approva'}
          </button>
        )}
        {!isFinal && (
          <button
            onClick={() => setModale({ richiesta: r, azione: 'rifiuta' })}
            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md hover:bg-red-200"
          >
            Rifiuta
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-lg font-bold text-gray-900">Richieste dipendenti</h1>

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap">
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="">Tutti gli stati</option>
          <option value="pending">In attesa</option>
          <option value="approvata_manager">Da convalidare</option>
          <option value="approvata">Approvate</option>
          <option value="rifiutata">Rifiutate</option>
          <option value="annullata">Annullate</option>
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="">Tutti i tipi</option>
          <option value="ferie">Ferie</option>
          <option value="permesso">Permesso</option>
          <option value="malattia">Malattia</option>
          <option value="cambio_turno">Cambio turno</option>
        </select>
      </div>

      {loading && <p className="text-gray-500 text-sm">Caricamento...</p>}

      {daDec.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Da decidere</h2>
          <div className="space-y-3">
            {daDec.map(r => (
              <CardRichiesta key={r.id} richiesta={r} actions={actions(r)} />
            ))}
          </div>
        </section>
      )}

      {storico.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Storico</h2>
          <div className="space-y-3">
            {storico.map(r => (
              <CardRichiesta key={r.id} richiesta={r} actions={actions(r)} />
            ))}
          </div>
        </section>
      )}

      {modale && (
        <ModaleApprovaRifiuta
          richiesta={modale.richiesta}
          azione={modale.azione}
          onClose={() => setModale(null)}
          onSuccess={() => { setModale(null); carica() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Crea app/manager/richieste/page.tsx**

Uguale a `app/admin/richieste/page.tsx` tranne:
- Sostituisci titolo con "Richieste dipendenti (Manager)"
- Rimuovi il pulsante "Convalida" (il manager non può convalidare — vedi logica `actions`)
- Nella funzione `actions`, rimuovi il caso `isAttesaConvalida`:

```tsx
// app/manager/richieste/page.tsx
// Copia identica di app/admin/richieste/page.tsx con queste differenze:
// 1. L'azione per approvata_manager NON appare (manager non può convalidare)
// 2. Il canale realtime si chiama 'richieste-manager'

// Modifica della funzione actions:
function actions(r: Richiesta) {
  const isPending = r.stato === 'pending'
  const isFinal = ['approvata','rifiutata','annullata','comunicata','approvata_manager'].includes(r.stato)
  return (
    <div className="flex gap-1 flex-wrap">
      {isPending && (
        <button
          onClick={() => setModale({ richiesta: r, azione: 'approva' })}
          className="text-xs bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700"
        >
          Approva
        </button>
      )}
      {!isFinal && (
        <button
          onClick={() => setModale({ richiesta: r, azione: 'rifiuta' })}
          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md hover:bg-red-200"
        >
          Rifiuta
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/richieste/ app/manager/richieste/
git commit -m "feat(staff): pagine richieste admin e manager con filtri e azioni realtime"
```

---

## FASE 4 — Auto-create turni su approvazione

### Task 13: lib/richieste/turni.ts con test

**Files:**
- Create: `lib/richieste/turni.ts`
- Create: `tests/unit/richieste-turni.test.ts`

- [ ] **Step 1: Scrivi il test**

```ts
// tests/unit/richieste-turni.test.ts
import { describe, it, expect } from 'vitest'
import { dateRange } from '@/lib/richieste/turni'

describe('dateRange', () => {
  it('una sola data', () => {
    expect(dateRange('2026-05-12', '2026-05-12')).toEqual(['2026-05-12'])
  })
  it('range di 3 giorni', () => {
    expect(dateRange('2026-05-12', '2026-05-14')).toEqual(['2026-05-12', '2026-05-13', '2026-05-14'])
  })
  it('fine < inizio ritorna array vuoto', () => {
    expect(dateRange('2026-05-14', '2026-05-12')).toEqual([])
  })
})
```

- [ ] **Step 2: Esegui il test — deve fallire**

```bash
npx vitest run tests/unit/richieste-turni.test.ts
```
Expected: FAIL

- [ ] **Step 3: Crea lib/richieste/turni.ts**

```ts
// lib/richieste/turni.ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Richiesta, CategoriaTemplate } from '@/lib/types'

export function dateRange(dataInizio: string, dataFine: string): string[] {
  const result: string[] = []
  const start = new Date(dataInizio)
  const end = new Date(dataFine)
  if (end < start) return result
  const cur = new Date(start)
  while (cur <= end) {
    result.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

export interface Conflitto {
  data: string
  turno_id: string
  ora_inizio: string
  ora_fine: string
}

export async function checkConflitti(
  dipendenteId: string,
  dataInizio: string,
  dataFine: string,
  supabase: SupabaseClient
): Promise<Conflitto[]> {
  const giorni = dateRange(dataInizio, dataFine)
  if (!giorni.length) return []

  const { data } = await supabase
    .from('turni')
    .select('id, data, ora_inizio, ora_fine')
    .eq('dipendente_id', dipendenteId)
    .eq('stato', 'confermato')
    .in('data', giorni)

  return (data ?? []).map(t => ({
    data: t.data,
    turno_id: t.id,
    ora_inizio: t.ora_inizio,
    ora_fine: t.ora_fine,
  }))
}

export async function createTurniDaRichiesta(
  richiesta: Richiesta,
  sovrascriviConflitti: boolean,
  adminId: string,
  supabase: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  const categoriaMap: Record<string, CategoriaTemplate> = {
    ferie: 'ferie', permesso: 'permesso', malattia: 'malattia',
  }
  const categoria = categoriaMap[richiesta.tipo]
  if (!categoria) return { ok: false, error: 'Tipo richiesta non genera turni' }

  // Cerca template attivo per categoria
  const { data: template } = await supabase
    .from('turni_template')
    .select('id, ora_inizio, ora_fine')
    .eq('categoria', categoria)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!template) {
    return { ok: false, error: `Nessun template attivo con categoria "${categoria}". Creane uno prima di approvare.` }
  }

  const dataFine = richiesta.data_fine ?? richiesta.data_inizio
  const giorni = dateRange(richiesta.data_inizio, dataFine)

  if (sovrascriviConflitti) {
    // Elimina turni esistenti nei giorni interessati
    await supabase
      .from('turni')
      .delete()
      .eq('dipendente_id', richiesta.dipendente_id)
      .eq('stato', 'confermato')
      .in('data', giorni)
  }

  // Determina orari (permesso di tipo 'ore' usa orari specifici)
  const oraInizio = (richiesta.tipo === 'permesso' && richiesta.permesso_tipo === 'ore' && richiesta.ora_inizio)
    ? richiesta.ora_inizio
    : template.ora_inizio
  const oraFine = (richiesta.tipo === 'permesso' && richiesta.permesso_tipo === 'ore' && richiesta.ora_fine)
    ? richiesta.ora_fine
    : template.ora_fine

  // Per permesso: crea solo per data_inizio (single day)
  const giorniDaCreare = richiesta.tipo === 'permesso' ? [richiesta.data_inizio] : giorni

  const righe = giorniDaCreare.map(data => ({
    dipendente_id: richiesta.dipendente_id,
    template_id: template.id,
    data,
    ora_inizio: oraInizio,
    ora_fine: oraFine,
    stato: 'confermato' as const,
    creato_da: adminId,
    note: `Da richiesta ${richiesta.tipo} #${richiesta.id.slice(0, 8)}`,
  }))

  if (!righe.length) return { ok: true }

  const { error } = await supabase.from('turni').insert(righe)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
```

- [ ] **Step 4: Esegui il test — deve passare**

```bash
npx vitest run tests/unit/richieste-turni.test.ts
```
Expected: PASS, 3 test passed

- [ ] **Step 5: Commit**

```bash
git add lib/richieste/turni.ts tests/unit/richieste-turni.test.ts
git commit -m "feat(richieste): logica creazione turni da richiesta approvata con test"
```

---

### Task 14: ModaleConflitti + integrazione nella PATCH

**Files:**
- Create: `components/richieste/ModaleConflitti.tsx`
- Modify: `app/api/richieste/[id]/route.ts`

- [ ] **Step 1: Crea ModaleConflitti.tsx**

```tsx
// components/richieste/ModaleConflitti.tsx
'use client'
import { useState } from 'react'
import { formatDateIT } from '@/lib/utils/date'

interface Conflitto {
  data: string
  turno_id: string
  ora_inizio: string
  ora_fine: string
}

interface Props {
  nomeDipendente: string
  conflitti: Conflitto[]
  onConferma: (sovrascrivi: boolean) => void
  onAnnulla: () => void
}

export function ModaleConflitti({ nomeDipendente, conflitti, onConferma, onAnnulla }: Props) {
  const [scelta, setScelta] = useState<'sovrascrivi' | 'mantieni'>('mantieni')
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <div>
            <h2 className="font-bold text-gray-900">Conflitti calendario</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {nomeDipendente} ha già turni assegnati nei giorni:
            </p>
          </div>
        </div>

        <ul className="bg-amber-50 rounded-lg p-3 space-y-1">
          {conflitti.map(c => (
            <li key={c.turno_id} className="text-sm text-amber-900">
              • {formatDateIT(c.data)} — {c.ora_inizio.slice(0,5)}–{c.ora_fine.slice(0,5)}
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="radio" name="scelta" value="sovrascrivi"
              checked={scelta === 'sovrascrivi'} onChange={() => setScelta('sovrascrivi')}
              className="mt-0.5" />
            <span className="text-sm">Sovrascrivi i turni esistenti</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="radio" name="scelta" value="mantieni"
              checked={scelta === 'mantieni'} onChange={() => setScelta('mantieni')}
              className="mt-0.5" />
            <span className="text-sm">Approva e crea solo nei giorni liberi — i conflitti li risolvo a mano</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={onAnnulla}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg">
            Annulla
          </button>
          <button onClick={() => onConferma(scelta === 'sovrascrivi')}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700">
            Conferma
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Aggiorna app/api/richieste/[id]/route.ts — integra gestione conflitti**

Nel blocco `PATCH`, sostituisci il commento placeholder per la gestione conflitti con il codice reale. Aggiungi questi import in cima al file:

```ts
import { checkConflitti, createTurniDaRichiesta } from '@/lib/richieste/turni'
import { createAdminClient } from '@/lib/supabase/admin'
```

Sostituisci il blocco commentato `// La gestione conflitti...` con:

```ts
if (nuovoStato === 'approvata' && richiesta.tipo !== 'cambio_turno') {
  // Controlla conflitti
  const conflitti = await checkConflitti(
    richiesta.dipendente_id,
    richiesta.data_inizio,
    richiesta.data_fine ?? richiesta.data_inizio,
    supabase
  )

  if (conflitti.length > 0 && sovrascrivi_conflitti === undefined) {
    // Risponde con 409 e lista conflitti — il client mostra il modale
    return NextResponse.json(
      { conflict: true, conflitti },
      { status: 409 }
    )
  }
}
```

Dopo `const { data: updated, error: updateErr } = ...` (aggiornamento stato), aggiungi la creazione turni:

```ts
if (!updateErr && nuovoStato === 'approvata' && richiesta.tipo !== 'cambio_turno') {
  const adminSupabase = createAdminClient()
  const risultato = await createTurniDaRichiesta(
    { ...richiesta, stato: nuovoStato },
    sovrascrivi_conflitti ?? false,
    user.id,
    adminSupabase
  )
  if (!risultato.ok) {
    // Rollback: riporta a stato precedente (best-effort)
    await supabase.from('richieste').update({ stato: richiesta.stato }).eq('id', params.id)
    return NextResponse.json({ error: risultato.error }, { status: 500 })
  }
}
```

- [ ] **Step 3: Aggiorna ModaleApprovaRifiuta per gestire il 409**

In `components/richieste/ModaleApprovaRifiuta.tsx`, dopo la risposta `res.ok` e la chiamata a `onSuccess`, aggiungi gestione del caso conflict:

```ts
// In conferma(), dopo setLoading(false):
if (res.status === 409) {
  const json = await res.json()
  if (json.conflict) {
    onConflict(json.conflitti) // callback da aggiungere alle Props
    return
  }
}
```

Aggiungi `onConflict?: (conflitti: Conflitto[]) => void` alle Props.

Nelle pagine admin/manager che usano `ModaleApprovaRifiuta`, aggiungi stato e modale conflitti:

```tsx
const [conflitti, setConflitti] = useState<any[] | null>(null)
const [richiestaConflitto, setRichiestaConflitto] = useState<Richiesta | null>(null)

// Passa onConflict al ModaleApprovaRifiuta:
<ModaleApprovaRifiuta
  richiesta={modale.richiesta}
  azione={modale.azione}
  onClose={() => setModale(null)}
  onSuccess={() => { setModale(null); carica() }}
  onConflict={(c) => {
    setConflitti(c)
    setRichiestaConflitto(modale.richiesta)
    setModale(null)
  }}
/>

// E il ModaleConflitti:
{conflitti && richiestaConflitto && (
  <ModaleConflitti
    nomeDipendente={...} // da richiestaConflitto.profile
    conflitti={conflitti}
    onAnnulla={() => { setConflitti(null); setRichiestaConflitto(null) }}
    onConferma={async (sovrascrivi) => {
      await fetch(`/api/richieste/${richiestaConflitto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azione: 'convalida', sovrascrivi_conflitti: sovrascrivi }),
      })
      setConflitti(null)
      setRichiestaConflitto(null)
      carica()
    }}
  />
)}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```
Expected: nessun errore

- [ ] **Step 5: Commit**

```bash
git add components/richieste/ModaleConflitti.tsx app/api/richieste/ components/richieste/ModaleApprovaRifiuta.tsx app/admin/richieste/ app/manager/richieste/
git commit -m "feat(richieste): auto-create turni su approvazione con gestione conflitti"
```

---

## FASE 5 — Email Resend

### Task 15: lib/email.ts — client e template

**Files:**
- Create: `lib/email.ts`

> Prerequisito: crea un account su resend.com, verifica il dominio (o usa il dominio sandbox per i test), ottieni l'API key. Aggiungi al file `.env.local`:
> ```
> RESEND_API_KEY=re_xxxxxxxxxxxx
> RESEND_FROM=noreply@tuodominio.it
> ```

- [ ] **Step 1: Installa Resend**

```bash
npm install resend
```
Expected: `added 1 package`

- [ ] **Step 2: Crea lib/email.ts**

```ts
// lib/email.ts
import 'server-only'
import { Resend } from 'resend'
import type { TipoRichiesta } from '@/lib/types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM ?? 'noreply@example.com'

const TIPO_LABEL: Record<TipoRichiesta, string> = {
  ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', cambio_turno: 'Cambio turno',
}

function htmlApprovata(tipo: TipoRichiesta, dataInizio: string, dataFine: string | null): string {
  const date = dataFine && dataFine !== dataInizio
    ? `dal <strong>${dataInizio}</strong> al <strong>${dataFine}</strong>`
    : `del <strong>${dataInizio}</strong>`
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#16a34a">Richiesta approvata ✓</h2>
      <p>La tua richiesta di <strong>${TIPO_LABEL[tipo]}</strong> ${date} è stata approvata.</p>
      <p style="color:#6b7280;font-size:14px">Puoi visualizzarla nella sezione Richieste della tua app.</p>
    </div>`
}

function htmlRifiutata(tipo: TipoRichiesta, motivazione: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#dc2626">Richiesta rifiutata</h2>
      <p>La tua richiesta di <strong>${TIPO_LABEL[tipo]}</strong> è stata rifiutata.</p>
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px;margin-top:12px">
        <strong>Motivazione:</strong> ${motivazione}
      </div>
    </div>`
}

export async function sendEmailRichiestaApprovata(params: {
  toEmail: string
  tipo: TipoRichiesta
  dataInizio: string
  dataFine: string | null
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: params.toEmail,
      subject: `Richiesta ${TIPO_LABEL[params.tipo]} approvata`,
      html: htmlApprovata(params.tipo, params.dataInizio, params.dataFine),
    })
  } catch (e) {
    console.error('[email] sendEmailRichiestaApprovata fallita', e)
  }
}

export async function sendEmailRichiestaRifiutata(params: {
  toEmail: string
  tipo: TipoRichiesta
  motivazione: string
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: params.toEmail,
      subject: `Richiesta ${TIPO_LABEL[params.tipo]} rifiutata`,
      html: htmlRifiutata(params.tipo, params.motivazione),
    })
  } catch (e) {
    console.error('[email] sendEmailRichiestaRifiutata fallita', e)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts package.json package-lock.json
git commit -m "feat(email): client Resend con template approvata/rifiutata"
```

---

### Task 16: Trigger email nelle PATCH

**Files:**
- Modify: `app/api/richieste/[id]/route.ts`

- [ ] **Step 1: Aggiungi import email**

```ts
import { sendEmailRichiestaApprovata, sendEmailRichiestaRifiutata } from '@/lib/email'
```

- [ ] **Step 2: Aggiungi la fetch dell'email del dipendente e i trigger**

Dopo il blocco notifiche, recupera l'email e invia in modo non-bloccante:

```ts
// Recupera email dipendente da auth.users (usa adminClient)
const adminClient = createAdminClient()
const { data: userData } = await adminClient.auth.admin.getUserById(richiesta.dipendente_id)
const emailDipendente = userData?.user?.email

if (emailDipendente) {
  if (nuovoStato === 'approvata') {
    sendEmailRichiestaApprovata({
      toEmail: emailDipendente,
      tipo: richiesta.tipo,
      dataInizio: richiesta.data_inizio,
      dataFine: richiesta.data_fine,
    })
  } else if (nuovoStato === 'rifiutata' && motivazione) {
    sendEmailRichiestaRifiutata({
      toEmail: emailDipendente,
      tipo: richiesta.tipo,
      motivazione,
    })
  }
}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/richieste/[id]/route.ts
git commit -m "feat(email): trigger email Resend su approvazione e rifiuto richiesta"
```

---

## FASE 6 — Chiusura malattia open-ended

### Task 17: API + UI imposta data rientro

**Files:**
- Create: `app/api/richieste/[id]/rientro/route.ts`
- Modify: `app/admin/richieste/page.tsx`
- Modify: `app/manager/richieste/page.tsx`

- [ ] **Step 1: Crea app/api/richieste/[id]/rientro/route.ts**

```ts
// app/api/richieste/[id]/rientro/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { dateRange } from '@/lib/richieste/turni'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.ruolo ?? '')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { data_fine } = await request.json()
  if (!data_fine) return NextResponse.json({ error: 'data_fine obbligatoria' }, { status: 422 })

  const { data: richiesta } = await supabase
    .from('richieste')
    .select('*')
    .eq('id', params.id)
    .eq('tipo', 'malattia')
    .eq('stato', 'comunicata')
    .is('data_fine', null)
    .single()

  if (!richiesta) return NextResponse.json({ error: 'Richiesta non trovata o già chiusa' }, { status: 404 })

  // Aggiorna data_fine sulla richiesta
  const { error: updateErr } = await supabase
    .from('richieste')
    .update({ data_fine })
    .eq('id', params.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Tronca/aggiorna turni MALATTIA oltre la data di rientro
  const adminClient = createAdminClient()
  const giorniMalattia = dateRange(richiesta.data_inizio, data_fine)

  // Elimina turni MALATTIA oltre il rientro
  await adminClient
    .from('turni')
    .delete()
    .eq('dipendente_id', richiesta.dipendente_id)
    .eq('stato', 'confermato')
    .gt('data', data_fine)
    .like('note', `Da richiesta malattia #${richiesta.id.slice(0, 8)}%`)

  // Notifica in-app al dipendente
  await adminClient.from('notifiche').insert({
    destinatario_id: richiesta.dipendente_id,
    tipo: 'richiesta_approvata',
    titolo: 'Data rientro malattia aggiornata',
    messaggio: `Il tuo rientro dalla malattia è stato impostato al ${data_fine}`,
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Aggiungi pulsante "Imposta data rientro" nelle pagine admin e manager**

In `app/admin/richieste/page.tsx` e `app/manager/richieste/page.tsx`, aggiungi questo stato e modale:

```tsx
const [richiestaRientro, setRichiestaRientro] = useState<Richiesta | null>(null)
const [dataRientro, setDataRientro] = useState('')
const [loadingRientro, setLoadingRientro] = useState(false)
```

Nella funzione `actions`, aggiungi:
```tsx
{r.tipo === 'malattia' && r.stato === 'comunicata' && !r.data_fine && (
  <button
    onClick={() => setRichiestaRientro(r)}
    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-200"
  >
    Imposta rientro
  </button>
)}
```

Aggiungi il modale rientro nel JSX:
```tsx
{richiestaRientro && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
      <h2 className="font-bold text-gray-900">Imposta data rientro</h2>
      <p className="text-sm text-gray-600">
        Malattia di {(richiestaRientro.profile as any)?.nome} {(richiestaRientro.profile as any)?.cognome}
        {' '}dal {richiestaRientro.data_inizio}
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Data rientro</label>
        <input type="date" min={richiestaRientro.data_inizio} value={dataRientro}
          onChange={e => setDataRientro(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { setRichiestaRientro(null); setDataRientro('') }}
          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg">
          Annulla
        </button>
        <button
          disabled={!dataRientro || loadingRientro}
          onClick={async () => {
            setLoadingRientro(true)
            await fetch(`/api/richieste/${richiestaRientro.id}/rientro`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data_fine: dataRientro }),
            })
            setLoadingRientro(false)
            setRichiestaRientro(null)
            setDataRientro('')
            carica()
          }}
          className="flex-1 bg-purple-600 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50"
        >
          {loadingRientro ? 'Salvataggio...' : 'Conferma'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit
```
Expected: nessun errore

- [ ] **Step 4: Esegui tutti i test**

```bash
npx vitest run tests/unit/
```
Expected: tutti PASS

- [ ] **Step 5: Commit finale**

```bash
git add app/api/richieste/ app/admin/richieste/ app/manager/richieste/
git commit -m "feat(richieste): gestione chiusura malattia open-ended con data rientro"
```

---

## Self-review contro la spec

### Copertura requisiti

| Requisito spec | Task |
|---|---|
| Tabella `richieste` con tutti i campi | Task 1 |
| Enum stati e tipi | Task 1 |
| Estensione `turni_template.categoria` | Task 2 |
| Nuovi tipi notifica | Task 2 |
| Lead time validation | Task 3 |
| State transition validation | Task 3 |
| Notifiche in-app per ogni evento | Task 4 |
| API CRUD completa | Task 5 |
| `GET /api/richieste/pending-count` | Task 5 |
| Badge sidebar dipendente | Task 6 |
| Pagina `/dipendente/richieste` lista | Task 7 |
| Form ferie/permesso/malattia | Task 8 |
| Pulsante "Non posso fare questo turno" | Task 9 |
| Badge sidebar admin e manager | Task 10 |
| Modale approva/rifiuta/convalida | Task 11 |
| Pagina `/admin/richieste` con filtri | Task 12 |
| Pagina `/manager/richieste` | Task 12 |
| Auto-create turni su approvazione | Task 13-14 |
| Gestione conflitti con dialogo esplicito | Task 14 |
| Email via Resend approvata/rifiutata | Task 15-16 |
| Chiusura malattia open-ended | Task 17 |
| Malattia → `comunicata` senza approvazione | Task 5 (POST) |
| Cancellazione solo da `pending` | Task 3 + Task 5 |
| Lead time disabilita date nel datepicker | Task 8 (`dataMin()`) |
| Motivazione obbligatoria su rifiuto | Task 5 + Task 11 |
| Note cambio_turno obbligatorie | Task 5 (POST) |
| Manager non può convalidare | Task 3 + Task 12 |
| Admin bypass manager | Task 5 (PATCH), Task 3 |
| Realtime lista richieste | Task 7, 12 |
| Badge si svuota entrando nella pagina | Task 6, 10 (usePathname) |

### Fuori scope confermato (non implementato)
- Saldo ferie/permessi annuale
- Upload allegati
- Web push / SMS
- Cambio turno P2P
- Override lead time da admin
- Categorizzazione permessi (legge 104 etc.)
- Modifica richiesta dopo invio
