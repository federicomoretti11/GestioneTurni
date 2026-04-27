# Richieste Self-Service — Fase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire le basi (DB, types, lib helpers, API CRUD) per il sistema di richieste, senza ancora UI né effetti collaterali (creazione turni / invio email). Al termine l'app resta deployabile e gli endpoint sono testabili via curl.

**Architecture:** 3 migrazioni Supabase per la tabella `richieste` e l'estensione di `templates` + `notifiche`. Una nuova directory `lib/richieste/` con configurazione, validazione e helper notifiche. Setup minimale del client Resend (senza ancora chiamarlo). 5 endpoint REST sotto `/api/richieste/*` con RLS che fa il grosso del controllo accessi.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + RLS + Realtime), TypeScript, Vitest per i test unitari, Resend per email (solo setup, no trigger in questa fase).

**Spec di riferimento:** `docs/superpowers/specs/2026-04-27-richieste-self-service-design.md`

---

## File map

**Nuovi:**
- `supabase/migrations/009_richieste.sql` — tabella, enum, indici, RLS, realtime
- `supabase/migrations/010_template_categoria.sql` — campo `categoria` su `templates`
- `supabase/migrations/011_notifiche_tipi_richieste.sql` — estende CHECK su `notifiche.tipo`
- `lib/richieste/config.ts` — costanti (lead times, ecc.)
- `lib/richieste/validation.ts` — validazione anticipo, payload
- `lib/richieste/notifiche.ts` — helper di insert su `notifiche` per i nuovi tipi
- `lib/email.ts` — client Resend (no template ancora, no chiamate)
- `app/api/richieste/route.ts` — GET (list) + POST (create)
- `app/api/richieste/[id]/route.ts` — GET (detail) + PATCH (transizioni stato)
- `app/api/richieste/pending-count/route.ts` — GET contatore badge
- `tests/unit/richieste-validation.test.ts` — test del validatore

**Modificati:**
- `lib/types.ts` — nuovi tipi `Richiesta`, `TipoRichiesta`, `StatoRichiesta`, ecc. + estensione `TipoNotifica`
- `package.json` — dipendenza `resend`
- `.env.example` (se esiste) — `RESEND_API_KEY`, `RESEND_FROM`

---

## Tasks

### Task 1: Migration 009 — tabella `richieste`

**Files:**
- Create: `supabase/migrations/009_richieste.sql`

- [ ] **Step 1: Creare il file di migrazione**

```sql
-- supabase/migrations/009_richieste.sql

create type tipo_richiesta as enum ('ferie','permesso','malattia','cambio_turno');
create type stato_richiesta as enum ('pending','approvata_manager','approvata','rifiutata','annullata','comunicata');
create type permesso_tipo as enum ('giornata','mezza_mattina','mezza_pomeriggio','ore');

create table richieste (
  id                       uuid primary key default gen_random_uuid(),
  dipendente_id            uuid not null references profiles(id) on delete cascade,
  tipo                     tipo_richiesta not null,
  data_inizio              date not null,
  data_fine                date,
  permesso_tipo            permesso_tipo,
  ora_inizio               time,
  ora_fine                 time,
  turno_id                 uuid references turni(id) on delete set null,
  stato                    stato_richiesta not null default 'pending',
  note_dipendente          text,
  motivazione_decisione    text,
  manager_id               uuid references profiles(id),
  manager_decisione_at     timestamptz,
  admin_id                 uuid references profiles(id),
  admin_decisione_at       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index richieste_dipendente_idx on richieste(dipendente_id, created_at desc);
create index richieste_stato_aperto_idx on richieste(stato) where stato in ('pending','approvata_manager');
create index richieste_tipo_data_idx on richieste(tipo, data_inizio);

-- Trigger updated_at
create or replace function richieste_set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger richieste_updated_at_trigger
  before update on richieste
  for each row execute function richieste_set_updated_at();

alter table richieste enable row level security;

-- Dipendente: SELECT solo le proprie
create policy "richieste_select_proprie" on richieste
  for select using (dipendente_id = auth.uid());

-- Dipendente: INSERT solo per sé stesso
create policy "richieste_insert_proprie" on richieste
  for insert with check (dipendente_id = auth.uid());

-- Dipendente: UPDATE limitato alla cancellazione (pending → annullata)
create policy "richieste_update_cancella_proprie" on richieste
  for update using (
    dipendente_id = auth.uid() and stato = 'pending'
  ) with check (
    dipendente_id = auth.uid() and stato in ('pending','annullata')
  );

-- Manager/Admin: SELECT tutte
create policy "richieste_select_admin_manager" on richieste
  for select using (
    exists (select 1 from profiles where id = auth.uid() and ruolo in ('admin','manager'))
  );

-- Manager/Admin: UPDATE per transizioni stato
create policy "richieste_update_admin_manager" on richieste
  for update using (
    exists (select 1 from profiles where id = auth.uid() and ruolo in ('admin','manager'))
  );

-- Admin: DELETE
create policy "richieste_delete_admin" on richieste
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
  );

alter publication supabase_realtime add table richieste;
```

