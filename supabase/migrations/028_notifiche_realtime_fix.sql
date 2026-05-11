-- supabase/migrations/028_notifiche_realtime_fix.sql
-- La policy notifiche_select_proprie usava get_my_tenant_id() che nel contesto
-- realtime può non risolvere correttamente, bloccando la consegna degli eventi.
-- Il check sul tenant è ridondante: destinatario_id = auth.uid() è sufficiente
-- perché ogni user UUID è unico a livello globale in Supabase auth.

DROP POLICY IF EXISTS "notifiche_select_proprie" ON notifiche;
CREATE POLICY "notifiche_select_proprie" ON notifiche FOR SELECT
  USING (destinatario_id = auth.uid());
