CREATE TABLE IF NOT EXISTS staffing_fabbisogno (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  posto_id         UUID NOT NULL REFERENCES posti_di_servizio(id) ON DELETE CASCADE,
  giorno_settimana INT NOT NULL CHECK (giorno_settimana BETWEEN 0 AND 6),
  min_persone      INT NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, posto_id, giorno_settimana)
);

ALTER TABLE staffing_fabbisogno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_staffing" ON staffing_fabbisogno;
CREATE POLICY "admin_staffing" ON staffing_fabbisogno
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

DROP POLICY IF EXISTS "manager_staffing_select" ON staffing_fabbisogno;
CREATE POLICY "manager_staffing_select" ON staffing_fabbisogno
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin','manager')
  ));
