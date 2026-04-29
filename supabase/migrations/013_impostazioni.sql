-- Tabella singleton per le impostazioni globali dell'app
CREATE TABLE impostazioni (
  id INTEGER PRIMARY KEY DEFAULT 1,
  gps_checkin_abilitato BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO impostazioni (id, gps_checkin_abilitato) VALUES (1, true)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE impostazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impostazioni_lettura_autenticati" ON impostazioni
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "impostazioni_modifica_admin" ON impostazioni
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin')
  );
