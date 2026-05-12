-- Consente l'eliminazione di un utente senza violare i vincoli FK.
--
-- Problema: turni.creato_da e richieste.manager_id/admin_id referenziano
-- profiles(id) senza ON DELETE, quindi usano il default RESTRICT e bloccano
-- qualsiasi tentativo di delete su auth.users → profiles.
--
-- Fix: portare tutti e tre a ON DELETE SET NULL.
-- turni.creato_da è NOT NULL → va reso nullable prima.

-- 1. Rendi creato_da nullable (era solo un campo audit, non strutturale)
ALTER TABLE turni ALTER COLUMN creato_da DROP NOT NULL;

-- 2. Ricrea i vincoli con ON DELETE SET NULL
ALTER TABLE turni
  DROP CONSTRAINT IF EXISTS turni_creato_da_fkey,
  ADD CONSTRAINT turni_creato_da_fkey
    FOREIGN KEY (creato_da) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE richieste
  DROP CONSTRAINT IF EXISTS richieste_manager_id_fkey,
  ADD CONSTRAINT richieste_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE richieste
  DROP CONSTRAINT IF EXISTS richieste_admin_id_fkey,
  ADD CONSTRAINT richieste_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Tabella singleton per le impostazioni globali dell'app
CREATE TABLE IF NOT EXISTS impostazioni (
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
