# Archivio Documenti — Design Spec

**Data:** 2026-05-05
**Scope:** Admin-only per tenant. Niente push, sviluppo locale.

---

## Obiettivo

Aggiungere un modulo di archiviazione documenti aziendali all'area admin. L'admin può organizzare i documenti in categorie, caricarli, visualizzarli in anteprima e scaricarli. I dati sono isolati per tenant tramite RLS.

---

## Architettura

### Storage

- **Supabase Storage**, bucket `documenti` (privato, accesso solo tramite signed URL)
- Path dei file: `{tenant_id}/{documento_id}/{filename_originale}`
- Signed URL con scadenza 1 ora per preview e download

### Database

#### Tabella `categorie_documenti`

```sql
CREATE TABLE categorie_documenti (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  ordine     INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabella `documenti`

```sql
CREATE TABLE documenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  categoria_id     UUID NOT NULL REFERENCES categorie_documenti(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  storage_path     TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  dimensione_bytes BIGINT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL
);
```

### RLS

Entrambe le tabelle: solo il ruolo `admin` del proprio tenant può leggere e scrivere.

```sql
-- categorie_documenti
CREATE POLICY "admin_categorie_documenti" ON categorie_documenti FOR ALL
  USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

-- documenti
CREATE POLICY "admin_documenti" ON documenti FOR ALL
  USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));
```

Storage bucket policy: lettura consentita solo a utenti autenticati il cui `tenant_id` corrisponde al prefisso del path. In pratica il bucket è privato e l'accesso avviene esclusivamente tramite signed URL generati server-side.

---

## API Routes

### Categorie

| Method | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/admin/categorie-documenti` | Lista categorie del tenant, ordinate per `ordine` |
| POST | `/api/admin/categorie-documenti` | Crea nuova categoria (`{ nome }`) |
| PATCH | `/api/admin/categorie-documenti/[id]` | Rinomina o aggiorna ordine |
| DELETE | `/api/admin/categorie-documenti/[id]` | Elimina categoria (solo se vuota) |

### Documenti

| Method | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/admin/documenti?categoria_id=` | Lista documenti di una categoria |
| POST | `/api/admin/documenti` | Upload file (multipart/form-data: file + categoria_id) |
| DELETE | `/api/admin/documenti/[id]` | Elimina record DB + file da Storage |
| GET | `/api/admin/documenti/[id]/url` | Restituisce signed URL (preview + download, scadenza 1h) |

---

## UI — `/admin/documenti`

### Layout

Pagina a due colonne:

```
┌─────────────────┬──────────────────────────────────────────┐
│  CATEGORIE      │  DOCUMENTI                               │
│                 │                                          │
│  > Contratti ●  │  [+ Carica documento]                    │
│    Circolari    │                                          │
│    Procedure    │  📄 Contratto_Mario.pdf   120 KB  03/05  │
│                 │     [Anteprima] [Scarica] [Elimina]      │
│  [+ Nuova]      │                                          │
│                 │  📊 Report_Q1.xlsx        45 KB   01/05  │
│                 │     [Anteprima] [Scarica] [Elimina]      │
└─────────────────┴──────────────────────────────────────────┘
```

### Comportamento

- **Categoria selezionata** evidenziata nella sidebar; al click carica i documenti via API
- **Carica documento**: file picker nativo (`<input type="file" accept="*/*">`), upload con progress indicator, poi aggiorna la lista
- **Anteprima**: apre il signed URL in una nuova tab. PDF e immagini vengono renderizzati dal browser. Per Word/Excel il browser propone il download (comportamento nativo).
- **Scarica**: scarica il file tramite signed URL con `Content-Disposition: attachment`
- **Elimina documento**: `window.confirm` + DELETE API
- **Elimina categoria**: possibile solo se non contiene documenti (API restituisce 409 altrimenti); messaggio di errore inline

### Icone tipo file

Icona visiva in base al `mime_type`:
- `application/pdf` → icona PDF rossa
- `image/*` → icona immagine
- `application/vnd.openxmlformats*` (Word/Excel) → icona Office
- Tutto il resto → icona generica documento

---

## Migration

**File:** `supabase/migrations/018_archivio_documenti.sql`

Contenuto: creazione tabelle `categorie_documenti` e `documenti`, RLS, abilitazione RLS su entrambe le tabelle.

Il bucket Supabase Storage `documenti` va creato manualmente dalla dashboard Supabase (o via API admin) con visibilità privata.

---

## Evolutività futura

- **Tag liberi**: aggiungere tabella `documenti_tags` e filtro per tag nella UI senza modificare la struttura attuale
- **Accesso dipendenti**: aggiungere policy RLS `SELECT` per ruolo `dipendente` quando necessario
- **Generazione AI da template**: modulo separato che usa questo archivio come sorgente dei template
