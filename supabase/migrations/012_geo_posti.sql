-- Crea tabella posti_di_servizio se non esiste (era creata manualmente in produzione)
CREATE TABLE IF NOT EXISTS posti_di_servizio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  descrizione TEXT,
  attivo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE posti_di_servizio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manager_posti_all"     ON posti_di_servizio;
DROP POLICY IF EXISTS "authenticated_posti_select"  ON posti_di_servizio;

CREATE POLICY "admin_manager_posti_all" ON posti_di_servizio
  FOR ALL USING (get_my_role() IN ('admin', 'manager'));

CREATE POLICY "authenticated_posti_select" ON posti_di_servizio
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- FK da turni a posti_di_servizio (era aggiunta manualmente in produzione)
ALTER TABLE turni
  ADD COLUMN IF NOT EXISTS posto_id UUID REFERENCES posti_di_servizio(id) ON DELETE SET NULL;

-- Coordinate sul posto di servizio
ALTER TABLE posti_di_servizio
  ADD COLUMN latitudine          DOUBLE PRECISION,
  ADD COLUMN longitudine         DOUBLE PRECISION,
  ADD COLUMN raggio_metri        INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN geo_check_abilitato BOOLEAN NOT NULL DEFAULT false;

-- Audit geo e sblocco sul turno
ALTER TABLE turni
  ADD COLUMN lat_checkin                 DOUBLE PRECISION,
  ADD COLUMN lng_checkin                 DOUBLE PRECISION,
  ADD COLUMN geo_anomalia                BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sblocco_checkin_valido_fino TIMESTAMPTZ;

-- Nuovo tipo richiesta
ALTER TYPE tipo_richiesta ADD VALUE IF NOT EXISTS 'sblocco_checkin';
