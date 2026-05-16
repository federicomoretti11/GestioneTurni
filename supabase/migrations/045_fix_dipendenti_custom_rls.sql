-- Corregge le RLS policy di dipendenti_custom.
-- La versione originale usava un sub-query inline su profiles (soggetta a RLS di profiles),
-- causando interazioni impreviste. Il pattern corretto nel progetto è get_my_tenant_id()
-- che è SECURITY DEFINER e bypassa la RLS di profiles.

DROP POLICY IF EXISTS "dipendenti_custom_select" ON dipendenti_custom;
DROP POLICY IF EXISTS "dipendenti_custom_insert" ON dipendenti_custom;

CREATE POLICY "dipendenti_custom_select" ON dipendenti_custom
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "dipendenti_custom_insert" ON dipendenti_custom
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
