-- Moduli HR avanzati — predisposti come feature flags, logica da implementare
ALTER TABLE impostazioni
  ADD COLUMN IF NOT EXISTS modulo_contratti_abilitato      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modulo_straordinari_abilitato   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modulo_ferie_contatori_abilitato BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modulo_staffing_abilitato       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modulo_indisponibilita_abilitato BOOLEAN NOT NULL DEFAULT false;
