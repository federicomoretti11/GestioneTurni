# Calendario di programmazione (bozza) — Design

**Data:** 2026-04-23
**Tipo:** Feature (schema + API + UI)
**Contesto:** l'utente vuole un'area di pianificazione turni separata dal calendario ufficiale, per poter lavorare sul piano del mese senza che i dipendenti vedano i turni finché non sono confermati. I dati sono gli stessi `turni`, ma alcuni vivono in stato "bozza" e diventano "confermati" solo quando l'admin pubblica un periodo.

---

## 1. Obiettivo

Offrire una **seconda vista calendario** (desktop + mobile, per dipendente + per posto) dove admin può pianificare turni senza notifiche e senza visibilità per i dipendenti, confermando poi un periodo scelto (settimana / mese / range custom) per pubblicarli in blocco.

## 2. Scope

**In scope (MVP):**

- Colonna `stato` su `turni` con valori `'bozza' | 'confermato'`
- RLS aggiornata: dipendenti non vedono mai turni bozza
- 4 nuove pagine:
  - `/admin/calendario-programmazione` (per dipendente)
  - `/admin/calendario-programmazione-posti` (per posto)
  - `/manager/calendario-programmazione` (read-only)
  - `/manager/calendario-programmazione-posti` (read-only)
- Selettore periodo + bottone "Conferma periodo" con preset (settimana/mese/custom)
- Endpoint `POST /api/turni/conferma-periodo`
- Endpoint `POST /api/turni/copia-da-periodo` per partire da un periodo ufficiale precedente
- Endpoint `POST /api/turni/svuota-bozza-periodo` per ripulire
- Nuovo tipo notifica `turni_pubblicati` aggregato per dipendente
- Voce sidebar "Programmazione" con badge contatore bozze per admin
- Helper centralizzato `queryTurni` per ridurre il rischio di regressione sui filtri `stato`

**Fuori scope (rimandato):**

- Manager che crea/modifica in bozza (MVP: manager solo legge)
- Rollback "confermato → bozza"
- Detection automatica di conflitti con turni ufficiali esistenti al momento della conferma
- Export/timbrature/banner che includano la bozza
- Dipendente che vede un'"anteprima" dei turni in bozza
- Toast/feedback esplicito post-conferma (la pagina si aggiorna, è sufficiente)

## 3. Data model

Una sola colonna nuova:

```sql
-- migration 007_turni_stato.sql
create type stato_turno as enum ('bozza', 'confermato');

alter table turni
  add column stato stato_turno not null default 'confermato';

create index idx_turni_stato_data on turni(stato, data);
```

**Scelte:**

- Default `'confermato'`: tutti i turni esistenti restano ufficiali senza alcun backfill.
- Solo turni creati dalle pagine programmazione partono come `'bozza'`.
- La conferma di un periodo è un `UPDATE` dello stato: un turno ha un solo record, che transita da bozza a confermato. Nessuna duplicazione, nessuna tabella parallela.

## 4. RLS

Unica policy da toccare: la SELECT del dipendente, che oggi filtra solo per `auth.uid()`.

```sql
-- migration 007_turni_stato.sql (stesso file)
drop policy "dipendente_turni_select" on turni;
create policy "dipendente_turni_select" on turni
  for select using (
    get_my_role() = 'dipendente'
    and dipendente_id = auth.uid()
    and stato = 'confermato'
  );
```

Admin e manager hanno `for all`, continuano a vedere tutto; la distinzione tra pagine ufficiale/bozza è lato query, non RLS.

**Effetto:** difesa a livello DB. Anche se una futura query dimentica il filtro `stato`, il dipendente non vedrà mai una bozza.

## 5. Helper `queryTurni` (difesa contro regressioni)

Nuovo file `lib/supabase/turni.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

type Filtro = 'confermati' | 'bozza' | 'tutti'

export function queryTurni(client: SupabaseClient, filtro: Filtro = 'confermati') {
  const q = client.from('turni').select('*')
  if (filtro === 'confermati') return q.eq('stato', 'confermato')
  if (filtro === 'bozza') return q.eq('stato', 'bozza')
  return q
}
```

Tutte le letture turni passano da qui. Il default è `'confermati'`: per leggere la bozza devi chiederlo esplicitamente.

**Audit obbligatorio nel plan:** grep di tutti i `.from('turni')` esistenti, migrarli a `queryTurni` o annotare esplicitamente il filtro.

## 6. API

### Route esistenti — modifiche minimali

| Route | Modifica |
|---|---|
| `POST /api/turni` | Accetta `stato?: 'bozza' \| 'confermato'` (default `'confermato'`). Se `bozza`, skippa `notificaTurnoAssegnato`. |
| `PUT /api/turni/[id]` | Idem: se il record è bozza prima e dopo, nessuna notifica. |
| `DELETE /api/turni/[id]` | Se era bozza, nessuna notifica di eliminazione. |
| `POST /api/turni/copia-settimana` | Accetta `stato?`. Se `bozza`, i turni clonati restano bozza e nessuna `notificaSettimanaPianificata`. |
| `POST /api/turni/[id]/check-in` / `check-out` | Guard: se il turno è bozza, ritorna 404. Protezione ulteriore oltre all'RLS. |

