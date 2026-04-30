# GestioneTurni — Documento Funzionale

> Versione: 2026-04-30 · Stack: Next.js 14 App Router · TypeScript · Supabase (PostgreSQL + Auth + Realtime) · Tailwind CSS · Resend (email)

---

## 1. Panoramica

GestioneTurni è un'applicazione web per la pianificazione e gestione dei turni lavorativi. Permette agli amministratori e ai manager di costruire calendari turni, pubblicarli ai dipendenti, tracciare le timbrature (check-in / check-out) e gestire le richieste di assenza o cambio turno.

L'applicazione è **multi-ruolo** con tre livelli di accesso: **admin**, **manager**, **dipendente**. Ogni ruolo ha la propria area dell'app con funzionalità dedicate.

---

## 2. Ruoli e accessi

| Ruolo | Cosa può fare |
|-------|--------------|
| **Admin** | Accesso completo: gestisce utenti, posti, template, festivi, turni di tutti, richieste, impostazioni globali, audit log, export |
| **Manager** | Gestisce turni e richieste dei propri dipendenti; può approvare in primo livello ma non convalidare definitivamente |
| **Dipendente** | Visualizza i propri turni, effettua check-in/check-out, invia richieste di assenza o cambio turno |

L'autenticazione è gestita tramite **Supabase Auth** (email + password). Al login, l'app legge il profilo dalla tabella `profiles` e reindirizza l'utente all'area corretta (`/admin`, `/manager`, `/dipendente`).

---

## 3. Turni

### 3.1 Struttura di un turno

Ogni turno appartiene a un dipendente e contiene:

- **Data** (YYYY-MM-DD)
- **Ora inizio / Ora fine** (HH:MM:SS) — se uguali il turno vale come riposo (0 ore)
- **Template** (opzionale) — tipo turno con nome, colore e categoria
- **Posto di servizio** (opzionale) — sede fisica del turno
- **Note** libere
- **Stato**: `bozza` o `confermato`
- **Timbrature effettive**: `ora_ingresso_effettiva`, `ora_uscita_effettiva` (registrate al check-in/out)
- **Dati GPS**: `lat_checkin`, `lng_checkin`, `geo_anomalia`
- **Sblocco**: `sblocco_checkin_valido_fino`, `sblocco_usato_at`

### 3.2 Stati del turno

```
bozza ──────────────────────── confermato
  │                                │
  │  (pubblicazione)               │  (check-in dipendente)
  │                                ▼
  │                         ora_ingresso_effettiva valorizzata
  │                                │
  │                                │  (check-out dipendente)
  │                                ▼
  │                         ora_uscita_effettiva valorizzata
  │
  └── (eliminazione) ──────────── rimosso dal DB
```

I turni in **bozza** sono visibili solo ad admin e manager; non sono visibili al dipendente e non possono essere timbratura. I turni **confermati** sono visibili al dipendente e possono essere timbrati.

### 3.3 Creazione e modifica

Admin e manager creano turni dal calendario, scegliendo:
1. Il dipendente (click sulla cella calendario)
2. Il template (imposta automaticamente ora inizio/fine e colore)
3. Il posto di servizio
4. Eventuali orari personalizzati e note

### 3.4 Copia settimana

Dal calendario settimana è disponibile il pulsante **"Copia settimana →"**: copia tutti i turni della settimana corrente nella settimana successiva, saltando quelli già esistenti. Utile per pianificazioni ricorrenti.

### 3.5 Turni passati (sola lettura)

Quando un turno è nel passato (data < oggi) oppure è oggi ma l'orario di inizio è già passato, viene mostrato in **vista dettaglio** (sola lettura) anziché nel form di modifica. La vista mostra: dipendente, posto, orario programmato, tipo turno, stato timbratura, timbrature effettive con eventuali ore diurne/notturne e la data di utilizzo sblocco.

---

## 4. Template turni

I template definiscono i **tipi di turno** riutilizzabili. Ogni template ha:

- **Nome** (es. "Mattina", "Pomeriggio", "Notte")
- **Ora inizio / Ora fine**
- **Colore** esadecimale (mostrato come pallino nel calendario)
- **Categoria**: `lavoro` | `ferie` | `permesso` | `malattia`

