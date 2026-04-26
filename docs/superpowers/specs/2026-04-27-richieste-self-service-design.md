# Self-service dipendente — Sistema richieste

**Data:** 2026-04-27
**Stato:** design approvato, in attesa di piano di implementazione
**Scope:** sistema unificato di richieste dipendente → manager/admin per ferie, permessi, malattia, cambio turno

## Obiettivo

Permettere al dipendente di inviare richieste dalla propria schermata, evitando canali esterni (chat, voce). Il manager/admin riceve, decide in app con tracciamento, e — quando una richiesta è approvata — il calendario turni viene aggiornato automaticamente.

L'iniziativa NON include un sistema di saldo ferie/permessi (rimandato a un futuro modulo HR/paghe). Si limita a registrare le richieste e i loro effetti sul calendario.

## Architettura generale

**Una sola entità `richieste`** copre tutti e quattro i tipi (ferie, permesso, malattia, cambio turno). Campi opzionali per le specificità di ogni tipo. Approccio scelto contro le tabelle separate per minimizzare la duplicazione di logica (stati, notifiche, RLS, query di lista).

**Catena di approvazione gerarchica con override admin:**

```
pending  ──manager approva──►  approvata_manager  ──admin convalida──►  approvata
   │                                   │
   │                                   └──admin rifiuta──►  rifiutata
   │
   ├──admin approva diretto──►  approvata    (bypass manager)
   ├──manager o admin rifiuta──►  rifiutata
   └──dipendente cancella──►  annullata    (solo da pending)
```

La **malattia** è un'eccezione: salta direttamente a `comunicata` senza approvazione (è una notifica, non una richiesta). I turni MALATTIA vengono creati immediatamente.

**Effetti dell'approvazione finale:**

- Ferie / Permesso / Malattia → il sistema crea automaticamente i turni nei giorni richiesti, usando il template attivo con `categoria` corrispondente
- Cambio turno → nessuna creazione automatica; manager/admin ridistribuisce manualmente nella pagina Programmazione esistente

**Permessi per ruolo:**

| Azione | Dipendente | Manager | Admin |
|---|---|---|---|
| Crea richiesta | ✓ (per sé) | — | — |
| Cancella | ✓ (solo da pending) | — | — |
| Approva (1° step) | — | ✓ | ✓ |
| Convalida (2° step) | — | — | ✓ |
| Rifiuta | — | ✓ | ✓ |

## Modello dati

### Nuova tabella `richieste`

```sql
CREATE TYPE tipo_richiesta AS ENUM ('ferie','permesso','malattia','cambio_turno');
CREATE TYPE stato_richiesta AS ENUM ('pending','approvata_manager','approvata',
                                     'rifiutata','annullata','comunicata');
CREATE TYPE permesso_tipo AS ENUM ('giornata','mezza_mattina','mezza_pomeriggio','ore');

CREATE TABLE richieste (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo                     tipo_richiesta NOT NULL,

  -- Range giorni (sempre presente; data_fine NULL solo per malattia open-ended)
  data_inizio              date NOT NULL,
  data_fine                date,

  -- Solo per permesso
  permesso_tipo            permesso_tipo,
  ora_inizio               time,         -- solo se permesso_tipo='ore'
  ora_fine                 time,

  -- Solo per cambio_turno
  turno_id                 uuid REFERENCES turni(id) ON DELETE SET NULL,

  -- Stato e flusso
  stato                    stato_richiesta NOT NULL DEFAULT 'pending',
  note_dipendente          text,
  motivazione_decisione    text,         -- obbligatoria su rifiuto

  -- Tracking decisori
  manager_id               uuid REFERENCES profiles(id),
  manager_decisione_at     timestamptz,
  admin_id                 uuid REFERENCES profiles(id),
  admin_decisione_at       timestamptz,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Indici
CREATE INDEX idx_richieste_dipendente ON richieste(dipendente_id, created_at DESC);
CREATE INDEX idx_richieste_stato ON richieste(stato) WHERE stato IN ('pending','approvata_manager');
CREATE INDEX idx_richieste_tipo_data ON richieste(tipo, data_inizio);
```

### Estensione tabella `templates`

```sql
CREATE TYPE categoria_template AS ENUM ('lavoro','ferie','permesso','malattia');
ALTER TABLE templates ADD COLUMN categoria categoria_template NOT NULL DEFAULT 'lavoro';
```

L'admin crea (una sola volta) i template `FERIE`, `PERMESSO`, `MALATTIA` con la rispettiva categoria. Quando una richiesta è approvata, il sistema cerca il primo template attivo con la categoria corrispondente. Se non esiste → l'approvazione fallisce con messaggio chiaro.

### RLS

