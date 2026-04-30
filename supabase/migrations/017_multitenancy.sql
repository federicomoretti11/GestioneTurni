-- supabase/migrations/017_multitenancy.sql
-- Multi-tenancy: tabella tenants, tenant_id su tutte le tabelle, RLS aggiornate
-- Applicare manualmente nel SQL Editor di Supabase Dashboard

-- =====================================================================
-- 1. TABELLA TENANTS
-- =====================================================================
CREATE TABLE tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  attivo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- Solo super_admin legge/modifica (tutto il resto via service_role).
-- Usa get_is_super_admin() definita nella sezione 7 (applicare dopo).
CREATE POLICY "tenants_super_admin" ON tenants
  FOR ALL USING (get_is_super_admin());

-- =====================================================================
-- 2. FLAG SUPER_ADMIN SU PROFILES
-- =====================================================================
ALTER TABLE profiles ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- =====================================================================
-- 3. TENANT_ID (nullable inizialmente, poi NOT NULL dopo migrazione dati)
-- =====================================================================
-- Nota: la tabella reparti non esiste in questo schema (mai utilizzata)
ALTER TABLE profiles          ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE turni             ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE turni_template    ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE posti_di_servizio ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE richieste         ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notifiche         ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE audit_log         ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- festivi: era data DATE PRIMARY KEY → diventa (id UUID, tenant_id, data) con PK composita
ALTER TABLE festivi ADD COLUMN id UUID DEFAULT gen_random_uuid();
ALTER TABLE festivi ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE festivi DROP CONSTRAINT festivi_pkey;
ALTER TABLE festivi ADD PRIMARY KEY (id);
CREATE UNIQUE INDEX festivi_tenant_data_idx ON festivi(tenant_id, data);

-- impostazioni: da singleton (id=1) a per-tenant
ALTER TABLE impostazioni ADD COLUMN tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE impostazioni DROP CONSTRAINT IF EXISTS singleton;

-- =====================================================================
-- 4. MIGRAZIONE DATI ESISTENTI → TENANT #1
-- =====================================================================
DO $$
DECLARE
  tid UUID;
BEGIN
  -- Crea il tenant principale
  INSERT INTO tenants (nome, slug) VALUES ('Azienda Principale', 'main')
  RETURNING id INTO tid;

  -- Assegna a tutte le tabelle
  UPDATE profiles          SET tenant_id = tid;
  UPDATE turni             SET tenant_id = tid;
  UPDATE turni_template    SET tenant_id = tid;
  UPDATE posti_di_servizio SET tenant_id = tid;
  UPDATE richieste         SET tenant_id = tid;
  UPDATE notifiche         SET tenant_id = tid;
  UPDATE audit_log         SET tenant_id = tid;
  UPDATE festivi           SET tenant_id = tid WHERE tenant_id IS NULL;

  -- Impostazioni: aggiorna la riga esistente (id=1) con il tenant
  UPDATE impostazioni SET tenant_id = tid WHERE id = 1;

END $$;

-- =====================================================================
-- 5. NOT NULL CONSTRAINTS (dopo aver popolato i dati)
-- =====================================================================
ALTER TABLE profiles          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE reparti           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE turni             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE turni_template    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE posti_di_servizio ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE richieste         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notifiche         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE festivi           ALTER COLUMN tenant_id SET NOT NULL;
-- audit_log: tenant_id rimane nullable (azioni di sistema senza tenant)

-- =====================================================================
-- 6. INDICI SU TENANT_ID (performance RLS)
-- =====================================================================
CREATE INDEX idx_profiles_tenant          ON profiles(tenant_id);
CREATE INDEX idx_turni_tenant             ON turni(tenant_id);
CREATE INDEX idx_turni_template_tenant    ON turni_template(tenant_id);
CREATE INDEX idx_posti_tenant             ON posti_di_servizio(tenant_id);
CREATE INDEX idx_richieste_tenant         ON richieste(tenant_id);
CREATE INDEX idx_notifiche_tenant         ON notifiche(tenant_id);
CREATE INDEX idx_audit_log_tenant         ON audit_log(tenant_id);