I turni creati da un template ereditano orario e colore; l'associazione rimane visibile nel dettaglio turno.

---

## 5. Posti di servizio

I posti di servizio rappresentano le sedi fisiche dove il dipendente lavora. Ogni posto ha:

- **Nome** e descrizione
- **Stato** (attivo/disattivo)
- **Coordinate GPS** (latitudine, longitudine, raggio in metri) — opzionali
- **Flag `geo_check_abilitato`** — se attivo, il check-in verifica la posizione del dipendente

---

## 6. Check-in / Check-out

### 6.1 Flusso standard

Il dipendente vede il **BannerTurnoOggi** nella propria area se ha un turno confermato in corso oggi. Il banner mostra:

- Orario programmato del turno
- Posto di servizio (se assegnato)
- Pulsante **"Inizia turno"** (check-in)
- Pulsante **"Termina turno"** (check-out, disponibile dopo il check-in)

### 6.2 Verifica GPS

Se il posto ha `geo_check_abilitato = true` **e** il toggle GPS globale è attivo, il banner:

1. Richiede la posizione tramite `navigator.geolocation`
2. Calcola la distanza con la formula di Haversine
3. **Se il dipendente è nel raggio**: abilita il pulsante "Inizia turno"
4. **Se è fuori raggio**: mostra la distanza e disabilita il pulsante; appare il link "Richiedi sblocco"
5. **Se il GPS è negato o non disponibile**: mostra il pulsante "Richiedi sblocco"

### 6.3 Anomalia geo

Indipendentemente dal blocco lato client, il server registra `geo_anomalia = true` se al momento del check-in la distanza supera 3× il raggio del posto. L'anomalia è **soft** (non blocca il check-in) e visibile nell'audit log.

### 6.4 Toggle GPS globale

L'admin può disabilitare il controllo GPS su tutta l'app dalla pagina **Posti di servizio** (toggle in cima alla pagina). Quando disabilitato, il check-in GPS viene bypassato per tutti i dipendenti indipendentemente dalle impostazioni per-posto.

---

## 7. Sblocco check-in

Quando il dipendente non può fare check-in GPS (fuori raggio, GPS negato), può richiedere uno **sblocco manuale** all'admin.

### 7.1 Flusso

```
Dipendente                    Admin
    │                           │
    ├─ Richiesta sblocco ───────►│
    │  (tipo: sblocco_checkin)   │
    │  (nota motivazione)        │
    │                           ├─ Approva richiesta
    │                           │  scrive token 30 min sul turno
    │◄─ Notifica in-app ─────────┤
    │◄─ Email "hai 30 min" ──────┤
    │                           │
    ├─ Check-in entro 30 min    │
    │  (token consumato)         │
    │  sblocco_usato_at = now    │
```

Il token (`sblocco_checkin_valido_fino`) scade dopo 30 minuti. Una volta usato, viene azzerato e viene registrato `sblocco_usato_at` con il timestamp di utilizzo, visibile nel dettaglio del turno.

---

## 8. Richieste

### 8.1 Tipi di richiesta

| Tipo | Lead time | Descrizione |
|------|-----------|-------------|
| `ferie` | 7 giorni prima | Richiesta di giorni di ferie |
| `permesso` | 24 ore prima | Permesso giornaliero, mezza mattina, mezza pomeriggio o ore specifiche |
| `malattia` | — | Comunicazione malattia (nessun preavviso richiesto) |
| `cambio_turno` | 48 ore prima | Richiesta di scambio turno con altro dipendente |
| `sblocco_checkin` | — | Sblocco manuale GPS (vedi §7) |

Per `permesso` sono disponibili quattro varianti: `giornata`, `mezza_mattina`, `mezza_pomeriggio`, `ore` (con ora inizio/fine).

### 8.2 Stati e transizioni

```
                   ┌──────────────────────────────────┐
                   │             pending               │
                   └──┬──────────────┬────────────────┘
                      │              │
              (manager/admin)  (dipendente)
              approva          cancella
                      │              │
                      ▼              ▼
             approvata_manager    annullata
                      │
                  (admin)
                  convalida
                      │
                      ▼
                  approvata ──────── rifiutata
                                  (manager/admin)
```