- **Dipendente**: SELECT/INSERT/UPDATE solo righe `dipendente_id = auth.uid()`; UPDATE limitato alla cancellazione (`stato = 'pending'` → `'annullata'`)
- **Manager/Admin**: SELECT tutte; UPDATE per transizioni di stato
- **Admin**: anche DELETE (cleanup futuri)

### Notifiche

Riusa la tabella `notifiche` esistente (creata il 2026-04-22). Nuovi tipi:
- `richiesta_creata` (a manager+admin)
- `richiesta_approvata_manager` (agli admin)
- `richiesta_approvata` (al dipendente)
- `richiesta_rifiutata` (al dipendente)
- `richiesta_cancellata` (a manager+admin)
- `malattia_comunicata` (a manager+admin)

## Validazioni

### Anticipo minimo (lead time)

Costanti centralizzate in `lib/richieste/config.ts`:

```ts
export const LEAD_TIMES_MS = {
  ferie:        7 * 24 * 60 * 60 * 1000,  // 7 giorni
  permesso:         24 * 60 * 60 * 1000,  // 24 ore
  cambio_turno: 2 * 24 * 60 * 60 * 1000,  // 48 ore
  malattia:                            0,
}
```

Validazione lato form (datepicker disabilita le date troppo a ridosso) + validazione ridondante lato API. Blocca con messaggio chiaro: "Le ferie vanno richieste con almeno 7 giorni di anticipo".

### Motivazioni

- **Note dipendente**: opzionali per tutti i tipi tranne `cambio_turno` (obbligatoria)
- **Motivazione decisione**: obbligatoria solo su rifiuto (min 5 caratteri)

### Conflitti calendario alla creazione automatica turni

Quando lo stato diventa `approvata` e il sistema deve creare i turni FERIE/PERMESSO/MALATTIA, controlla se nei giorni richiesti il dipendente ha già turni. Se sì, mostra all'admin (al momento della convalida) un dialogo:

```
⚠️ Mario Rossi ha già turni assegnati nei giorni:
   • 12/05 — Ingresso (08:00–16:00)
   • 14/05 — Reception (14:00–22:00)

  ○ Sovrascrivi i turni esistenti con FERIE
  ○ Approva e crea FERIE solo nei giorni liberi
    (lascio i conflitti a me da risolvere a mano)

      [ Annulla ]      [ Conferma ]
```

Niente sovrascrittura silenziosa. La scelta è esplicita.

## UX dipendente

### Nuova voce sidebar: "Richieste" con badge

Badge contatore mostra le richieste con aggiornamenti non letti (es. appena approvate/rifiutate). Si svuota entrando nella pagina (stesso pattern del badge bozze in programmazione, fix `usePathname`).

### Pagina `/dipendente/richieste`

- Header con pulsante `[+ Nuova richiesta ▼]` (dropdown: Ferie, Permesso, Malattia)
- Lista cronologica delle proprie richieste
- Ogni card mostra: tipo, date/ore, stato (badge colorato), motivazione se rifiutata
- Cancellabile (X) solo se `pending`

**Codice colore stati:**

| Stato | Visual |
|---|---|
| `pending` | 🟡 In attesa |
| `approvata_manager` | 🔵 Approvata da manager, in attesa convalida |
| `approvata` / `comunicata` | 🟢 Approvata / Ricevuta |
| `rifiutata` | 🔴 Rifiutata (motivazione visibile) |
| `annullata` | ⚪ Annullata |

### Form "Nuova richiesta" (modale)

- **Ferie**: data_inizio + data_fine + note opzionali
- **Permesso**: data + dropdown sub_tipo (Giornata / Mezza mattina / Mezza pomeriggio / Ore puntuali) → se "Ore" appaiono ora_inizio/ora_fine + note opzionali
- **Malattia**: data_inizio + data_fine + checkbox "Non so ancora quando rientro" (se attivo, data_fine è NULL e verrà chiusa da manager/admin) + note opzionali

### Cambio turno: accesso contestuale dal calendario

Niente voce nel form. Il dipendente clicca sul proprio turno in `/dipendente/turni` → si apre il modale dettaglio del turno con un nuovo pulsante **"Non posso fare questo turno"** → si apre form motivazione (obbligatoria) → invia. Crea una richiesta `cambio_turno` con `turno_id` del turno selezionato.

### Mobile-first

Card a tutta larghezza, datepicker iOS/Android nativo, dropdown nativo per i sub_tipi. I dipendenti useranno spesso il telefono.

## UX manager/admin

### Nuova voce sidebar: "Richieste" con badge

- **Manager**: badge = count `pending`
- **Admin**: badge = count `pending` + `approvata_manager`

Badge si svuota entrando nella pagina.

### Pagina `/admin/richieste` e `/manager/richieste`

Struttura identica, permessi diversi.