- [ ] **Step 2: Applicare la migrazione**

Eseguila col flusso che usi normalmente per Supabase (CLI locale o dashboard SQL). Dopo l'apply, verifica con:

```sql
select column_name, data_type from information_schema.columns
where table_name = 'richieste' order by ordinal_position;
```

Atteso: 18 colonne corrispondenti allo schema sopra.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_richieste.sql
git commit -m "feat(db): tabella richieste con enum, indici, RLS, realtime"
```

---

### Task 2: Migration 010 — `categoria` sui template

**Files:**
- Create: `supabase/migrations/010_template_categoria.sql`

- [ ] **Step 1: Creare il file di migrazione**

```sql
-- supabase/migrations/010_template_categoria.sql

create type categoria_template as enum ('lavoro','ferie','permesso','malattia');

alter table templates
  add column categoria categoria_template not null default 'lavoro';

create index templates_categoria_attivo_idx
  on templates(categoria, attivo) where attivo = true;
```

- [ ] **Step 2: Applicare la migrazione e verificare**

```sql
select column_name, data_type, column_default from information_schema.columns
where table_name = 'templates' and column_name = 'categoria';
```

Atteso: una riga, default `'lavoro'::categoria_template`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_template_categoria.sql
git commit -m "feat(db): aggiunge categoria ai template (lavoro/ferie/permesso/malattia)"
```

---

### Task 3: Migration 011 — estende tipi notifiche

**Files:**
- Create: `supabase/migrations/011_notifiche_tipi_richieste.sql`

- [ ] **Step 1: Verificare la CHECK constraint corrente su `notifiche.tipo`**

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'notifiche'::regclass and contype = 'c';
```

Annota il nome esatto del constraint (es. `notifiche_tipo_check`) e gli enum value attualmente ammessi.

- [ ] **Step 2: Creare il file di migrazione**

Sostituisci `<NOME_CONSTRAINT>` col nome rilevato al passo 1 e includi TUTTI i valori già esistenti nella nuova CHECK + i nuovi valori per le richieste.

```sql
-- supabase/migrations/011_notifiche_tipi_richieste.sql

alter table notifiche drop constraint <NOME_CONSTRAINT>;

alter table notifiche add constraint notifiche_tipo_check check (
  tipo in (
    -- esistenti (ricopiare ESATTAMENTE quelli rilevati al passo 1)
    'turno_assegnato', 'turno_modificato', 'turno_eliminato',
    'settimana_pianificata', 'check_in', 'check_out', 'turni_pubblicati',
    -- nuovi
    'richiesta_creata', 'richiesta_approvata_manager',
    'richiesta_approvata', 'richiesta_rifiutata',
    'richiesta_cancellata', 'malattia_comunicata'
  )
);
```

- [ ] **Step 3: Applicare e verificare**

```sql
-- Test rapido che i nuovi tipi siano accettati (poi rollback)
begin;
insert into notifiche (destinatario_id, tipo, titolo, messaggio)
values ((select id from profiles limit 1), 'richiesta_creata', 'test', 'test');
rollback;
```

Non deve dare errore di constraint.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_notifiche_tipi_richieste.sql
git commit -m "feat(db): estende notifiche.tipo con eventi richieste"
```

---

### Task 4: Tipi TypeScript

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Aggiungere i nuovi tipi in fondo al file**

Aggiungi questo blocco alla fine di `lib/types.ts`:

```typescript
export type TipoRichiesta = 'ferie' | 'permesso' | 'malattia' | 'cambio_turno'

export type StatoRichiesta =
  | 'pending'
  | 'approvata_manager'
  | 'approvata'
  | 'rifiutata'
  | 'annullata'
  | 'comunicata'

export type PermessoTipo =
  | 'giornata'
  | 'mezza_mattina'
  | 'mezza_pomeriggio'
  | 'ore'

export interface Richiesta {
  id: string
  dipendente_id: string
  tipo: TipoRichiesta
  data_inizio: string         // YYYY-MM-DD
  data_fine: string | null    // null solo per malattia open-ended
  permesso_tipo: PermessoTipo | null
  ora_inizio: string | null   // HH:MM:SS, solo se permesso_tipo='ore'
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
}

export interface RichiestaConDettagli extends Richiesta {
  dipendente: Profile
  manager: Profile | null
  admin: Profile | null
  turno: Turno | null
}

export type CategoriaTemplate = 'lavoro' | 'ferie' | 'permesso' | 'malattia'
```

