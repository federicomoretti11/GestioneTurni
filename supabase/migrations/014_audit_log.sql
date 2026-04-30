CREATE TABLE audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tabella    TEXT        NOT NULL,
  record_id  UUID        NOT NULL,
  azione     TEXT        NOT NULL,
  utente_id  UUID        REFERENCES profiles(id),
  dettagli   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_tabella_record ON audit_log (tabella, record_id);
CREATE INDEX audit_log_created_at     ON audit_log (created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin')
  );
