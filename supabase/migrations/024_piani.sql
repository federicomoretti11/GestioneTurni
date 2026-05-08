-- supabase/migrations/024_piani.sql

-- Aggiungi colonne piano a tenants
ALTER TABLE tenants ADD COLUMN piano TEXT NOT NULL DEFAULT 'starter'
  CHECK (piano IN ('starter', 'professional', 'enterprise'));
ALTER TABLE tenants ADD COLUMN piano_scadenza TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN piano_note TEXT;

-- Aggiungi i 3 flag enterprise mancanti a impostazioni
ALTER TABLE impostazioni ADD COLUMN modulo_paghe_abilitato BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE impostazioni ADD COLUMN modulo_ai_copilot_abilitato BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE impostazioni ADD COLUMN white_label_abilitato BOOLEAN NOT NULL DEFAULT false;

-- Storico cambi piano (immutabile, solo insert)
CREATE TABLE tenant_piano_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  piano       TEXT NOT NULL,
  cambiato_da UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tenant_piano_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo_super_admin" ON tenant_piano_log
  FOR ALL USING (get_is_super_admin());
