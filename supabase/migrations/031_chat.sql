CREATE TABLE chat_conversazioni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  utente_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stato       TEXT NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'archiviata')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX chat_conv_utente_aperta ON chat_conversazioni(utente_id) WHERE stato = 'aperta';

CREATE TABLE chat_messaggi (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversazione_id UUID NOT NULL REFERENCES chat_conversazioni(id) ON DELETE CASCADE,
  mittente_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  testo            TEXT NOT NULL,
  letto_superadmin BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chat_msg_conv ON chat_messaggi(conversazione_id, created_at);

ALTER TABLE chat_conversazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messaggi      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utente_chat_conv" ON chat_conversazioni
  FOR ALL USING (utente_id = auth.uid());

CREATE POLICY "superadmin_chat_conv" ON chat_conversazioni
  FOR ALL USING (get_is_super_admin());

CREATE POLICY "utente_chat_msg" ON chat_messaggi
  FOR ALL USING (
    conversazione_id IN (
      SELECT id FROM chat_conversazioni WHERE utente_id = auth.uid()
    )
  );

CREATE POLICY "superadmin_chat_msg" ON chat_messaggi
  FOR ALL USING (get_is_super_admin());

CREATE OR REPLACE FUNCTION chat_aggiorna_conv_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chat_conversazioni SET updated_at = now() WHERE id = NEW.conversazione_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_msg_aggiorna_conv
  AFTER INSERT ON chat_messaggi
  FOR EACH ROW EXECUTE FUNCTION chat_aggiorna_conv_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messaggi;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversazioni;
