# Contratti e Orario Contrattuale — Design

## Goal

Associare a ogni dipendente un contratto di lavoro essenziale (tipo, ore settimanali, ore giornaliere, data inizio) per abilitare il calcolo automatico degli straordinari e alimentare i consuntivi paghe senza inserimento manuale.

## Architettura

Feature gated da `modulo_contratti_abilitato`. Se il flag è spento, nessuna UI o API è esposta.

Un solo contratto attivo per dipendente (no storico). Se il contratto cambia, il record viene sovrascritto. Solo l'admin può gestirlo.

## Database

Nuova tabella `contratti_dipendenti`:

```sql
CREATE TABLE contratti_dipendenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dipendente_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('full_time','part_time','turni_fissi','turni_rotanti')),
  ore_settimanali  NUMERIC(5,2) NOT NULL,
  ore_giornaliere  NUMERIC(5,2) NOT NULL,
  data_inizio      DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, dipendente_id)
);

ALTER TABLE contratti_dipendenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_contratti" ON contratti_dipendenti
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

CREATE POLICY "manager_contratti_select" ON contratti_dipendenti
  FOR SELECT USING (tenant_id = get_my_tenant_id());
```

`ore_giornaliere` è impostato esplicitamente dall'admin (non derivato da ore_settimanali) perché un part-time 20h può fare 4h×5gg o 8h×2.5gg — la distribuzione dipende dal contratto reale.

## API

`GET /api/admin/contratti/[id]`  
Legge il contratto del dipendente con id `[id]`. Restituisce `null` se non configurato. Accessibile anche al manager (read-only).

`PUT /api/admin/contratti/[id]`  
Crea o aggiorna (upsert) il contratto. Solo admin. Body: `{ tipo, ore_settimanali, ore_giornaliere, data_inizio }`.

## UI

Nella pagina `/admin/utenti/[id]`, sotto il form anagrafica, appare una card "Contratto" **solo se `modulo_contratti_abilitato`**.

- Se nessun contratto è configurato: banner informativo "Nessun contratto impostato" con pulsante "Aggiungi"
- Se esiste: form precompilato con i 4 campi, pulsante "Salva contratto"
- Campi: Tipo contratto (select), Ore settimanali (number, step 0.5), Ore giornaliere (number, step 0.5), Data inizio (date)

## Helper server-side

`lib/contratti.ts` — esporta `getContrattoDipendente(dipendente_id: string, tenant_id: string)`:
- Usa `createAdminClient()` per bypass RLS
- Restituisce il record contratto o `null`
- Usata da feature 2 (straordinari) senza duplicare la query

## Tech Stack

Next.js 14 App Router, Supabase, TypeScript. Pattern identico alle API esistenti (`requireTenantId`, `createAdminClient`).
