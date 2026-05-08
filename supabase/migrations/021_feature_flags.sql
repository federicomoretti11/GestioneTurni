-- supabase/migrations/021_feature_flags.sql
-- Feature flags per-tenant: 4 colonne booleane su impostazioni

ALTER TABLE impostazioni
  ADD COLUMN IF NOT EXISTS modulo_cedolini_abilitato  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modulo_analytics_abilitato BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modulo_tasks_abilitato     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS modulo_documenti_abilitato BOOLEAN NOT NULL DEFAULT true;
