# Badge timbratura nella griglia calendario — Design

**Data:** 2026-04-23
**Tipo:** Feature UX (nessuno schema, nessuna nuova API)
**Contesto:** item #2 dell'elenco rimandati post-MVP timbrature. I campi `ora_ingresso_effettiva` e `ora_uscita_effettiva` esistono già sui turni, ma oggi sono visibili solo aprendo il `ModaleTurno`. Obiettivo: mostrare lo stato di timbratura a colpo d'occhio sulla griglia calendario.

---

## 1. Obiettivo

Rendere visibile, direttamente dalla griglia calendario (desktop e mobile), lo stato di timbratura di ogni turno, così che admin e manager possano capire a colpo d'occhio chi ha iniziato, chi ha finito, e chi non ha ancora timbrato, senza aprire il modale turno per turno.

## 2. Scope

**In scope:**

- Indicatore visivo di stato di timbratura sul badge turno nella griglia calendario, nelle quattro varianti:
  - `GrigliaCalendario` (desktop, raggruppata per dipendente)
  - `GrigliaCalendarioPosti` (desktop, raggruppata per posto)
  - `GrigliaCalendarioMobile` (mobile, raggruppata per dipendente)
  - `GrigliaCalendarioPostiMobile` (mobile, raggruppata per posto)
- Tooltip desktop (`title` HTML nativo) con orari effettivi timbrati
- Visibilità per tutti i ruoli che accedono alla griglia (admin, manager)

**Fuori scope (non MVP, da valutare dopo):**

- Semantica "puntuale / in ritardo" (richiede definire soglie configurabili)
- Stato "anomalia" (turno scaduto senza check-out, ecc.) — appartiene alla feature "correzione manuale admin"
- Badge sulle viste non-griglia (`/dipendente/turni`): il `BannerTurnoOggi` copre già il caso dipendente
- Filtri / ricerca per stato timbratura
- Tooltip mobile (long-press): il tap sulla riga apre già il modale che mostra gli orari

## 3. Stati

Tre stati derivati puri dai due campi esistenti:

| Stato | Condizione | Pallino | Colore |
|---|---|---|---|
| `non_iniziato` | `ora_ingresso_effettiva` nullo | *nessuno* | — |
| `in_corso` | `ora_ingresso_effettiva` presente, `ora_uscita_effettiva` nullo | presente | `amber-500` |
| `completato` | entrambi i campi presenti | presente | `emerald-500` |

Decisioni di design:

- Nessun pallino per `non_iniziato` → zero rumore visivo sulla maggior parte dei turni (futuri, passati senza timbro). Il pallino appare solo quando c'è informazione utile.
- Turni di riposo (`ore === 0` sul calcolo ore) → mai pallino, anche in presenza di timbri spurii. Il tipo "riposo" non supporta timbrature semanticamente.
- Nessuna logica di anomalia: se un timestamp è nel futuro o incoerente, lo stato derivato rispecchia solo la *presenza* dei campi. L'anomalia verrà trattata dalla feature di correzione manuale admin.

## 4. Rendering

### Desktop

Pallino 6px sovrapposto in alto a destra del `BadgeTurno`, con attributo `title` HTML nativo come tooltip:

- `in_corso` → `title="Ingresso HH:MM · in corso"`
- `completato` → `title="Ingresso HH:MM · Uscita HH:MM"`

Scelta del `title` nativo invece di un tooltip custom: zero dipendenze, comportamento standard del browser, accessibile gratis.

### Mobile

Pallino 8px inline, subito dopo la chip colorata del template nella riga turno. Stessa semantica (colore → stato). Nessun tooltip — il tap sulla riga apre il `ModaleTurno` che già ha la sezione "Timbrature".

### Accessibilità

`aria-label` sul pallino con testo esplicito dello stato (`"Turno in corso"` / `"Turno completato"`). Non ci si affida al solo colore.

## 5. Architettura

Nessuna modifica di schema, API, query. Una sola utility e un nuovo componente presentazionale.

### Nuovo: `components/ui/PallinoTimbratura.tsx`