- [ ] **Step 2: Estendere `TipoNotifica` (sempre in `lib/types.ts`)**

Trova la dichiarazione di `TipoNotifica` e aggiungi i nuovi valori:

```typescript
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

- [ ] **Step 3: Estendere `TurnoTemplate` con `categoria`**

Trova `interface TurnoTemplate` e aggiungi:

```typescript
export interface TurnoTemplate {
  id: string
  nome: string
  ora_inizio: string
  ora_fine: string
  colore: string
  categoria: CategoriaTemplate     // NUOVO
  created_at: string
}
```

- [ ] **Step 4: Verificare compile**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): aggiunge tipi Richiesta, StatoRichiesta, PermessoTipo, CategoriaTemplate"
```

---

### Task 5: `lib/richieste/config.ts`

**Files:**
- Create: `lib/richieste/config.ts`

- [ ] **Step 1: Creare il file**

```typescript
import type { TipoRichiesta } from '@/lib/types'

// Anticipo minimo (ms) richiesto perché un dipendente possa inviare una richiesta.
// La data_inizio della richiesta deve essere >= now() + LEAD_TIME del tipo.
export const LEAD_TIMES_MS: Record<TipoRichiesta, number> = {
  ferie: 7 * 24 * 60 * 60 * 1000,
  permesso: 24 * 60 * 60 * 1000,
  cambio_turno: 2 * 24 * 60 * 60 * 1000,
  malattia: 0,
}

// Etichette user-facing (italiano)
export const ETICHETTA_TIPO: Record<TipoRichiesta, string> = {
  ferie: 'Ferie',
  permesso: 'Permesso',
  malattia: 'Malattia',
  cambio_turno: 'Cambio turno',
}

// Etichetta della motivazione minima richiesta su rifiuto
export const MOTIVAZIONE_MIN_LEN = 5
```

- [ ] **Step 2: Commit**

```bash
git add lib/richieste/config.ts
git commit -m "feat(richieste): config con lead times, etichette, soglia motivazione"
```

---

### Task 6: `lib/richieste/validation.ts` (TDD)

**Files:**
- Create: `tests/unit/richieste-validation.test.ts`
- Create: `lib/richieste/validation.ts`

- [ ] **Step 1: Scrivere il test fallente**

```typescript
// tests/unit/richieste-validation.test.ts
import { describe, it, expect } from 'vitest'
import { validaCreazione } from '@/lib/richieste/validation'

const oggi = new Date('2026-05-01T10:00:00Z')

describe('validaCreazione', () => {
  it('ferie: rifiuta se data_inizio è prima di oggi+7gg', () => {
    const res = validaCreazione({
      tipo: 'ferie',
      data_inizio: '2026-05-05',  // 4gg da oggi: < 7gg
      data_fine: '2026-05-08',
    }, oggi)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errore).toMatch(/7 giorni/)
  })

  it('ferie: accetta se data_inizio è oggi+7gg o oltre', () => {
    const res = validaCreazione({
      tipo: 'ferie',
      data_inizio: '2026-05-08',  // 7gg pieni
      data_fine: '2026-05-10',
    }, oggi)
    expect(res.ok).toBe(true)
  })

  it('permesso: rifiuta se data_inizio è prima di oggi+24h', () => {
    const res = validaCreazione({
      tipo: 'permesso',
      permesso_tipo: 'giornata',
      data_inizio: '2026-05-01',  // oggi
      data_fine: '2026-05-01',
    }, oggi)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errore).toMatch(/24 ore/)
  })

  it('cambio_turno: rifiuta senza note_dipendente (motivazione obbligatoria)', () => {
    const res = validaCreazione({
      tipo: 'cambio_turno',
      data_inizio: '2026-05-04',  // > 48h
      turno_id: 'aaa-bbb',
      note_dipendente: '',
    }, oggi)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errore).toMatch(/motivazione/i)
  })

  it('cambio_turno: rifiuta senza turno_id', () => {
    const res = validaCreazione({
      tipo: 'cambio_turno',
      data_inizio: '2026-05-04',
      note_dipendente: 'Visita medica',
    }, oggi)
    expect(res.ok).toBe(false)
  })

  it('malattia: nessun anticipo richiesto, accetta anche oggi', () => {
    const res = validaCreazione({
      tipo: 'malattia',
      data_inizio: '2026-05-01',
      data_fine: null,
    }, oggi)
    expect(res.ok).toBe(true)
  })

  it('permesso ore: richiede ora_inizio e ora_fine', () => {
    const res = validaCreazione({
      tipo: 'permesso',
      permesso_tipo: 'ore',
      data_inizio: '2026-05-04',
      data_fine: '2026-05-04',
    }, oggi)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errore).toMatch(/ora_inizio|ora_fine/)
  })

  it('ferie: data_fine deve essere >= data_inizio', () => {
    const res = validaCreazione({
      tipo: 'ferie',
      data_inizio: '2026-05-10',
      data_fine: '2026-05-08',
    }, oggi)
    expect(res.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

```bash
npx vitest run tests/unit/richieste-validation.test.ts
```

Atteso: errore "Cannot find module '@/lib/richieste/validation'".

- [ ] **Step 3: Creare l'implementazione**

```typescript
// lib/richieste/validation.ts
import type { PermessoTipo, TipoRichiesta } from '@/lib/types'
import { LEAD_TIMES_MS } from './config'

