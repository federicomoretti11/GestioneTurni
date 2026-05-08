-- supabase/migrations/022_cedolini.sql
-- Modulo cedolini digitali: tabella per-tenant con RLS admin/dipendente

CREATE TABLE cedolini (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dipendente_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  mese             DATE NOT NULL,
  storage_path     TEXT NOT NULL,
  dimensione_bytes BIGINT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE cedolini ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cedolini_tenant      ON cedolini(tenant_id);
CREATE INDEX idx_cedolini_dipendente  ON cedolini(dipendente_id);
CREATE INDEX idx_cedolini_mese        ON cedolini(mese DESC);

-- Admin/super-admin: full access su tutto il tenant
CREATE POLICY "admin_cedolini_all" ON cedolini FOR ALL
  USING (
    tenant_id = get_my_tenant_id()
    AND (get_is_super_admin() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
    ))
  );

-- Dipendente: solo lettura dei propri cedolini
CREATE POLICY "dipendente_cedolini_select" ON cedolini FOR SELECT
  USING (
    tenant_id = get_my_tenant_id()
    AND dipendente_id = auth.uid()
  );