-- =====================================================================
-- 7. FUNZIONI HELPER
-- =====================================================================
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- Necessario per evitare ricorsione RLS: la policy super_admin su profiles
-- non può fare subquery su profiles (stessa tabella), usa questa funzione SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT COALESCE(is_super_admin, false) FROM profiles WHERE id = auth.uid()
$$;

-- =====================================================================
-- 8. AGGIORNA TRIGGER handle_new_user PER LEGGERE tenant_id DAI METADATA
-- =====================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, nome, cognome, ruolo, tenant_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', ''),
    COALESCE(new.raw_user_meta_data->>'cognome', ''),
    COALESCE((new.raw_user_meta_data->>'ruolo')::ruolo_utente, 'dipendente'),
    (new.raw_user_meta_data->>'tenant_id')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- =====================================================================
-- 9. RLS POLICIES AGGIORNATE (drop + recreate con filtro tenant)
-- =====================================================================

-- === PROFILES ===
DROP POLICY IF EXISTS "admin_profiles_all"         ON profiles;
DROP POLICY IF EXISTS "manager_profiles_select"    ON profiles;
DROP POLICY IF EXISTS "dipendente_profiles_select" ON profiles;

CREATE POLICY "admin_profiles_all" ON profiles FOR ALL
  USING (get_my_role() = 'admin' AND tenant_id = get_my_tenant_id());

-- Manager vede tutti i profili del proprio tenant (nessuna colonna reparto_id)
CREATE POLICY "manager_profiles_select" ON profiles FOR SELECT
  USING (get_my_role() = 'manager' AND tenant_id = get_my_tenant_id());

CREATE POLICY "dipendente_profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "super_admin_profiles_all" ON profiles FOR ALL
  USING (get_is_super_admin());

-- === TURNI_TEMPLATE ===
DROP POLICY IF EXISTS "authenticated_template_select" ON turni_template;
DROP POLICY IF EXISTS "admin_manager_template_all"    ON turni_template;

CREATE POLICY "authenticated_template_select" ON turni_template FOR SELECT
  USING (auth.uid() IS NOT NULL AND tenant_id = get_my_tenant_id());

CREATE POLICY "admin_manager_template_all" ON turni_template FOR ALL
  USING (get_my_role() IN ('admin','manager') AND tenant_id = get_my_tenant_id());

-- === TURNI ===
DROP POLICY IF EXISTS "admin_turni_all"          ON turni;
DROP POLICY IF EXISTS "manager_turni_all"        ON turni;
DROP POLICY IF EXISTS "dipendente_turni_select"  ON turni;

CREATE POLICY "admin_turni_all" ON turni FOR ALL
  USING (get_my_role() = 'admin' AND tenant_id = get_my_tenant_id());

-- Manager gestisce tutti i turni del tenant (nessuna colonna reparto_id)
CREATE POLICY "manager_turni_all" ON turni FOR ALL
  USING (get_my_role() = 'manager' AND tenant_id = get_my_tenant_id());

CREATE POLICY "dipendente_turni_select" ON turni FOR SELECT
  USING (
    get_my_role() = 'dipendente'
    AND tenant_id = get_my_tenant_id()
    AND dipendente_id = auth.uid()
    AND stato = 'confermato'
  );

-- === RICHIESTE ===
DROP POLICY IF EXISTS "dipendente_select_proprie" ON richieste;
DROP POLICY IF EXISTS "dipendente_insert"         ON richieste;
DROP POLICY IF EXISTS "dipendente_annulla"        ON richieste;
DROP POLICY IF EXISTS "staff_select_all"          ON richieste;
DROP POLICY IF EXISTS "staff_update"              ON richieste;
DROP POLICY IF EXISTS "admin_delete"              ON richieste;