export interface PayloadCreazione {
  tipo: TipoRichiesta
  data_inizio: string
  data_fine?: string | null
  permesso_tipo?: PermessoTipo | null
  ora_inizio?: string | null
  ora_fine?: string | null
  turno_id?: string | null
  note_dipendente?: string | null
}

export type Risultato =
  | { ok: true }
  | { ok: false; errore: string }

const ETICHETTE_ANTICIPO: Record<TipoRichiesta, string> = {
  ferie: '7 giorni',
  permesso: '24 ore',
  cambio_turno: '48 ore',
  malattia: '',
}

export function validaCreazione(p: PayloadCreazione, ora: Date = new Date()): Risultato {
  // Coerenza date
  if (p.data_fine && p.data_fine < p.data_inizio) {
    return { ok: false, errore: 'data_fine precede data_inizio' }
  }

  // Anticipo minimo
  const inizio = new Date(p.data_inizio + 'T00:00:00')
  const minMs = ora.getTime() + LEAD_TIMES_MS[p.tipo]
  if (inizio.getTime() < minMs && LEAD_TIMES_MS[p.tipo] > 0) {
    return {
      ok: false,
      errore: `Le richieste di ${p.tipo} vanno inviate con almeno ${ETICHETTE_ANTICIPO[p.tipo]} di anticipo.`,
    }
  }

  // Specifiche per tipo
  if (p.tipo === 'cambio_turno') {
    if (!p.turno_id) return { ok: false, errore: 'turno_id obbligatorio per cambio_turno' }
    if (!p.note_dipendente || p.note_dipendente.trim().length < 5) {
      return { ok: false, errore: 'Motivazione obbligatoria (min 5 caratteri) per cambio turno' }
    }
  }

  if (p.tipo === 'permesso') {
    if (!p.permesso_tipo) return { ok: false, errore: 'permesso_tipo obbligatorio' }
    if (p.permesso_tipo === 'ore') {
      if (!p.ora_inizio || !p.ora_fine) {
        return { ok: false, errore: 'Per permesso a ore servono ora_inizio e ora_fine' }
      }
      if (p.ora_fine <= p.ora_inizio) {
        return { ok: false, errore: 'ora_fine deve essere successiva a ora_inizio' }
      }
    }
  }

  return { ok: true }
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

```bash
npx vitest run tests/unit/richieste-validation.test.ts
```

Atteso: 8 test passati.

- [ ] **Step 5: Commit**

```bash
git add lib/richieste/validation.ts tests/unit/richieste-validation.test.ts
git commit -m "feat(richieste): validazione creazione (anticipo, coerenza date, regole per tipo) + test"
```

---

### Task 7: `lib/richieste/notifiche.ts` (helper notifiche)

**Files:**
- Create: `lib/richieste/notifiche.ts`

- [ ] **Step 1: Leggere il pattern esistente**

Apri `lib/notifiche.ts` per vedere come sono strutturate le funzioni esistenti (uso del service role, gestione errori, formato titolo/messaggio). Le nuove helper seguiranno lo stesso pattern.

- [ ] **Step 2: Creare il file**

```typescript
// lib/richieste/notifiche.ts
import { createClient } from '@supabase/supabase-js'
import { ETICHETTA_TIPO } from './config'
import type { Richiesta, TipoNotifica } from '@/lib/types'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function destinatariAdminManager(includiManager = true): Promise<string[]> {
  const sb = service()
  const ruoli = includiManager ? ['admin', 'manager'] : ['admin']
  const { data } = await sb.from('profiles').select('id').in('ruolo', ruoli).eq('attivo', true)
  return (data ?? []).map(p => p.id)
}

async function inserisci(
  destinatari: string[],
  tipo: TipoNotifica,
  titolo: string,
  messaggio: string
) {
  if (destinatari.length === 0) return
  const sb = service()
  const rows = destinatari.map(d => ({
    destinatario_id: d, tipo, titolo, messaggio,
  }))
  await sb.from('notifiche').insert(rows)
}

function formatPeriodo(r: Richiesta): string {
  if (r.data_fine && r.data_fine !== r.data_inizio) {
    return `dal ${r.data_inizio} al ${r.data_fine}`
  }
  return `il ${r.data_inizio}`
}

export async function notificaRichiestaCreata(r: Richiesta, nomeDipendente: string) {
  const dest = await destinatariAdminManager(true)
  const dest_filtrati = dest.filter(d => d !== r.dipendente_id) // skip self
  await inserisci(dest_filtrati, 'richiesta_creata',
    `Nuova richiesta di ${ETICHETTA_TIPO[r.tipo].toLowerCase()}`,
    `${nomeDipendente} ha richiesto ${ETICHETTA_TIPO[r.tipo].toLowerCase()} ${formatPeriodo(r)}.`)
}

export async function notificaRichiestaApprovataManager(r: Richiesta, nomeDipendente: string, nomeManager: string) {
  const dest = await destinatariAdminManager(false) // solo admin
  await inserisci(dest, 'richiesta_approvata_manager',
    `Richiesta da convalidare`,
    `${nomeManager} ha approvato la richiesta di ${nomeDipendente} (${ETICHETTA_TIPO[r.tipo].toLowerCase()} ${formatPeriodo(r)}). Da convalidare.`)
}

export async function notificaRichiestaApprovata(r: Richiesta) {
  await inserisci([r.dipendente_id], 'richiesta_approvata',
    'Richiesta approvata',
    `La tua richiesta di ${ETICHETTA_TIPO[r.tipo].toLowerCase()} ${formatPeriodo(r)} è stata approvata.`)
}

export async function notificaRichiestaRifiutata(r: Richiesta, motivazione: string) {
  await inserisci([r.dipendente_id], 'richiesta_rifiutata',
    'Richiesta rifiutata',
    `La tua richiesta di ${ETICHETTA_TIPO[r.tipo].toLowerCase()} ${formatPeriodo(r)} è stata rifiutata.\nMotivo: ${motivazione}`)
}

export async function notificaRichiestaCancellata(r: Richiesta, nomeDipendente: string) {
  const dest = await destinatariAdminManager(true)
  await inserisci(dest, 'richiesta_cancellata',
    'Richiesta cancellata',
    `${nomeDipendente} ha cancellato la richiesta di ${ETICHETTA_TIPO[r.tipo].toLowerCase()} ${formatPeriodo(r)}.`)
}

export async function notificaMalattiaComunicata(r: Richiesta, nomeDipendente: string) {
  const dest = await destinatariAdminManager(true)
  await inserisci(dest, 'malattia_comunicata',
    `${nomeDipendente} ha comunicato malattia`,
    r.data_fine
      ? `${nomeDipendente} ha comunicato malattia ${formatPeriodo(r)}.`
      : `${nomeDipendente} ha comunicato malattia da ${r.data_inizio}, durata da definire.`)
}
```

- [ ] **Step 3: Verificare compile**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add lib/richieste/notifiche.ts
git commit -m "feat(richieste): helper per inserire notifiche sui 6 eventi delle richieste"
```

---

### Task 8: `lib/email.ts` — setup client Resend

**Files:**
- Modify: `package.json`
- Create: `lib/email.ts`

- [ ] **Step 1: Installare la dipendenza**

```bash
npm install resend
```

- [ ] **Step 2: Creare il client wrapper**

```typescript
// lib/email.ts
import { Resend } from 'resend'

let _client: Resend | null = null

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_client) _client = new Resend(key)
  return _client
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
}