- **malattia**: il dipendente inserisce direttamente in stato `comunicata` (bypass del flusso approvativo). Manager e admin possono rifiutarla o il dipendente può annullarla.
- **sblocco_checkin**: admin approva direttamente in `approvata` (genera il token 30 min).

### 8.3 Approvazione a due livelli

Per ferie, permessi, cambio turno:
- Il **manager** approva in primo livello → stato `approvata_manager`
- L'**admin** convalida → stato `approvata` + creazione automatica turni nel calendario

Se l'admin riceve una richiesta direttamente in `pending`, può approvare in un solo passaggio.

### 8.4 Conflitti

Prima dell'approvazione definitiva, il sistema verifica se il dipendente ha già turni nelle stesse date. In caso di conflitto, viene mostrato un avviso; l'admin può scegliere di sovrascrivere o annullare.

### 8.5 Creazione automatica turni

Quando una richiesta di ferie/permesso/malattia viene approvata definitivamente, il sistema crea automaticamente turni nel calendario con il template corrispondente alla categoria (`ferie`, `permesso`, `malattia`).

---

## 9. Calendario

### 9.1 Viste disponibili

- **Settimana**: griglia dipendenti × giorni (7 colonne), mostra tutti i turni della settimana
- **Mese**: griglia espansa con tutti i giorni del mese

### 9.2 Desktop vs Mobile

Su desktop viene mostrata la **GrigliaCalendario** (tabella compatta). Su mobile viene mostrata la **GrigliaCalendarioMobile** (lista verticale per giorno selezionato, con navigazione a scorrimento).

### 9.3 Filtri

Admin e manager possono filtrare il calendario per:
- **Dipendente** specifico
- **Posto di servizio** (filtra sia i turni che la lista dipendenti)

### 9.4 Real-time

Il calendario si aggiorna automaticamente tramite canali Supabase Realtime (PostgreSQL changes su tabella `turni`). Qualsiasi modifica da un altro utente viene riflessa senza refresh manuale.

### 9.5 Calendario per posto

È disponibile anche una vista **Calendario Posti** (per admin e manager): mostra i turni raggruppati per posto di servizio anziché per dipendente.

---

## 10. Programmazione turni

La sezione **Programmazione** è separata dal Calendario principale e serve per costruire turni in stato **bozza** prima di pubblicarli.

### 10.1 Flusso di programmazione

1. Admin/manager costruisce i turni (stato `bozza`) nel calendario programmazione
2. Verifica la pianificazione (i turni bozza non sono visibili ai dipendenti)
3. **Conferma periodo**: tutti i turni bozza del periodo diventano `confermati` e vengono notificati ai dipendenti
4. In alternativa: **Copia da periodo** precedente + **Svuota bozza** per ripartire

### 10.2 Contatore bozze

Nell'header è presente un badge con il numero di turni in stato bozza, per ricordare ad admin/manager che ci sono turni non ancora pubblicati.

---

## 11. Maggiorazioni

Per ogni turno il sistema calcola automaticamente la ripartizione in **ore diurne** e **ore notturne** (fascia notturna: 22:00–06:00). Le domeniche non generano maggiorazione (scelta progettuale). Se il turno cade in un **giorno festivo**, viene evidenziato nel dettaglio.

Il calcolo è visibile nel dettaglio turno (sola lettura) e nell'export dati.

---

## 12. Festivi

I giorni festivi sono gestiti nella sezione dedicata (admin). Sono divisi in tre tipi:

| Tipo | Descrizione |
|------|-------------|
| `nazionale` | Festività nazionali italiane (es. Natale, Ferragosto) |
| `patronale` | Festività locali del patrono |
| `custom` | Giorni personalizzati dall'azienda |

È disponibile il pulsante **"Genera anno"** che popola automaticamente tutti i festivi nazionali italiani per l'anno selezionato.

---

## 13. Notifiche in-app

Le notifiche vengono create dal sistema in risposta agli eventi principali e sono visibili tramite il campanellino nell'header.

