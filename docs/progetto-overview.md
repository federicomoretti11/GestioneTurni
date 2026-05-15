# Opero Hub — Documentazione di progetto

> Aggiornato il 2026-05-13. Branch corrente: `dev`.

---

## Cos'è

**Opero Hub** è un ERP SaaS multi-tenant per la gestione dei turni di lavoro rivolto ad aziende italiane. Ogni azienda cliente (tenant) ha un sottodominio dedicato (`nomeazienda.operohub.com`) con dati completamente isolati. Il super-admin gestisce i tenant dal proprio pannello; ogni azienda ha utenti, turni, posti di servizio e impostazioni indipendenti.

---

## Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 14 App Router (Server + Client Components) |
| Database + Auth | Supabase (PostgreSQL + RLS + Realtime) |
| Client DB | Supabase JS SDK (`@supabase/ssr`) |
| Styling | Tailwind CSS |
| Email | Resend |
| Storage | Supabase Storage (cedolini, loghi tenant) |
| Deploy | Vercel (wildcard DNS `*.operohub.com`) |
| Language | TypeScript |

---

## Architettura multi-tenant

### Flusso richiesta
```
nomeazienda.operohub.com/api/turni
  → Next.js Middleware (middleware.ts)
      → estrae slug dal sottodominio
      → lookup tenant_id da tabella `tenants`
      → imposta header X-Tenant-Id
  → API route
      → requireTenantId() legge l'header
      → tutte le query filtrano per tenant_id
```

### Isolamento dati
- Ogni tabella di business ha `tenant_id UUID NOT NULL FK → tenants.id`
- RLS policies filtrano sempre per `get_my_tenant_id()` (funzione Postgres)
- Il super-admin usa `createAdminClient()` (service_role) per accesso cross-tenant
- Sviluppo locale: `.env.local` con `NEXT_PUBLIC_DEV_TENANT_ID=<uuid>` bypassa il middleware

---

## Ruoli utente

| Ruolo | Scope |
|-------|-------|
| `super_admin` | Flag `is_super_admin` su profiles. Accede a `/super-admin/*`, gestisce tutti i tenant |
| `admin` | Admin dell'azienda. Gestisce turni, utenti, impostazioni del proprio tenant |
| `manager` | Gestisce turni e richieste del proprio reparto |
| `dipendente` | Vede i propri turni, invia richieste, timbra entrata/uscita |

---

## Moduli (feature flags per tenant)

Ogni tenant ha una riga in `impostazioni` con questi flag. Il super-admin li attiva per ogni tenant (vendita pacchetti).

| Flag | Default | Piano minimo |
|------|---------|-------------|
| `gps_checkin_abilitato` | true | Starter |
| `email_notifiche_abilitato` | false | — |
| `modulo_tasks_abilitato` | true | Professional |
| `modulo_documenti_abilitato` | true | Professional |
| `modulo_cedolini_abilitato` | false | Professional |
| `modulo_analytics_abilitato` | false | Professional |
| `modulo_paghe_abilitato` | false | Enterprise |
| `modulo_ai_copilot_abilitato` | false | Enterprise |
| `white_label_abilitato` | false | Enterprise |
| `modulo_contratti_abilitato` | false | Professional |
| `modulo_straordinari_abilitato` | false | Professional |
| `modulo_ferie_contatori_abilitato` | false | Professional |
| `modulo_staffing_abilitato` | false | Enterprise |

**Piani disponibili:** `starter`, `professional`, `enterprise`

Ogni modulo ha anche un array `modulo_X_ruoli` che controlla quali ruoli lo vedono (default: tutti e tre).

---

## Funzionalità — stato attuale

### Turni e calendario
- Calendari settimanali/mensili per admin e manager (vista standard + per posto)
- Griglia di programmazione drag-and-drop
- Turni in due stati: `bozza` → `confermato` (pubblicazione)
- Template turno con nome, orari, colore, categoria (`lavoro` | `ferie` | `permesso` | `malattia`)
- Copia settimana / copia da periodo
- Export CSV turni (dipendente, data, orari, ore effettive, ore diurne/notturne, festivo, posto)
- Realtime: aggiornamento live dei calendari via Supabase Realtime

### Timbrature (check-in/out)
- Il dipendente timbra entrata e uscita dalla propria schermata
- Validazione GPS opzionale con raggio configurabile per posto di servizio
- Admin/manager vedono i timbri effettivi nel modal del turno
- Badge visuale sulla griglia: ambra (in corso) / verde (completato)
- Correzione manuale timbri da parte dell'admin
- Sblocco check-in GPS: dipendente richiede, admin approva, token valido 30 minuti