// Invio non-bloccante: se Resend non è configurato o fallisce, logghiamo e ritorniamo false.
// I chiamanti NON devono lanciare: l'email è bonus rispetto alla notifica in-app.
export async function inviaEmail(p: EmailPayload): Promise<boolean> {
  const c = client()
  if (!c) {
    console.warn('[email] RESEND_API_KEY non configurata, email non inviata:', p.subject)
    return false
  }
  const from = process.env.RESEND_FROM
  if (!from) {
    console.warn('[email] RESEND_FROM non configurata, email non inviata:', p.subject)
    return false
  }
  try {
    const { error } = await c.emails.send({ from, to: p.to, subject: p.subject, html: p.html })
    if (error) {
      console.error('[email] Resend ha restituito errore:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] eccezione invio email:', err)
    return false
  }
}
```

- [ ] **Step 3: Aggiornare `.env.example` (se esiste, altrimenti saltare)**

Aggiungere queste righe (la chiave reale va in `.env.local`, mai committata):

```
RESEND_API_KEY=
RESEND_FROM=noreply@tuo-dominio.it
```

- [ ] **Step 4: Verificare compile**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add lib/email.ts package.json package-lock.json
# se .env.example esiste:
git add .env.example
git commit -m "feat(email): setup client Resend non-bloccante (no trigger ancora)"
```

---

### Task 9: API GET `/api/richieste` (lista)

**Files:**
- Create: `app/api/richieste/route.ts`

- [ ] **Step 1: Creare l'endpoint GET con filtri**

```typescript
// app/api/richieste/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SELECT = `
  *,
  dipendente:profiles!richieste_dipendente_id_fkey(id, nome, cognome, ruolo),
  manager:profiles!richieste_manager_id_fkey(id, nome, cognome),
  admin:profiles!richieste_admin_id_fkey(id, nome, cognome),
  turno:turni(id, data, ora_inizio, ora_fine, posto:posti_di_servizio(id, nome))
`

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  let query = supabase.from('richieste').select(SELECT).order('created_at', { ascending: false })

  const tipo = searchParams.get('tipo')
  if (tipo) query = query.eq('tipo', tipo)

  const stato = searchParams.get('stato')
  if (stato) query = query.eq('stato', stato)

  const dipendenteId = searchParams.get('dipendente_id')
  if (dipendenteId) query = query.eq('dipendente_id', dipendenteId)

  // mese=YYYY-MM → richieste con data_inizio in quel mese
  const mese = searchParams.get('mese')
  if (mese && /^\d{4}-\d{2}$/.test(mese)) {
    const inizio = `${mese}-01`
    const [yy, mm] = mese.split('-').map(Number)
    const fineDate = new Date(yy, mm, 0)  // ultimo giorno del mese
    const fine = `${mese}-${String(fineDate.getDate()).padStart(2, '0')}`
    query = query.gte('data_inizio', inizio).lte('data_inizio', fine)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Test manuale via curl/Postman**

Avvia il dev server (`npm run dev`) e chiama:

```bash
curl -b "supabase-cookie=..." http://localhost:3000/api/richieste
```

Atteso: array JSON (vuoto se nessuna richiesta esiste). RLS garantisce che il dipendente veda solo le proprie.

- [ ] **Step 3: Commit**

```bash
git add app/api/richieste/route.ts
git commit -m "feat(api): GET /api/richieste con filtri tipo/stato/dipendente/mese"
```

---

### Task 10: API POST `/api/richieste` (create)

**Files:**
- Modify: `app/api/richieste/route.ts`

- [ ] **Step 1: Aggiungere POST in coda al file**

Apri `app/api/richieste/route.ts` e aggiungi:

```typescript
import { validaCreazione } from '@/lib/richieste/validation'
import { notificaRichiestaCreata, notificaMalattiaComunicata } from '@/lib/richieste/notifiche'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  const valid = validaCreazione({
    tipo: body.tipo,
    data_inizio: body.data_inizio,
    data_fine: body.data_fine ?? null,
    permesso_tipo: body.permesso_tipo ?? null,
    ora_inizio: body.ora_inizio ?? null,
    ora_fine: body.ora_fine ?? null,
    turno_id: body.turno_id ?? null,
    note_dipendente: body.note_dipendente ?? null,
  })
  if (!valid.ok) return NextResponse.json({ error: valid.errore }, { status: 400 })

  // Malattia entra direttamente in 'comunicata' (senza approvazione)
  const stato = body.tipo === 'malattia' ? 'comunicata' : 'pending'

  const { data, error } = await supabase
    .from('richieste')
    .insert({
      dipendente_id: user.id,
      tipo: body.tipo,
      data_inizio: body.data_inizio,
      data_fine: body.data_fine ?? null,
      permesso_tipo: body.permesso_tipo ?? null,
      ora_inizio: body.ora_inizio ?? null,
      ora_fine: body.ora_fine ?? null,
      turno_id: body.turno_id ?? null,
      note_dipendente: body.note_dipendente ?? null,
      stato,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifiche (non-bloccanti)
  const nomeDip = data.dipendente
    ? `${data.dipendente.nome} ${data.dipendente.cognome}`
    : 'Dipendente'
  try {
    if (body.tipo === 'malattia') {
      await notificaMalattiaComunicata(data, nomeDip)
    } else {
      await notificaRichiestaCreata(data, nomeDip)
    }
  } catch (e) {
    console.error('[richieste] errore notifica creazione:', e)
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Verificare compile**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Test manuale via curl**

Loggato come dipendente, prova:

```bash
curl -X POST http://localhost:3000/api/richieste \
  -H "Content-Type: application/json" \
  -b "..." \
  -d '{"tipo":"ferie","data_inizio":"2026-06-10","data_fine":"2026-06-15"}'
```

Atteso: 201 con la richiesta creata; gli admin/manager devono ricevere notifica in-app.

Test validazione: `data_inizio` troppo a ridosso → 400 con messaggio "almeno 7 giorni di anticipo".

- [ ] **Step 4: Commit**

```bash
git add app/api/richieste/route.ts
git commit -m "feat(api): POST /api/richieste (validazione + notifica creazione/malattia)"
```

---

### Task 11: API GET `/api/richieste/[id]` (detail)

**Files:**
- Create: `app/api/richieste/[id]/route.ts`

- [ ] **Step 1: Creare l'endpoint GET**

```typescript
// app/api/richieste/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SELECT = `
  *,
  dipendente:profiles!richieste_dipendente_id_fkey(id, nome, cognome, ruolo),
  manager:profiles!richieste_manager_id_fkey(id, nome, cognome),
  admin:profiles!richieste_admin_id_fkey(id, nome, cognome),
  turno:turni(id, data, ora_inizio, ora_fine, posto:posti_di_servizio(id, nome))
`

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('richieste')
    .select(SELECT)
    .eq('id', params.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Test manuale**

```bash
curl http://localhost:3000/api/richieste/<id-valido> -b "..."
```

Atteso: 200 con la richiesta; 404 se non esiste o RLS la nasconde.

- [ ] **Step 3: Commit**

```bash
git add app/api/richieste/[id]/route.ts
git commit -m "feat(api): GET /api/richieste/[id] (dettaglio singola richiesta)"
```

---

### Task 12: API PATCH `/api/richieste/[id]` (transizioni stato)

**Files:**
- Modify: `app/api/richieste/[id]/route.ts`

- [ ] **Step 1: Aggiungere PATCH in fondo al file**

```typescript
import { MOTIVAZIONE_MIN_LEN } from '@/lib/richieste/config'
import {
  notificaRichiestaApprovataManager,
  notificaRichiestaApprovata,
  notificaRichiestaRifiutata,
  notificaRichiestaCancellata,
} from '@/lib/richieste/notifiche'

type Azione = 'cancella' | 'approva' | 'rifiuta' | 'convalida'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  const azione = body.azione as Azione
  if (!azione) return NextResponse.json({ error: 'azione obbligatoria' }, { status: 400 })

  // Carica la richiesta corrente + il ruolo e il nome dell'utente che agisce
  const [{ data: r }, { data: profilo }] = await Promise.all([
    supabase.from('richieste').select(SELECT).eq('id', params.id).maybeSingle(),
    supabase.from('profiles').select('ruolo, nome, cognome').eq('id', user.id).single(),
  ])
  if (!r) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })

  const ruolo = profilo?.ruolo
  const nomeAttore = profilo ? `${profilo.nome} ${profilo.cognome}` : 'Utente'
  const isManager = ruolo === 'manager' || ruolo === 'admin'
  const isAdmin = ruolo === 'admin'
  const isProprietario = r.dipendente_id === user.id

  let updates: Record<string, unknown> = {}

  if (azione === 'cancella') {
    if (!isProprietario) return NextResponse.json({ error: 'Solo il proprietario può cancellare' }, { status: 403 })
    if (r.stato !== 'pending') return NextResponse.json({ error: 'Cancellabile solo in stato pending' }, { status: 409 })
    updates = { stato: 'annullata' }
  }
  else if (azione === 'approva') {
    if (!isManager) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    if (r.stato !== 'pending') return NextResponse.json({ error: 'Approvabile solo da pending' }, { status: 409 })
    if (isAdmin) {
      // Admin approva diretto → 'approvata' finale
      updates = {
        stato: 'approvata',
        admin_id: user.id,
        admin_decisione_at: new Date().toISOString(),
      }
    } else {
      // Manager approva → 'approvata_manager' (in attesa convalida admin)
      updates = {
        stato: 'approvata_manager',
        manager_id: user.id,
        manager_decisione_at: new Date().toISOString(),
      }
    }
  }
  else if (azione === 'convalida') {
    if (!isAdmin) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
    if (r.stato !== 'approvata_manager') return NextResponse.json({ error: 'Convalida solo da approvata_manager' }, { status: 409 })
    updates = {
      stato: 'approvata',
      admin_id: user.id,
      admin_decisione_at: new Date().toISOString(),
    }
  }
  else if (azione === 'rifiuta') {
    if (!isManager) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    if (!['pending', 'approvata_manager'].includes(r.stato)) {
      return NextResponse.json({ error: 'Rifiutabile solo da pending o approvata_manager' }, { status: 409 })
    }
    const motivazione = (body.motivazione ?? '').trim()
    if (motivazione.length < MOTIVAZIONE_MIN_LEN) {
      return NextResponse.json({ error: `Motivazione obbligatoria (min ${MOTIVAZIONE_MIN_LEN} caratteri)` }, { status: 400 })
    }
    updates = {
      stato: 'rifiutata',
      motivazione_decisione: motivazione,
      ...(isAdmin
        ? { admin_id: user.id, admin_decisione_at: new Date().toISOString() }
        : { manager_id: user.id, manager_decisione_at: new Date().toISOString() }),
    }
  }
  else {
    return NextResponse.json({ error: 'azione non valida' }, { status: 400 })
  }

  const { data: aggiornata, error: updErr } = await supabase
    .from('richieste')
    .update(updates)
    .eq('id', params.id)
    .select(SELECT)
    .single()
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Notifiche post-transizione (non-bloccanti). NB: la creazione automatica dei
  // turni FERIE/PERMESSO/MALATTIA arriverà in Fase 4. Per ora solo notifiche.
  const nomeDip = aggiornata.dipendente
    ? `${aggiornata.dipendente.nome} ${aggiornata.dipendente.cognome}`
    : 'Dipendente'
  try {
    if (azione === 'cancella') {
      await notificaRichiestaCancellata(aggiornata, nomeDip)
    } else if (aggiornata.stato === 'approvata_manager') {
      await notificaRichiestaApprovataManager(aggiornata, nomeDip, nomeAttore)
    } else if (aggiornata.stato === 'approvata') {
      await notificaRichiestaApprovata(aggiornata)
    } else if (aggiornata.stato === 'rifiutata') {
      await notificaRichiestaRifiutata(aggiornata, updates.motivazione_decisione as string)
    }
  } catch (e) {
    console.error('[richieste] errore notifica transizione:', e)
  }

  return NextResponse.json(aggiornata)
}
```

- [ ] **Step 2: Verificare compile**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Test manuale del ciclo completo**

1. Crea una richiesta come dipendente (POST /api/richieste)
2. Loggato come manager: PATCH /api/richieste/<id> body `{"azione":"approva"}` → stato `approvata_manager`
3. Loggato come admin: PATCH stesso id body `{"azione":"convalida"}` → stato `approvata`
4. Crea altra richiesta, prova `{"azione":"rifiuta","motivazione":"manca personale"}` → stato `rifiutata`
5. Crea altra richiesta come dipendente, prova `{"azione":"cancella"}` → stato `annullata`

Verifica le notifiche generate nella tabella `notifiche`.

- [ ] **Step 4: Commit**

```bash
git add app/api/richieste/[id]/route.ts
git commit -m "feat(api): PATCH /api/richieste/[id] con transizioni cancella/approva/rifiuta/convalida"
```

---

### Task 13: API GET `/api/richieste/pending-count` (badge contatore)

**Files:**
- Create: `app/api/richieste/pending-count/route.ts`

- [ ] **Step 1: Creare l'endpoint**

```typescript
// app/api/richieste/pending-count/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const { data: profilo } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  const ruolo = profilo?.ruolo

  // Manager vede solo pending; admin vede pending + approvata_manager (da convalidare)
  let stati: string[] = []
  if (ruolo === 'manager') stati = ['pending']
  else if (ruolo === 'admin') stati = ['pending', 'approvata_manager']
  else return NextResponse.json({ count: 0 })

  const { count, error } = await supabase
    .from('richieste')
    .select('id', { count: 'exact', head: true })
    .in('stato', stati)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: count ?? 0 })
}
```

- [ ] **Step 2: Test manuale**

```bash
curl http://localhost:3000/api/richieste/pending-count -b "..."
```

Atteso: `{ "count": N }` dove N varia in base al ruolo dell'utente loggato.

- [ ] **Step 3: Commit**

```bash
git add app/api/richieste/pending-count/route.ts
git commit -m "feat(api): GET /api/richieste/pending-count per badge sidebar"
```

---

## Self-review della Fase 1

Dopo aver completato tutti i task, esegui questa checklist:

- [ ] Tutte le 3 migrazioni applicate sul DB e schema verificato
- [ ] `npx tsc --noEmit` passa senza errori
- [ ] `npx vitest run tests/unit/richieste-validation.test.ts` → 8/8 verde
- [ ] Test manuale del ciclo completo dipendente → manager → admin (vedi Task 12 step 3)
- [ ] Le notifiche compaiono nella campanella in-app come atteso
- [ ] Build production passa: `npm run build`

## Cosa NON è in questa fase (riferimenti per le fasi successive)

- **UI dipendente** (`/dipendente/richieste`, form) → Fase 2
- **UI manager/admin** (`/admin/richieste`, modali) → Fase 3
- **Auto-creazione turni FERIE/PERMESSO/MALATTIA** su `approvata`/`comunicata` → Fase 4
- **Trigger email Resend** dentro la PATCH → Fase 5
- **API + UI per chiusura malattia open-ended** (`POST /api/richieste/[id]/rientro`) → Fase 6

Il codice della Fase 1 lascia "ganci puliti" per le fasi successive: la PATCH e la POST hanno il TODO implicito di chiamare le funzioni di auto-create turni e di invio email, ma per ora si limitano alle transizioni di stato + notifiche in-app.