```ts
interface Props {
  stato: StatoTimbratura
  oraIngresso?: string | null   // timestamptz ISO, opzionale
  oraUscita?: string | null
  size?: 'sm' | 'md'            // 'sm' = 6px (desktop), 'md' = 8px (mobile)
}
```

Comportamento:

- Rende `null` se `stato === 'non_iniziato'`
- Altrimenti uno `<span>` con dimensione, colore di sfondo (amber/emerald), `aria-label` e `title` (se gli orari sono stati passati)
- Logica di formattazione del `title` incapsulata nel componente: il chiamante passa gli orari e il componente decide il testo

### Nuovo: `lib/utils/turni.ts` → `statoTimbratura`

```ts
export type StatoTimbratura = 'non_iniziato' | 'in_corso' | 'completato'

export function statoTimbratura(t: Pick<Turno, 'ora_ingresso_effettiva' | 'ora_uscita_effettiva'>): StatoTimbratura {
  if (t.ora_ingresso_effettiva && t.ora_uscita_effettiva) return 'completato'
  if (t.ora_ingresso_effettiva) return 'in_corso'
  return 'non_iniziato'
}
```

Funzione pura, testabile, riusabile da ogni vista.

### Punti di modifica

| File | Cambiamento |
|---|---|
| `lib/utils/turni.ts` | Aggiungi tipo `StatoTimbratura` e funzione `statoTimbratura` |
| `components/ui/Badge.tsx` (`BadgeTurno`) | Due nuove props opzionali `oraIngressoEffettiva`, `oraUscitaEffettiva`; calcolo stato; piazza `<PallinoTimbratura size="sm">` in alto a destra con orari (così il `title` contiene gli orari) |
| `components/calendario/CellaCalendario.tsx` | Inoltra `t.ora_ingresso_effettiva` e `t.ora_uscita_effettiva` a `BadgeTurno` |
| `components/calendario/GrigliaCalendarioMobile.tsx` | Piazza `<PallinoTimbratura size="md">` dopo la chip template; non passare gli orari (no tooltip su mobile) |
| `components/calendario/GrigliaCalendarioPostiMobile.tsx` | Stesso trattamento della griglia mobile standard |

`GrigliaCalendarioPosti` (desktop) beneficia automaticamente del cambiamento perché usa lo stesso `CellaCalendario` → `BadgeTurno`.

## 6. Realtime

Le pagine calendario già si abbonano via Supabase Realtime (pattern usato per notifiche). Quando i campi `ora_ingresso_effettiva` / `ora_uscita_effettiva` cambiano sul DB, lo stato React si aggiorna e il pallino appare/cambia colore automaticamente.

**Verifica necessaria in plan:** controllare che le query calendario selezionino esplicitamente i due campi dalla tabella `turni` (probabile, dato che il `ModaleTurno` li legge già, ma da confermare).

## 7. Casi limite

| Caso | Comportamento |
|---|---|
| Turno di riposo (ore = 0) | Nessun pallino, anche con timbri |
| Turno notturno a cavallo di mezzanotte | Tooltip mostra solo `HH:MM`, senza logica speciale |
| Timestamp corrotto o nel futuro | Pallino visibile (stato derivato dalla *presenza*, non dal valore) — segnale implicito che va corretto |
| Turno passato senza timbri | Nessun pallino; lo "sbiancamento" della cella è già gestito da `isPassato` |
| Solo check-out senza check-in (stato invalido) | Funzione `statoTimbratura` ritorna `non_iniziato` — il check-in è il discriminante |

## 8. Testing manuale

Seedare tre turni di oggi:

- Uno senza timbri → nessun pallino su desktop e mobile
- Uno con solo `ora_ingresso_effettiva` → pallino ambra, tooltip desktop `"Ingresso HH:MM · in corso"`, niente tooltip mobile
- Uno con entrambi i campi → pallino verde, tooltip desktop `"Ingresso HH:MM · Uscita HH:MM"`

Verificare inoltre che un check-in fatto da un secondo tab/sessione faccia comparire il pallino senza refresh manuale (Realtime).

## 9. Non-obiettivi riconfermati

- Nessuna migrazione DB
- Nessuna nuova rotta API
- Nessuna modifica a permessi / RLS
- Nessuna nuova dipendenza npm
