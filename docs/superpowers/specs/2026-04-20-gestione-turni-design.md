# Gestione Turni — Design Document

**Data:** 2026-04-20
**Stato:** Approvato

---

## 1. Obiettivo

Sviluppare un'applicazione web responsive che permetta a un'azienda di medie dimensioni (20–100 dipendenti) di gestire i turni lavorativi. Il sistema prevede tre ruoli distinti: Admin, Manager e Dipendente.

---

## 2. Ruoli e permessi

| Ruolo | Descrizione |
|---|---|
| **Admin** | Gestisce utenti, reparti e ha visibilità completa su tutti i turni |
| **Manager** | Crea e modifica i turni del proprio reparto, gestisce i template, esporta i dati |
| **Dipendente** | Visualizza solo i propri turni assegnati |

La creazione degli account utente avviene esclusivamente tramite il pannello Admin (nessuna registrazione pubblica).

---

## 3. Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Frontend | React + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Supabase |
| Autenticazione | Supabase Auth |
| Autorizzazione DB | Supabase Row Level Security (RLS) |
| Export PDF | jsPDF (lato client) |
| Export Excel/CSV | xlsx (lato client) |
| Deploy | VPS o Railway/Render (singolo processo) |

---

## 4. Struttura del progetto

```
/app
  /api              → API Routes REST
  /(auth)           → pagine login
  /(admin)          → area admin (middleware protetto)
  /(manager)        → area manager (middleware protetto)
  /(dipendente)     → area dipendente (middleware protetto)
/components         → componenti React riutilizzabili
/lib                → utility, helpers, client Supabase
/docs               → documentazione di progetto
```

---

## 5. Modello dati

### `profiles`
Estende `auth.users` di Supabase con i dati applicativi.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | FK → auth.users |
| nome | text | |
| cognome | text | |
| ruolo | enum | `admin` / `manager` / `dipendente` |
| reparto_id | uuid | FK → reparti (nullable) |
| created_at | timestamptz | |

### `reparti`
Raggruppa i dipendenti per area aziendale.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| nome | text | es. "Cucina", "Cassa" |
| manager_id | uuid | FK → profiles |
| created_at | timestamptz | |

### `turni_template`
Template riutilizzabili per velocizzare la pianificazione.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| nome | text | es. "Mattina", "Pomeriggio", "Notte" |
| ora_inizio | time | |
| ora_fine | time | |
| colore | text | hex color per il calendario |
| created_at | timestamptz | |

### `turni`
Assegnazioni effettive di turno a un dipendente.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| dipendente_id | uuid | FK → profiles |
| template_id | uuid | FK → turni_template (nullable se personalizzato) |
| data | date | |
| ora_inizio | time | override del template se personalizzato |
| ora_fine | time | override del template se personalizzato |
| note | text | nullable |
| creato_da | uuid | FK → profiles (manager che ha creato il turno) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## 6. Autenticazione e autorizzazione

### Flusso login
1. Unica pagina `/login` per tutti i ruoli
2. Email + password → Supabase Auth verifica le credenziali
3. JWT restituito con il ruolo dell'utente nel payload
4. Middleware Next.js legge il JWT, determina il ruolo e reindirizza alla dashboard corretta

### Protezione route (middleware)
- `/admin/*` → solo `admin`
- `/manager/*` → solo `manager`
- `/dipendente/*` → solo `dipendente`
- Accesso non autorizzato → redirect a `/login` o pagina 403

### Row Level Security (Supabase RLS)
- `dipendente`: SELECT sui propri turni (`dipendente_id = auth.uid()`)
- `manager`: SELECT/INSERT/UPDATE/DELETE sui turni del proprio reparto
- `admin`: accesso completo a tutte le tabelle

---

## 7. Schermate per ruolo

### Admin
- **Dashboard riepilogo:** overview turni aziendali, statistiche ore per reparto
- **Gestione utenti:** crea, modifica, disattiva utenti; assegna ruolo e reparto
- **Gestione reparti:** crea e modifica reparti; assegna manager

### Manager
- **Calendario turni** (vista principale): griglia Dipendenti × Giorni con switcher settimanale/mensile
  - Clic su una cella → modale per aggiungere/modificare turno
  - Badge colorati per tipo di turno (dal template)
  - Celle vuote cliccabili per aggiunta rapida
- **Template turni:** crea, modifica ed elimina template (nome, orario, colore)
- **Export:** selezione intervallo date → download PDF o Excel/CSV

### Dipendente
- **I miei turni:** calendario personale (settimanale/mensile), sola lettura
- **Profilo:** visualizza dati personali, cambio password

---

## 8. Calendario turni (layout)

**Layout scelto: Griglia Dipendenti × Giorni**

- Righe: dipendenti del reparto
- Colonne: giorni della settimana (o del mese)
- Ogni cella mostra un badge colorato con nome turno e orario
- Le celle vuote mostrano un `+` al hover per aggiunta rapida
- Switcher in alto: `Settimanale` / `Mensile`
- Filtro per reparto (per admin e manager con più reparti)

---

## 9. Export

Generazione **lato client** (nessuna logica server necessaria).

| Formato | Libreria | Contenuto |
|---|---|---|
| PDF | jsPDF | Griglia turni formattata, intestazione con periodo e reparto |
| Excel | xlsx | Una riga per turno: dipendente, data, ora inizio, ora fine, note |
| CSV | xlsx | Stesso formato Excel ma in testo separato da virgole |

Il manager seleziona l'intervallo di date e clicca il formato desiderato → download immediato nel browser.

---

## 10. Testing

| Livello | Strumento | Scope |
|---|---|---|
| Unit | Vitest | Funzioni utility: calcolo ore, validazione orari, formattazione date |
| Integration | Supertest | API Routes: CRUD turni, autenticazione, autorizzazione |
| E2E | Playwright | Flussi critici: login, creazione turno, visualizzazione, export |

---

## 11. Responsive / Mobile

L'applicazione è responsive (stessa web app, nessuna app nativa).

- **Desktop:** griglia turni completa, sidebar navigazione
- **Mobile:** griglia semplificata (scroll orizzontale), navigazione bottom tab bar
- Breakpoint principali: `sm` (640px), `md` (768px), `lg` (1024px) via Tailwind

---

## 12. Fuori scope

Le seguenti funzionalità sono esplicitamente escluse da questa versione:

- Notifiche email o in-app
- Richieste ferie/permessi da parte dei dipendenti
- Scambi di turno tra colleghi
- App mobile nativa
- Integrazione con sistemi HR esterni
- Multi-tenant (più aziende sullo stesso sistema)
