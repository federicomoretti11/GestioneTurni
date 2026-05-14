-- supabase/migrations/042_demo_requests.sql
CREATE TABLE IF NOT EXISTS demo_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  azienda     TEXT NOT NULL,
  dipendenti  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nessun tenant_id: sono lead marketing pre-onboarding.
-- Nessuna policy pubblica: accesso solo via service_role dalla API route.
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
