-- Fix RLS policies for chat tables
-- Issue 1: utente_chat_conv lacked WITH CHECK, allowing tenant_id spoofing on INSERT
-- Issue 2: utente_chat_msg used FOR ALL without mittente_id check, allowing sender spoofing

-- Fix chat_conversazioni policy
DROP POLICY IF EXISTS "utente_chat_conv" ON chat_conversazioni;
CREATE POLICY "utente_chat_conv" ON chat_conversazioni
  FOR ALL USING (utente_id = auth.uid())
  WITH CHECK (tenant_id = get_my_tenant_id() AND utente_id = auth.uid());

-- Fix chat_messaggi policies: split FOR ALL into SELECT + INSERT with proper checks
DROP POLICY IF EXISTS "utente_chat_msg" ON chat_messaggi;

CREATE POLICY "utente_chat_msg_select" ON chat_messaggi
  FOR SELECT USING (
    conversazione_id IN (
      SELECT id FROM chat_conversazioni WHERE utente_id = auth.uid()
    )
  );

CREATE POLICY "utente_chat_msg_insert" ON chat_messaggi
  FOR INSERT WITH CHECK (
    mittente_id = auth.uid()
    AND conversazione_id IN (
      SELECT id FROM chat_conversazioni WHERE utente_id = auth.uid()
    )
  );
