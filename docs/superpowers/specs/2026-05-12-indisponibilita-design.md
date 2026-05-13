# Indisponibilità Dipendente — Design

## Goal

Permettere ai dipendenti di segnalare i giorni in cui non sono disponibili, visibili all'admin/manager durante la pianificazione turni.

## Architettura

Feature gated da `modulo_indisponibilita_abilitato`. Nuova tabella `indisponibilita`. Il dipendente gestisce le proprie indisponibilità dal profilo. Il calendario programmazione admin mostra un'icona sui giorni con indisponibilità.

## Database

```sql
CREATE TABLE indisponibilita (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dipendente_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_inizio      DATE NOT NULL,
  data_fine        DATE NOT NULL,
  motivo           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE indisponibilita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_indisponibilita" ON indisponibilita
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

CREATE POLICY "manager_indisponibilita_select" ON indisponibilita
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin','manager')
  ));

CREATE POLICY "dipendente_indisponibilita" ON indisponibilita
  FOR ALL USING (tenant_id = get_my_tenant_id() AND dipendente_id = auth.uid());
```

## API

### `GET /api/indisponibilita?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Admin/manager: tutte le indisponibilità nel range per tutti i dipendenti
- Dipendente autenticato: solo le proprie
- Restituisce array di `{ id, dipendente_id, data_inizio, data_fine, motivo }`

### `POST /api/indisponibilita`
- Accessibile a tutti i ruoli (ognuno crea per sé stesso; admin può creare per qualsiasi dipendente)
- Body: `{ dipendente_id?, data_inizio, data_fine, motivo? }`
- Se `dipendente_id` non fornito: usa l'utente autenticato

### `DELETE /api/indisponibilita/[id]`
- Il dipendente può cancellare solo le proprie; admin può cancellare qualsiasi

## UI

### Sezione in `/dipendente/profilo`

Visibile solo se `modulo_indisponibilita_abilitato`. Lista delle indisponibilità future + form per aggiungere nuova (data inizio, data fine, motivo opzionale). Pulsante elimina su quelle future.

### Calendario programmazione admin

Nel calendario `/admin/calendario-programmazione`, per ogni dipendente nei giorni con indisponibilità, mostrare una piccola icona rossa 🔴 o indicatore visivo. I dati vengono fetchati assieme ai turni.

## Tech Stack

Next.js 14 App Router, Supabase, TypeScript.
