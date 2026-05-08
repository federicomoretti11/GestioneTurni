-- supabase/migrations/023_analytics_views.sql
-- Modulo analytics: viste aggregate per turni, presenze e richieste

-- ── Vista 1: ore lavorate per dipendente per mese ─────────────
-- Usa ore_ingresso/uscita_effettiva quando disponibili, altrimenti pianificate
CREATE OR REPLACE VIEW analytics_ore_mensili
WITH (security_invoker = true)
AS
SELECT
  t.tenant_id,
  t.dipendente_id,
  EXTRACT(YEAR  FROM t.data)::int AS anno,
  EXTRACT(MONTH FROM t.data)::int AS mese,
  SUM(
    CASE
      WHEN t.ora_ingresso_effettiva IS NOT NULL AND t.ora_uscita_effettiva IS NOT NULL
        THEN EXTRACT(EPOCH FROM (t.ora_uscita_effettiva - t.ora_ingresso_effettiva)) / 3600.0
      ELSE EXTRACT(EPOCH FROM (t.ora_fine - t.ora_inizio)) / 3600.0
    END
  )::numeric(10,2) AS ore_totali,
  COUNT(*)::int    AS turni_count
FROM turni t
WHERE t.stato = 'confermato'
GROUP BY t.tenant_id, t.dipendente_id, anno, mese;

-- ── Vista 2: riepilogo richieste per tipo e mese ──────────────
CREATE OR REPLACE VIEW analytics_richieste_mensili
WITH (security_invoker = true)
AS
SELECT
  r.tenant_id,
  r.tipo,
  r.stato,
  EXTRACT(YEAR  FROM r.created_at)::int AS anno,
  EXTRACT(MONTH FROM r.created_at)::int AS mese,
  COUNT(*)::int AS count
FROM richieste r
GROUP BY r.tenant_id, r.tipo, r.stato, anno, mese;

-- ── Vista 3: statistiche dipendenti ultimi 30 giorni ──────────
CREATE OR REPLACE VIEW analytics_dipendenti_30gg
WITH (security_invoker = true)
AS
SELECT
  t.tenant_id,
  t.dipendente_id,
  p.nome,
  p.cognome,
  COUNT(*)::int                                                          AS turni_confermati,
  COUNT(t.ora_ingresso_effettiva)::int                                   AS turni_con_timbratura,
  SUM(CASE WHEN t.geo_anomalia THEN 1 ELSE 0 END)::int                  AS geo_anomalie,
  SUM(EXTRACT(EPOCH FROM (t.ora_fine - t.ora_inizio)) / 3600.0)::numeric(10,2) AS ore_pianificate,
  SUM(
    CASE
      WHEN t.ora_ingresso_effettiva IS NOT NULL AND t.ora_uscita_effettiva IS NOT NULL
        THEN EXTRACT(EPOCH FROM (t.ora_uscita_effettiva - t.ora_ingresso_effettiva)) / 3600.0
      ELSE NULL
    END
  )::numeric(10,2) AS ore_effettive
FROM turni t
JOIN profiles p ON p.id = t.dipendente_id
WHERE t.stato = 'confermato'
  AND t.data >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY t.tenant_id, t.dipendente_id, p.nome, p.cognome;