### Nuove route

**`POST /api/turni/conferma-periodo`**

```ts
// body: { data_inizio: 'YYYY-MM-DD', data_fine: 'YYYY-MM-DD' }
// auth: admin (MVP)
// 1. SELECT dipendente_id, count(*) FROM turni WHERE stato='bozza' AND data BETWEEN inizio AND fine, GROUP BY dipendente_id
// 2. UPDATE turni SET stato='confermato' WHERE stato='bozza' AND data BETWEEN inizio AND fine
// 3. Per ogni dipendente: insert notifica aggregata (tipo 'turni_pubblicati')
// 4. Return { confermati: N, dipendenti: M }
```

Idempotente: una seconda chiamata non trova più righe bozza nel periodo, `confermati: 0`.

**`POST /api/turni/copia-da-periodo`**

```ts
// body: { origine_inizio: 'YYYY-MM-DD', origine_fine: 'YYYY-MM-DD',
//          destinazione_inizio: 'YYYY-MM-DD' }
// auth: admin (MVP)
// Legge i turni ufficiali nel range origine, li duplica in bozza sfasando
// le date in modo che il primo giorno di origine mappi a destinazione_inizio.
// Mantiene dipendente, template, posto, orari, note. stato='bozza', nessuna notifica.
// Return { copiati: N }
```

**`POST /api/turni/svuota-bozza-periodo`**

```ts
// body: { data_inizio: 'YYYY-MM-DD', data_fine: 'YYYY-MM-DD' }
// auth: admin (MVP)
// DELETE FROM turni WHERE stato='bozza' AND data BETWEEN inizio AND fine
// Return { eliminati: N }
```

Tutte e tre le nuove route verificano il ruolo admin all'inizio (pattern esistente nel progetto).

## 7. Notifiche

**Nuovo tipo:** `turni_pubblicati`.

**Migration:**

