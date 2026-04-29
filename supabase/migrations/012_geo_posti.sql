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