### Indisponibilità
- Il dipendente può segnare giorni di indisponibilità nel calendario
- Visibili ad admin e manager come indicatori nella griglia
- Etichetta testuale nella cella del calendario

### Richieste dipendente
Sistema di richieste con catena di approvazione:

| Tipo | Flusso |
|------|--------|
| Ferie | dipendente → manager (approva) → admin (convalida) |
| Permesso | dipendente → manager (approva) → admin (convalida) |
| Malattia | dipendente → stato `comunicata` diretto (no approvazione) |
| Cambio turno | dipendente → manager (approva) → admin (convalida) |
| Sblocco check-in | dipendente → admin (approva) |

Regole:
- Admin può bypassare il manager
- Lead time: ferie 7gg, permesso 24h, cambio turno 48h, malattia 0
- Ferie/Permesso/Malattia approvati creano automaticamente turni con il template della categoria
- Cancellabile solo da stato `pending`

### Notifiche in-app
- Campanella in header con badge contatore realtime
- Tipi: assegnazione/modifica/eliminazione turno, pubblicazione settimana, check-in/out, stato richieste, cedolino disponibile, task assegnato/menzione
- Auto-cleanup notifiche lette > 10 giorni
- Email via Resend per eventi chiave

### Task management (modulo opzionale)
- Creazione task con assegnatari multipli, scadenza, priorità
- Commenti con menzioni (`@nome`)
- Visibilità per ruolo configurabile
- Notifica in-app all'assegnazione e alla menzione

### Cedolini (modulo opzionale)
- Admin carica PDF per dipendente + mese
- Dipendente scarica i propri cedolini
- Storage su Supabase con URL firmati

### Paghe / Consuntivi (modulo opzionale)
- Admin crea consuntivi mensili per dipendente (ore lavorate, straordinari, ecc.)
- Flusso: bozza → approvato
- Export CSV del consuntivo
- Storico consuntivi approvati con possibilità di riapertura

### Analytics (modulo opzionale)
- Viste aggregate: ore per dipendente, distribuzione turni, presenze
- Filtri per periodo e dipendente

### Documenti (modulo opzionale)
- Archivio documenti aziendali con categorie
- Admin carica, dipendenti/manager scaricano
- Accesso per ruolo configurabile

### Festivi
- Gestione festivi nazionali, patronali e custom
- Generazione automatica festivi nazionali italiani per anno

### Chat di supporto
- Ogni utente può aprire una conversazione con il super-admin
- Pagina `/supporto` con lista conversazioni + chat
- Super-admin ha inbox `/super-admin/chat` con tutte le conversazioni
- Badge realtime in header per messaggi non letti
- Notifica email al super-admin per ogni nuovo messaggio
- Audio notifica browser

### Audit log
- Tracciamento operazioni su turni e utenti (solo admin)

---

## Funzionalità pianificate (in sviluppo)

### Contratti e orario contrattuale (`modulo_contratti_abilitato`)
- Tabella `contratti_dipendenti`: tipo contratto, ore settimanali, ore giornaliere, data inizio
- Un contratto attivo per dipendente (upsert, no storico)
- Card editabile nella pagina admin utente
- Helper server-side `lib/contratti.ts` per uso da altri moduli
- Prerequisito per il calcolo automatico degli straordinari

### Straordinari automatici (`modulo_straordinari_abilitato`)
- Usa `ore_giornaliere` dal contratto come soglia invece delle ore pianificate del turno
- Modifica chirurgica a `app/api/admin/paghe/route.ts`
- Fallback al comportamento precedente se il dipendente non ha contratto

### Contatori ferie/permessi/ROL (`modulo_ferie_contatori_abilitato`)
- Tabella `contatori_ferie`: budget annuale ferie (giorni), permesso (ore), ROL (ore)
- Saldo residuo calcolato live dalle richieste approvate nell'anno
- Card editabile in admin utenti/[id], sola lettura in dipendente/profilo
- Supporto multi-anno con selector anno

### Fabbisogno staffing (`modulo_staffing_abilitato`)
- Definizione del numero minimo di dipendenti per fascia oraria e posto di servizio
- Evidenziazione visuale nel calendario delle fasce sotto soglia
- Strumento di pianificazione per admin e manager

---

## Struttura database (tabelle principali)

