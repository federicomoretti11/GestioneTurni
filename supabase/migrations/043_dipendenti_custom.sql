-- supabase/migrations/043_dipendenti_custom.sql

-- 1. Tabella dipendenti esterni riutilizzabili
CREATE TABLE dipendenti_custom (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  cognome    text        NOT NULL,
  attivo     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dipendenti_custom ENABLE ROW LEVEL SECURITY;

-- Solo SELECT e INSERT: update/delete sono YAGNI in questo MVP.
-- La gestione avviene solo lato server tramite service_role se necessario.

-- RLS: admin e manager vedono e creano sul proprio tenant
CREATE POLICY "dipendenti_custom_select" ON dipendenti_custom
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "dipendenti_custom_insert" ON dipendenti_custom
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Nota: i turni con dipendente_custom_id sono visibili/modificabili solo dagli admin.
-- Manager e dipendenti non hanno accesso tramite RLS (limitazione nota, documentata in spec).

-- 2. Colonna su turni
-- ON DELETE RESTRICT: impedisce la cancellazione di un dipendente custom che ha turni assegnati.
-- Preferito a SET NULL per mantenere integrità storica dei turni.
ALTER TABLE turni ADD COLUMN dipendente_custom_id uuid
  REFERENCES dipendenti_custom(id) ON DELETE RESTRICT;

-- 3. CHECK XOR: esattamente uno dei due deve essere valorizzato.
--    Le righe esistenti (dipendente_id NOT NULL, dipendente_custom_id NULL)
--    soddisfano già la prima condizione.
ALTER TABLE turni ADD CONSTRAINT check_dipendente_xor CHECK (
  (dipendente_id IS NOT NULL AND dipendente_custom_id IS NULL) OR
  (dipendente_id IS NULL     AND dipendente_custom_id IS NOT NULL)
);
