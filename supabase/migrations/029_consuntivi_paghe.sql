-- 029_consuntivi_paghe.sql
-- Tabelle per il modulo Pre-elaborazione Paghe

CREATE TABLE consuntivi_paghe (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mese          DATE NOT NULL,  -- sempre primo giorno del mese: 2026-05-01
  stato         TEXT NOT NULL DEFAULT 'bozza' CHECK (stato IN ('bozza', 'approvato')),
  approvato_da  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approvato_at  TIMESTAMPTZ,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, mese)
);

CREATE TABLE consuntivi_righe (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consuntivo_id     UUID NOT NULL REFERENCES consuntivi_paghe(id) ON DELETE CASCADE,
  dipendente_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ore_ordinarie     NUMERIC(8,2) NOT NULL DEFAULT 0,
  ore_notturne      NUMERIC(8,2) NOT NULL DEFAULT 0,
  ore_festive       NUMERIC(8,2) NOT NULL DEFAULT 0,
  ore_straordinarie NUMERIC(8,2) NOT NULL DEFAULT 0,
  giorni_ferie      INTEGER NOT NULL DEFAULT 0,
  giorni_permesso   INTEGER NOT NULL DEFAULT 0,
  giorni_malattia   INTEGER NOT NULL DEFAULT 0,
  turni_count       INTEGER NOT NULL DEFAULT 0
);

-- Indici
CREATE INDEX ON consuntivi_paghe(tenant_id, mese);
CREATE INDEX ON consuntivi_righe(consuntivo_id);
CREATE INDEX ON consuntivi_righe(dipendente_id);

-- RLS
ALTER TABLE consuntivi_paghe ENABLE ROW LEVEL SECURITY;
ALTER TABLE consuntivi_righe ENABLE ROW LEVEL SECURITY;

-- consuntivi_paghe: solo admin del tenant
CREATE POLICY "consuntivi_paghe_admin" ON consuntivi_paghe
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND ruolo IN ('admin', 'manager')
        AND tenant_id = get_my_tenant_id()
    )
  );

-- consuntivi_righe: solo admin del tenant (tramite join a consuntivi_paghe)
CREATE POLICY "consuntivi_righe_admin" ON consuntivi_righe
  USING (
    EXISTS (
      SELECT 1 FROM consuntivi_paghe cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = consuntivi_righe.consuntivo_id
        AND cp.tenant_id = get_my_tenant_id()
        AND p.ruolo IN ('admin', 'manager')
        AND p.tenant_id = get_my_tenant_id()
    )
  );