```
tenants                 — aziende clienti
profiles                — utenti (estende auth.users)
reparti                 — reparti aziendali
turni                   — turni assegnati con timbrature e GPS
turni_template          — modelli turno
posti_di_servizio       — luoghi di lavoro con geo opzionale
richieste               — ferie/permessi/malattia/cambio turno
notifiche               — notifiche in-app
impostazioni            — feature flags per tenant
tasks                   — task management
task_commenti           — commenti sui task
cedolini                — cedolini paga (riferimento a Storage)
documenti_aziendali     — archivio documenti
categorie_documenti     — categorie documenti
consuntivi_paghe        — consuntivi mensili
festivi                 — giorni festivi
audit_log               — log operazioni
chat_conversazioni      — conversazioni di supporto
chat_messaggi           — messaggi di supporto
contratti_dipendenti    — contratti attivi per dipendente (pianificato)
contatori_ferie         — budget ferie/permessi/ROL per anno (pianificato)
```

---

## Struttura pagine

### Admin (`/admin/*`)
```
/admin/calendario                    Calendario turni (+ /calendario-posti)
/admin/calendario-programmazione     Griglia programmazione (+ -posti)
/admin/template                      Modelli turno
/admin/task                          Task management
/admin/richieste                     Gestione richieste dipendenti
/admin/analytics                     Analytics (modulo opzionale)
/admin/documenti                     Archivio documenti (modulo opzionale)
/admin/cedolini                      Cedolini (modulo opzionale)
/admin/paghe                         Consuntivi paghe (modulo opzionale)
/admin/utenti                        Lista utenti + /[id] modifica
/admin/posti                         Posti di servizio
/admin/festivi                       Gestione festivi
/admin/export                        Export CSV turni
/admin/audit                         Audit log
/admin/impostazioni                  Impostazioni tenant
/admin/profilo                       Profilo utente
```

### Manager (`/manager/*`)
```
/manager/calendario                  Calendario turni
/manager/calendario-programmazione   Griglia programmazione
/manager/task                        Task (modulo opzionale)
/manager/richieste                   Richieste dipendenti
/manager/analytics                   Analytics (modulo opzionale)
/manager/documenti                   Documenti (modulo opzionale)
/manager/cedolini                    Cedolini (modulo opzionale)
/manager/utenti                      Utenti + /[id] modifica
/manager/posti                       Posti di servizio
/manager/template                    Modelli turno
/manager/impostazioni                Impostazioni
/manager/profilo                     Profilo utente
```

### Dipendente (`/dipendente/*`)
```
/dipendente/turni                    I miei turni + check-in/out
/dipendente/richieste                Le mie richieste
/dipendente/task                     Task assegnati (modulo opzionale)
/dipendente/cedolini                 I miei cedolini (modulo opzionale)
/dipendente/profilo                  Profilo + cambio password + saldo ferie (modulo opzionale)
```

### Super-admin (`/super-admin/*`)
```
/super-admin/tenants                 Lista tenant
/super-admin/tenants/[id]            Dettaglio tenant: piano, moduli, utenti, branding
/super-admin/chat                    Inbox chat di supporto
```

### Comuni
```
/home                                Dashboard home (card riassuntive per ruolo)
/supporto                            Chat di supporto per utenti non-super-admin
/login                               Autenticazione
/reset-password                      Reset password
```

---

## API routes principali

```
GET/POST        /api/turni                       Turni
GET/PUT/DELETE  /api/turni/[id]                  Turno singolo
POST            /api/turni/[id]/check-in         Timbratura entrata
POST            /api/turni/[id]/check-out        Timbratura uscita
GET/PUT         /api/turni/[id]/timbri           Correzione timbri (admin)
POST            /api/turni/copia-settimana        Copia turni settimanali
POST            /api/turni/conferma-periodo       Pubblica turni bozza

GET/POST        /api/utenti                      Utenti del tenant
GET/PUT/DELETE  /api/utenti/[id]                 Utente singolo

GET/POST        /api/richieste                   Richieste
GET/PUT         /api/richieste/[id]              Richiesta singola (approva/rifiuta)

GET/POST        /api/tasks                       Task
GET/PUT/DELETE  /api/tasks/[id]                  Task singolo
POST            /api/tasks/[id]/commenti         Commenti task

GET/POST        /api/admin/cedolini              Cedolini (caricamento admin)
GET             /api/dipendente/cedolini         Cedolini (vista dipendente)

GET/POST        /api/admin/paghe                 Consuntivi
GET             /api/admin/paghe/storico         Storico consuntivi approvati

GET             /api/admin/analytics             Dati analytics

GET/PUT         /api/admin/contratti/[id]        Contratto dipendente (upsert)
GET/PUT         /api/admin/contatori/[id]        Budget ferie/permessi dipendente

GET             /api/impostazioni                Impostazioni tenant

GET/POST        /api/chat/conversazione          Conversazioni supporto
GET/POST        /api/chat/messaggi               Messaggi supporto

GET             /api/super-admin/tenants         Lista tenant (super-admin)
POST            /api/super-admin/tenants         Crea tenant
GET/PATCH       /api/super-admin/tenants/[id]    Dettaglio + modifica tenant
GET             /api/super-admin/chat/conversazioni  Inbox super-admin
```

