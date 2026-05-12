CREATE TABLE IF NOT EXISTS contatori_ferie (
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