CREATE POLICY "dipendente_select_proprie" ON richieste FOR SELECT
  USING (tenant_id = get_my_tenant_id() AND dipendente_id = auth.uid());

CREATE POLICY "dipendente_insert" ON richieste FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id() AND dipendente_id = auth.uid());

CREATE POLICY "dipendente_annulla" ON richieste FOR UPDATE
  USING (tenant_id = get_my_tenant_id() AND dipendente_id = auth.uid() AND stato IN ('pending','comunicata'))
  WITH CHECK (tenant_id = get_my_tenant_id() AND dipendente_id = auth.uid() AND stato = 'annullata');

CREATE POLICY "staff_select_all" ON richieste FOR SELECT
  USING (get_my_role() IN ('admin','manager') AND tenant_id = get_my_tenant_id());

CREATE POLICY "staff_update" ON richieste FOR UPDATE
  USING (get_my_role() IN ('admin','manager') AND tenant_id = get_my_tenant_id())
  WITH CHECK (get_my_role() IN ('admin','manager') AND tenant_id = get_my_tenant_id());

CREATE POLICY "admin_delete" ON richieste FOR DELETE
  USING (get_my_role() = 'admin' AND tenant_id = get_my_tenant_id());

-- === NOTIFICHE ===
DROP POLICY IF EXISTS "notifiche_select_proprie" ON notifiche;
DROP POLICY IF EXISTS "notifiche_update_proprie" ON notifiche;
DROP POLICY IF EXISTS "notifiche_delete_proprie" ON notifiche;

CREATE POLICY "notifiche_select_proprie" ON notifiche FOR SELECT
  USING (tenant_id = get_my_tenant_id() AND destinatario_id = auth.uid());

CREATE POLICY "notifiche_update_proprie" ON notifiche FOR UPDATE
  USING (tenant_id = get_my_tenant_id() AND destinatario_id = auth.uid())
  WITH CHECK (tenant_id = get_my_tenant_id() AND destinatario_id = auth.uid());

CREATE POLICY "notifiche_delete_proprie" ON notifiche FOR DELETE
  USING (tenant_id = get_my_tenant_id() AND destinatario_id = auth.uid());

-- === FESTIVI ===
DROP POLICY IF EXISTS "authenticated_festivi_select" ON festivi;
DROP POLICY IF EXISTS "admin_festivi_all"            ON festivi;

CREATE POLICY "authenticated_festivi_select" ON festivi FOR SELECT
  USING (auth.uid() IS NOT NULL AND tenant_id = get_my_tenant_id());

CREATE POLICY "admin_festivi_all" ON festivi FOR ALL
  USING (get_my_role() = 'admin' AND tenant_id = get_my_tenant_id());

-- === IMPOSTAZIONI ===
DROP POLICY IF EXISTS "impostazioni_lettura_autenticati" ON impostazioni;
DROP POLICY IF EXISTS "impostazioni_modifica_admin"      ON impostazioni;

CREATE POLICY "impostazioni_lettura_autenticati" ON impostazioni FOR SELECT
  USING (auth.uid() IS NOT NULL AND tenant_id = get_my_tenant_id());

CREATE POLICY "impostazioni_modifica_admin" ON impostazioni FOR UPDATE
  USING (get_my_role() = 'admin' AND tenant_id = get_my_tenant_id());

-- === AUDIT_LOG ===
DROP POLICY IF EXISTS "audit_log_admin" ON audit_log;

CREATE POLICY "audit_log_admin" ON audit_log FOR SELECT
  USING (get_my_role() = 'admin' AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL));

-- =====================================================================
-- NOTA FINALE
-- =====================================================================
-- Dopo aver applicato questa migration:
-- 1. Aggiungere NEXT_PUBLIC_DEV_TENANT_ID=<id_tenant_main> al .env.local
--    Puoi ottenere l'ID con: SELECT id FROM tenants WHERE slug = 'main';
-- 2. Disabilitare "Enable email signup" in Supabase Auth settings
--    (gli utenti vanno creati solo tramite l'API admin)
