-- Necessario per Supabase Realtime: senza REPLICA IDENTITY FULL il payload
-- degli eventi postgres_changes arriva con i campi NULL per le tabelle con RLS.
ALTER TABLE chat_messaggi REPLICA IDENTITY FULL;
ALTER TABLE chat_conversazioni REPLICA IDENTITY FULL;
