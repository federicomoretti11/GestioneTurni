-- supabase/migrations/018_archivio_documenti.sql

CREATE TABLE categorie_documenti (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  ordine     INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  categoria_id     UUID NOT NULL REFERENCES categorie_documenti(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  storage_path     TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  dimensione_bytes BIGINT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE categorie_documenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_categorie_documenti" ON categorie_documenti FOR ALL
  USING (
    tenant_id = get_my_tenant_id()
    AND (get_is_super_admin() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
    ))
  );

CREATE POLICY "admin_documenti" ON documenti FOR ALL
  USING (
    tenant_id = get_my_tenant_id()
    AND (get_is_super_admin() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
    ))
  );
