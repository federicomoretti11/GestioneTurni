-- Aggiunge la colonna includi_in_turni alla tabella profiles
-- La colonna era referenziata nel codice ma mai creata via migration

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS includi_in_turni BOOLEAN NOT NULL DEFAULT true;