| Evento | Destinatario |
|--------|-------------|
| Turno assegnato/modificato/eliminato | Dipendente interessato |
| Settimana pubblicata | Tutti i dipendenti coinvolti |
| Check-in / Check-out | Admin e manager |
| Richiesta creata | Admin e manager |
| Richiesta approvata (manager) | Admin |
| Richiesta approvata definitivamente | Dipendente |
| Richiesta rifiutata | Dipendente |
| Richiesta cancellata | Admin e manager |
| Malattia comunicata | Admin e manager |
| Sblocco check-in approvato | Dipendente |

Le notifiche non lette mostrano un badge numerico sul campanellino. È possibile segnarle tutte come lette o pulire le più vecchie.

---

## 14. Notifiche email (Resend)

In aggiunta alle notifiche in-app, il sistema invia **email transazionali** tramite Resend per gli eventi più importanti:

| Evento | Email inviata a |
|--------|----------------|
| Richiesta approvata definitivamente | Dipendente |
| Richiesta rifiutata (con motivazione) | Dipendente |
| Sblocco check-in approvato | Dipendente ("hai 30 minuti") |

Le email sono **non bloccanti**: eventuali errori di consegna vengono loggati ma non interrompono il flusso principale.

Le variabili d'ambiente necessarie sono `RESEND_API_KEY` e `RESEND_FROM`.

---

## 15. Export

La pagina Export (disponibile per admin e manager) permette di scaricare i dati turni in formato **CSV** per un periodo selezionato. Il file include: dipendente, data, orario programmato, orario effettivo, ore totali, ore diurne, ore notturne, festivo, posto, note.

---

## 16. Audit log

Ogni azione significativa viene registrata nella tabella `audit_log` (solo admin può visualizzarla):

- **Turni**: creazione, modifica, eliminazione
- **Richieste**: ogni transizione di stato (approvata_manager, approvata, rifiutata, annullata)

Ogni voce contiene: tabella, ID record, azione, utente responsabile, timestamp e dettagli (tipo, stato precedente, motivazione).

L'admin può filtrare per tabella e testare il flusso email direttamente dalla pagina audit.

---

## 17. Impostazioni globali

La tabella `impostazioni` è un singleton (una sola riga). Attualmente gestisce:

| Impostazione | Default | Descrizione |
|-------------|---------|-------------|
| `gps_checkin_abilitato` | `true` | Toggle globale GPS check-in |

Solo l'admin può modificare le impostazioni.

---

## 18. Architettura dati (tabelle principali)

| Tabella | Descrizione |
|---------|-------------|
| `profiles` | Dati anagrafici utenti (nome, cognome, ruolo, attivo) |
| `turni` | Turni lavorativi con timbrature e dati GPS |
| `turni_template` | Template riutilizzabili per i turni |
| `posti_di_servizio` | Sedi fisiche con coordinate GPS opzionali |
| `richieste` | Richieste di assenza/cambio con stato e approvazioni |
| `notifiche` | Notifiche in-app per tutti i ruoli |
| `festivi` | Giorni festivi nazionali, patronali e custom |
| `impostazioni` | Singleton configurazione globale |
| `audit_log` | Log immutabile delle azioni amministrative |

Tutte le tabelle hanno **Row Level Security (RLS)** abilitata su Supabase. Le query lato client usano il client autenticato (rispetta RLS); le operazioni privilegiate (creazione turni da richiesta, sblocco, notifiche) usano il client admin con service role key, che bypassa RLS.

---

## 19. Sicurezza e autenticazione

- Autenticazione: **Supabase Auth** (email + password, con reset password via email)
- Ogni API route verifica l'utente autenticato prima di procedere
- Le route admin verificano il ruolo in `profiles`
- L'endpoint `/api/turni` (GET) filtra automaticamente per `dipendente_id` se il chiamante è un dipendente
- Il client admin (`SUPABASE_SERVICE_ROLE_KEY`) viene usato esclusivamente lato server per operazioni che richiedono bypass RLS

---

## 20. Navigazione per ruolo

### Admin
`Dashboard` · `Calendario` · `Programmazione` · `Posti` · `Utenti` · `Template` · `Richieste` · `Festivi` · `Export` · `Audit log`

### Manager
`Calendario` · `Programmazione` · `Template` · `Richieste` · `Export`

### Dipendente
`I miei turni` · `Le mie richieste` · `Profilo`
