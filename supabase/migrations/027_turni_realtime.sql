-- supabase/migrations/027_turni_realtime.sql
-- Abilita realtime per la tabella turni.
-- Solo notifiche e richieste erano in pubblicazione; la tabella turni era assente
-- quindi tutti i canali postgres_changes su turni non ricevevano mai eventi.

alter publication supabase_realtime add table turni;
