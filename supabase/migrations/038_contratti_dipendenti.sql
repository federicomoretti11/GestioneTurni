-- supabase/migrations/038_contratti_dipendenti.sql
CREATE TABLE IF NOT EXISTS contratti_dipendenti (
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

DROP POLICY IF EXISTS "admin_contratti" ON contratti_dipendenti;
CREATE POLICY "admin_contratti" ON contratti_dipendenti
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

DROP POLICY IF EXISTS "manager_contratti_select" ON contratti_dipendenti;
CREATE POLICY "manager_contratti_select" ON contratti_dipendenti
  FOR SELECT USING (tenant_id = get_my_tenant_id());
