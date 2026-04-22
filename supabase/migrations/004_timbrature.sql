-- supabase/migrations/004_timbrature.sql

-- Timbrature effettive (badge ingresso/uscita) sul turno
alter table turni
  add column ora_ingresso_effettiva timestamptz,
  add column ora_uscita_effettiva   timestamptz;

-- Aggiorna i tipi di notifica per includere check_in / check_out
alter table notifiche
  drop constraint if exists notifiche_tipo_check;

alter table notifiche
  add constraint notifiche_tipo_check
  check (tipo in (
    'turno_assegnato',
    'turno_modificato',
    'turno_eliminato',
    'settimana_pianificata',
    'check_in',
    'check_out'
  ));