---

## File e helper chiave

| File | Scopo |
|------|-------|
| `middleware.ts` | Subdomain → tenant lookup → header X-Tenant-Id |
| `lib/tenant.ts` | `requireTenantId()` — legge tenant dall'header |
| `lib/impostazioni.ts` | `getImpostazioni()`, `moduliPerRuolo()` |
| `lib/supabase/server.ts` | Client Supabase server-side (RLS attivo) |
| `lib/supabase/admin.ts` | Client service_role (bypass RLS) |
| `lib/supabase/client.ts` | Client browser-side |
| `lib/notifiche.ts` | Helper per creare notifiche in-app |
| `lib/email.ts` | Helper Resend per invio email |
| `lib/contratti.ts` | Helper `getContrattoDipendente()` per calcolo straordinari |
| `lib/types.ts` | Tipi TypeScript condivisi |
| `components/layout/Sidebar*.tsx` | Sidebar per ruolo con sezioni e badge |
| `components/layout/Header.tsx` | Header con campanella notifiche e chat badge |

---

## Modello dati — tipi principali

### Profile
```typescript
{ id, nome, cognome, ruolo: 'admin'|'manager'|'dipendente',
  attivo, includi_in_turni, tenant_id, is_super_admin }
```

### Turno
```typescript
{ id, dipendente_id, template_id, data, ora_inizio, ora_fine,
  posto_id, stato: 'bozza'|'confermato', note,
  ora_ingresso_effettiva, ora_uscita_effettiva,
  lat_checkin, lng_checkin, geo_anomalia,
  sblocco_checkin_valido_fino, sblocco_usato_at,
  tenant_id }
```

### Richiesta
```typescript
{ id, dipendente_id, tipo: 'ferie'|'permesso'|'malattia'|'cambio_turno'|'sblocco_checkin',
  stato: 'pending'|'approvata_manager'|'approvata'|'rifiutata'|'annullata'|'comunicata',
  data_inizio, data_fine, permesso_tipo, ora_inizio, ora_fine,
  manager_id, admin_id, tenant_id }
```

### ContrattoDipendente
```typescript
{ id, tenant_id, dipendente_id,
  tipo: 'full_time'|'part_time'|'turni_fissi'|'turni_rotanti',
  ore_settimanali, ore_giornaliere, data_inizio }
```

### ContatoreFerie
```typescript
{ id, tenant_id, dipendente_id, anno,
  ferie_giorni, permesso_ore, rol_ore }
// Esteso: + ferie_usate, permesso_usate, rol_usate (calcolati live)
```

### ImpostazioniTenant
```typescript
{ gps_checkin_abilitato, email_notifiche_abilitato,
  modulo_tasks_abilitato, modulo_documenti_abilitato,
  modulo_cedolini_abilitato, modulo_analytics_abilitato,
  modulo_paghe_abilitato, modulo_ai_copilot_abilitato,
  white_label_abilitato, modulo_contratti_abilitato,
  modulo_straordinari_abilitato, modulo_ferie_contatori_abilitato,
  modulo_staffing_abilitato,
  modulo_tasks_ruoli, modulo_cedolini_ruoli, ... }
```

---

## Realtime (Supabase)

Le seguenti tabelle hanno `REPLICA IDENTITY FULL` e sono in pubblicazione realtime:
- `turni` — aggiornamento live calendari
- `notifiche` — campanella in-app
- `chat_messaggi` — badge chat e inbox
- `chat_conversazioni` — aggiornamento lista conversazioni

---

## Convenzioni di sviluppo

- **Commit**: sempre su branch `dev`, mai su `master` direttamente
- **Push su master**: solo su autorizzazione esplicita (Locale → dev → master)
- **Feature flags**: ogni modulo è gated da flag in `impostazioni`; la UI non renderizza se il flag è `false`
- **Admin client**: usato solo server-side per operazioni che richiedono bypass RLS
- **API security**: ogni route verifica utente autenticato + ruolo + tenant
- **Nessun mock DB nei test**: i test devono usare il DB reale

---

## Variabili d'ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM=noreply@operohub.com
NEXT_PUBLIC_DEV_TENANT_ID=          # solo sviluppo locale
```
