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