```sql
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

**Helper** in `lib/notifiche.ts`:

```ts
notificaTurniPubblicati({
  dipendenteIds: string[],
  dataInizio: string,
  dataFine: string,
  actorId: string,
  conteggioPerDipendente: Record<string, number>,
})
```

Messaggio: `"{N} turni pubblicati dal {data_inizio} al {data_fine}"` (o wording simile, con `formatDateIT`).
`data_turno` = `dataInizio` → cliccare la notifica porta a `/dipendente/turni?data={dataInizio}`.

**UI:** icona in `iconaPerTipo` per il nuovo tipo (es. `📣`).

## 8. UI nuove pagine

### Riuso componenti

`GrigliaCalendario`, `GrigliaCalendarioPosti`, `GrigliaCalendarioMobile`, `GrigliaCalendarioPostiMobile`, `CellaCalendario`, `BadgeTurno`, `ModaleTurno` **restano invariati**. Le nuove pagine sono wrapper che:

- Fetchano con `queryTurni(supabase, 'bozza')`
- Passano `stato: 'bozza'` alle API di create/edit/copia-settimana
- Aggiungono l'header della sezione (selettore periodo + azioni)
- Cambiano titolo/banner/sidebar entry

### Header della pagina admin

Sopra la griglia, in un pannello:

- **Selettore periodo** con preset:
  - Questa settimana
  - Prossima settimana
  - Mese corrente
  - Prossimo mese
  - Personalizzato (due date picker)
- **Azioni** (bottoni in fila):
  - **Copia da periodo ufficiale** → modale: "Copia i turni da [periodo origine] in bozza su [periodo destinazione]"
  - **Svuota bozza del periodo** → modale di conferma: "Eliminare N turni bozza nel periodo?"
  - **Conferma periodo** (primario, evidenziato) → modale di conferma: "Pubblicare N turni per M dipendenti?" — solo se esistono bozze nel periodo, altrimenti disabilitato con hint "Nessun turno bozza"

### Header della pagina manager

Stesso banner "Modalità bozza", ma senza azioni né FAB creazione turno. Può solo cambiare periodo visualizzato.

### Differenziazione visiva

- **Titolo pagina:** "Programmazione" (mai "Calendario")
- **Banner in cima:** ribbon sottile ambra/giallino con "📝 Modalità bozza — i turni non sono visibili ai dipendenti finché non li confermi"
- **Modale turno aperto su un turno bozza:** chip "BOZZA" nell'header del modale
- **FAB creazione turno (mobile):** etichetta "+ Nuovo turno in bozza"

## 9. Navigazione e contatore bozza

### Sidebar

Nuova voce **"Programmazione"** (icona matita o calendario-con-spunta), sotto "Calendario":

- Admin: due sotto-voci (Per dipendente / Per posto), entrambe navigano alle `/admin/calendario-programmazione*`
- Manager: idem, verso `/manager/calendario-programmazione*`
- Dipendente: voce non visibile

### Badge contatore (admin)

Accanto alla voce "Programmazione" in sidebar, un piccolo badge mostra il numero totale di turni attualmente in bozza (tutti i periodi). Si aggiorna:

- Al caricamento di ogni pagina admin
- Via Supabase Realtime: subscription `postgres_changes` su `turni` per eventi `INSERT`, `UPDATE`, `DELETE`. Su `INSERT` di una bozza o `UPDATE` confermato→bozza il contatore cresce; su `UPDATE` bozza→confermato o `DELETE` di una bozza cala. Strategia: re-fetch del conteggio al ricevere un evento (semplice e robusto).

Endpoint di supporto: `GET /api/turni/bozza-count` che ritorna `{ count: N }`.
Se `count === 0`, il badge non appare.

**Manager:** niente badge (conferma non è la loro responsabilità).

## 10. Esclusioni — dove la bozza NON deve comparire

| Vista / funzione | Comportamento |
|---|---|
| `/admin/calendario`, `/admin/calendario-posti` | `queryTurni('confermati')` — default |
| `/manager/calendario`, `/manager/calendario-posti` | `queryTurni('confermati')` |
| `/dipendente/turni` | RLS + `queryTurni('confermati')` (doppio belt-and-suspenders) |
| `BannerTurnoOggi` (dipendente) | RLS filtra a monte |
| API `POST /api/turni/[id]/check-in`, `check-out` | Guard esplicito: 404 se turno bozza |
| Export PDF/Excel | `queryTurni('confermati')` nell'aggregazione dati |
| Dashboard admin (contatori ufficiali) | `queryTurni('confermati')` |
| Copia-settimana dal calendario ufficiale | Crea con `stato='confermato'` (default) |
| Copia-settimana dalla programmazione | Crea con `stato='bozza'` |

## 11. Edge cases

| Caso | Comportamento |
|---|---|
| Conferma di un periodo senza bozze | Alert UI "Nessun turno bozza nel periodo"; bottone disabilitato |
| Conferma rilanciata due volte | Idempotente: seconda chiamata trova 0 righe, notifiche non duplicate |
| Dipendente disattivato con turno bozza | Turno confermato comunque; notifica skippata (coerente con pattern esistente) |
| Bozza + ufficiale stesso dipendente/slot | Nessun controllo automatico: dopo la conferma ci saranno due turni ufficiali sovrapposti, risolvibili a mano |
| Turno bozza spalmato su giorni diversi | Ogni turno ha una `data` singola: la conferma per range pesca esattamente i turni con `data` nel range |
| Dipendente cambia reparto con turno bozza attivo | Il `dipendente_id` sul turno non cambia (è la stessa persona). La conferma procede e la notifica va al dipendente come sempre. Il manager del vecchio reparto potrebbe non vedere più il turno nelle sue query filtrate per reparto — comportamento coerente con il resto dell'app. |
| Copia da periodo ufficiale su un range di destinazione che ha già bozze | La copia AGGIUNGE: convive con le bozze già presenti. L'utente può usare "Svuota bozza del periodo" prima, se vuole tabula rasa |
| Copia-da-periodo con durata destinazione diversa dall'origine | L'origine definisce la durata: il range di destinazione è implicito (parte da `destinazione_inizio`, durata = durata origine) |
| Conferma di un periodo a cavallo di due mesi | Permesso, il range è libero |

## 12. Testing manuale

Scenario end-to-end:

1. Login admin → sidebar mostra "Programmazione" senza badge
2. Vai in `/admin/calendario-programmazione` → banner modalità bozza visibile
3. Crea 3 turni per dipendente X nei prossimi 7 giorni → badge in sidebar compare con "3"
4. Controlla `/dipendente/turni` (altro tab con user dipendente) → nessun turno visibile (la campanella non riceve notifiche)
5. Torna su admin, click "Copia da periodo ufficiale" → copia una settimana ufficiale precedente → badge aumenta
6. Click "Conferma periodo" sui prossimi 7 giorni → alert conferma "N turni per M dipendenti" → conferma
7. Pagina programmazione si ricarica vuota per quel periodo (turni sono passati a confermato); badge diminuisce
8. `/dipendente/turni` ora mostra i turni nuovi; la campanella ha una notifica "N turni pubblicati"
9. Manager del reparto: login → `/manager/calendario-programmazione` read-only mostra solo le bozze del suo reparto (nessun bottone)

## 13. Roadmap out-of-scope

- **Manager che crea in bozza**: abilita scrittura `stato='bozza'` via RLS e UI per manager del reparto
- **Rollback**: endpoint `POST /api/turni/riporta-in-bozza-periodo` che fa `UPDATE stato='bozza'`
- **Conflict detection**: al momento della conferma mostra elenco turni bozza che si sovrappongono ad ufficiali esistenti
- **Toast/feedback post-conferma**: al momento non richiesto
- **Dipendente preview mode**: sezione "anteprima prossimo mese" separata dal calendario ufficiale
- **Export include bozza**: export distinti (ufficiale, bozza, entrambi)

## 14. Non-obiettivi riconfermati

- Nessuna nuova tabella (solo colonna `stato` su `turni`)
- Nessun cambio al sistema di autenticazione
- Nessuna modifica a `timbrature`, `festivi`, `template`, `posti`, `profiles`
- Nessuna dipendenza npm nuova
