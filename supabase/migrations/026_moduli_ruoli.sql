-- supabase/migrations/026_moduli_ruoli.sql
-- Aggiunge colonne _ruoli a impostazioni per controllare la visibilità per ruolo

ALTER TABLE impostazioni
  ADD COLUMN modulo_tasks_ruoli      TEXT[] NOT NULL DEFAULT '{admin,manager,dipendente}',
  ADD COLUMN modulo_documenti_ruoli  TEXT[] NOT NULL DEFAULT '{admin,manager,dipendente}',
  ADD COLUMN modulo_cedolini_ruoli   TEXT[] NOT NULL DEFAULT '{admin,manager,dipendente}',
  ADD COLUMN modulo_analytics_ruoli  TEXT[] NOT NULL DEFAULT '{admin,manager,dipendente}',
  ADD COLUMN modulo_paghe_ruoli      TEXT[] NOT NULL DEFAULT '{admin,manager,dipendente}',
  ADD COLUMN modulo_ai_copilot_ruoli TEXT[] NOT NULL DEFAULT '{admin,manager,dipendente}';
