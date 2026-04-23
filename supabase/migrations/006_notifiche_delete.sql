-- supabase/migrations/006_notifiche_delete.sql
-- Consente al destinatario di eliminare le proprie notifiche
-- (pulizia manuale dal popover + auto-cleanup delle lette oltre 10 giorni).

create policy "notifiche_delete_proprie" on notifiche
  for delete using (destinatario_id = auth.uid());
