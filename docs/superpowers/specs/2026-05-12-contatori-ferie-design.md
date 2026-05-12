# Contatori Ferie/Permessi/ROL — Design

## Goal

Permettere all'admin di configurare il budget annuale di ferie (giorni), permesso (ore) e ROL (ore) per ogni dipendente, e mostrare il saldo residuo calcolato dalle richieste approvate.

## Architettura

Feature gated da `modulo_ferie_contatori_abilitato`. Nuova tabella `contatori_ferie` con budget per (dipendente, anno). Il saldo usato è calcolato on-the-fly dalle richieste approvate nell'anno — nessun campo di conteggio da mantenere sincronizzato.

## Database

```sql
CREATE TABLE contatori_ferie (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dipendente_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anno             INT NOT NULL,
  ferie_giorni     NUMERIC(6,2) NOT NULL DEFAULT 0,
  permesso_ore     NUMERIC(6,2) NOT NULL DEFAULT 0,
  rol_ore          NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, dipendente_id, anno)
);

ALTER TABLE contatori_ferie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_contatori" ON contatori_ferie
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

CREATE POLICY "manager_contatori_select" ON contatori_ferie
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin','manager')
  ));

CREATE POLICY "dipendente_contatori_select" ON contatori_ferie
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND dipendente_id = auth.uid());
```

## API

### `GET /api/admin/contatori/[id]?anno=YYYY`
Accessibile a admin e manager. Restituisce budget + saldo calcolato:
```json
{
  "anno": 2025,
  "ferie_giorni": 20,
  "permesso_ore": 40,
  "rol_ore": 24,
  "ferie_usate": 5,
  "permesso_usate": 16,
  "rol_usate": 0
}
```
Se nessun record per quell'anno → restituisce tutto a zero (default). Il saldo usato viene calcolato server-side dalle richieste approvate nell'anno.

### `PUT /api/admin/contatori/[id]`
Solo admin. Body: `{ anno, ferie_giorni, permesso_ore, rol_ore }`. Upsert su UNIQUE(tenant_id, dipendente_id, anno).

## Calcolo saldo usato

Le richieste nella tabella `richieste` hanno `tipo` e `stato`. Per calcolare il saldo usato nell'anno:

- **ferie_usate**: COUNT giorni di richieste tipo `ferie` e stato `approvata` con `data_inizio` nell'anno (ogni riga vale 1 giorno)
- **permesso_usate**: SUM ore di richieste tipo `permesso` e stato `approvata` nell'anno. Le ore si calcolano da `ora_inizio`/`ora_fine` se presenti, oppure 4h per mezza giornata, 8h per giornata intera.
- **rol_usate**: 0 (nessun tipo `rol` nelle richieste attuali — placeholder per feature futura)

## UI

### Card in `/admin/utenti/[id]` (solo admin, gated)

Visibile solo se `modulo_ferie_contatori_abilitato`. Mostra un selettore anno (default anno corrente) e 3 righe:

| Campo | Budget (editabile) | Usato (sola lettura) | Residuo |
|---|---|---|---|
| Ferie | input number | calcolato | budget − usato |
| Permesso (ore) | input number | calcolato | budget − usato |
| ROL (ore) | input number | — | — |

Pulsante "Salva budget". Il selettore anno permette di vedere/modificare anni passati e futuri.

### Card in `/dipendente/profilo` (solo lettura, gated)

Stessa struttura ma tutti i campi in sola lettura. Visibile solo se `modulo_ferie_contatori_abilitato`.

## Tech Stack

Next.js 14 App Router, Supabase, TypeScript. Pattern identico a `contratti_dipendenti`.
