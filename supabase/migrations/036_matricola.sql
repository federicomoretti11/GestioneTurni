-- Sigla aziendale sul tenant (es. "RSS") — usata come prefisso della matricola
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sigla TEXT;

-- Matricola dipendente — univoca per tenant
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matricola TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_matricola_tenant
  ON profiles(tenant_id, matricola)
  WHERE matricola IS NOT NULL;
