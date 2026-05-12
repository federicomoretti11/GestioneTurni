-- supabase/migrations/030_white_label.sql
-- Campi branding per white label per-tenant

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS nome_app        TEXT,
  ADD COLUMN IF NOT EXISTS colore_primario TEXT DEFAULT '#3B5BDB',
  ADD COLUMN IF NOT EXISTS logo_url        TEXT;