- Header con filtri: **Tipo**, **Stato**, **Dipendente**, **Mese**
- Sezione "Da decidere" (in cima, evidenziata)
- Sezione "Storico recente" (espandibile a "vedi tutto")
- Real-time: la lista si aggiorna in vivo via subscription Supabase su `richieste`

**Differenze manager vs admin:**
- Manager: pulsante `[Approva]` solo su `pending`
- Admin: `[Approva]` su `pending` (bypass manager) + `[Convalida]` su `approvata_manager`
- Entrambi: `[Rifiuta]` su qualsiasi stato non finale
- Admin ha tab/filtro extra "Da convalidare"

### Modali

- **Approva/Convalida** → conferma + conflict detection (vedi sopra)
- **Rifiuta** → textarea motivazione obbligatoria (min 5 caratteri)

### Chiusura malattia open-ended

Le richieste `comunicata` di tipo `malattia` con `data_fine = NULL` mostrano un pulsante extra **"Imposta data rientro"** → date-picker. Effetti:
1. Aggiorna `data_fine` nella richiesta
2. Tronca/aggiorna i turni MALATTIA fino a quel giorno
3. Notifica il dipendente in-app

## API

```
GET    /api/richieste                  list filtrata per ruolo
POST   /api/richieste                  crea (validazione anticipo)
GET    /api/richieste/[id]             dettaglio
PATCH  /api/richieste/[id]             azioni stato
                                       payload: { azione: 'cancella'|'approva'|'rifiuta'|'convalida',
                                                  motivazione?: string,
                                                  sovrascrivi_conflitti?: boolean }
GET    /api/richieste/pending-count    contatore badge sidebar
POST   /api/richieste/[id]/rientro     imposta data_fine per malattia open-ended
```

Tutte le transizioni di stato avvengono atomicamente dentro la PATCH (transazione DB con rollback se la creazione turni fallisce).

## Email (Resend)

**Decisione consolidata in TASK 6 EMAIL**: Resend, free tier 3.000/mese-100/giorno.

- `lib/email.ts` — client Resend
- 2 template HTML inline:
  - `richiesta_approvata.ts` — "La tua richiesta di {tipo} dal X al Y è stata approvata"
  - `richiesta_rifiutata.ts` — "La tua richiesta è stata rifiutata. Motivazione: {motivazione}"
- Trigger dentro le PATCH dopo transizione → `approvata` o `rifiutata`
- Non-bloccante: try/catch + log. Se Resend fallisce, la transizione è già committata, l'utente vede la notifica in-app, l'email è bonus
- Variabili d'ambiente: `RESEND_API_KEY`, `RESEND_FROM` (es. `noreply@dominio.it`)

Web push e SMS rimandati (coerente con la decisione del 2026-04-22 sulle notifiche).

## Fasi di implementazione

L'app resta funzionante e deployabile dopo ogni fase.

| # | Fase | Cosa | Dipendenze |
|---|---|---|---|
| 1 | **Foundation** | Migrazioni 007+008, types TypeScript, `lib/richieste` (config, helpers), API CRUD base, `lib/email.ts` (no trigger ancora) | nessuna |
| 2 | **Dipendente UX** | `/dipendente/richieste` (lista + form), pulsante "Non posso fare questo turno" da `/dipendente/turni`, badge sidebar dipendente | 1 |
| 3 | **Manager/Admin UX** | `/admin/richieste` e `/manager/richieste` (lista + modali approva/rifiuta), badge sidebar admin/manager con `usePathname` clear | 1 |
| 4 | **Auto-create turni** | Logica creazione FERIE/PERMESSO/MALATTIA su approvazione, gestione conflitti con dialogo a 2 opzioni | 1+3 |
| 5 | **Email Resend** | Trigger nelle PATCH per `approvata`/`rifiutata`, 2 template HTML | 3 |
| 6 | **Chiusura malattia** | API + UI per "imposta rientro", troncatura turni MALATTIA | 4 |

Stima: ~2-3 settimane a fasi di 2-3 ore.

## Decisioni esplicitamente fuori scope (non implementati)

- **Saldo ferie/permessi annuale** → rimandato a futuro modulo HR/paghe
- **Upload allegati (certificato medico)** → INPS gestisce; se in futuro serve, Supabase Storage è gratis nel free tier
- **Web push e SMS** → solo email + in-app per ora
- **Cambio turno P2P (scambio diretto tra dipendenti)** → manager riassegna a mano
- **Override del lead time** da parte di manager/admin → non gestito; per casi urgenti il dipendente parla a voce e il manager crea il turno FERIE manualmente (senza richiesta)
- **Categorizzazione permessi** (legge 104, ROL, ex-festività…) → un solo tipo `permesso` per ora; categorie verranno con il modulo paghe
- **Modifica richiesta dopo invio** → solo cancellazione (stato `pending`); per modificare si cancella e si rifà
