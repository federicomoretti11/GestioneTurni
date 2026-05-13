# Staffing/Fabbisogno — Design

## Goal

Definire il numero minimo di persone necessarie per ogni posto di servizio per ogni giorno della settimana, e visualizzare in una pagina dedicata se i turni confermati coprono il fabbisogno.

## Architettura

Feature gated da `modulo_staffing_abilitato`. Nuova tabella `staffing_fabbisogno` con fabbisogno per (posto, giorno settimana). Configurazione nella pagina posto esistente. Visualizzazione in nuova pagina `/admin/staffing`.

## Database

```sql
CREATE TABLE staffing_fabbisogno (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  posto_id         UUID NOT NULL REFERENCES posti_di_servizio(id) ON DELETE CASCADE,
  giorno_settimana INT NOT NULL CHECK (giorno_settimana BETWEEN 0 AND 6), -- 0=Lun, 6=Dom
  min_persone      INT NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, posto_id, giorno_settimana)
);

ALTER TABLE staffing_fabbisogno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_staffing" ON staffing_fabbisogno
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

CREATE POLICY "manager_staffing_select" ON staffing_fabbisogno
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin','manager')
  ));
```

`giorno_settimana`: 0 = Lunedì, 1 = Martedì, …, 6 = Domenica (convenzione ISO week, non JS domenica=0).

## API

### `GET /api/admin/staffing/posti/[id]`
Legge i 7 valori di fabbisogno per un posto. Restituisce array ordinato [lun…dom] con `giorno_settimana` e `min_persone`. Se un giorno non ha record → `min_persone: 0`.

### `PUT /api/admin/staffing/posti/[id]`
Solo admin. Body: `{ fabbisogno: Array<{ giorno_settimana: number, min_persone: number }> }` (7 elementi). Upsert per ciascun elemento.

### `GET /api/admin/staffing?settimana=YYYY-MM-DD`
Accessibile a admin e manager. `settimana` = data del lunedì della settimana (se omessa, usa lunedì corrente). Restituisce per ogni posto:
```json
[{
  "posto_id": "...",
  "posto_nome": "Cassa",
  "giorni": [
    { "data": "2025-05-12", "giorno": 0, "confermati": 2, "minimo": 3, "ok": false },
    ...
  ]
}]
```

## UI

### Sezione "Fabbisogno" in `/admin/posti/[id]`

Visibile solo se `modulo_staffing_abilitato`. Tabella con 7 righe (Lun–Dom), colonna "Minimo persone" con input numerico. Pulsante "Salva fabbisogno".

### Pagina `/admin/staffing`

Visibile solo se `modulo_staffing_abilitato`. Navigazione settimana (← settimana precedente / → settimana successiva). Tabella:
- Righe = posti di servizio attivi
- Colonne = 7 giorni della settimana (con data)
- Cella: `N/M` dove N = turni confermati, M = minimo. Sfondo verde se N ≥ M (o M = 0), rosso se N < M.

Link nel menu admin (sezione Gestione), mostrato solo se modulo abilitato.

## Tech Stack

Next.js 14 App Router, Supabase, TypeScript. Pattern identico alle altre feature.
