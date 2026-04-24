-- supabase/migrations/008_notifiche_turni_pubblicati.sql
-- Aggiunge il tipo notifica 'turni_pubblicati' per la conferma in blocco.

alter table notifiche drop constraint if exists notifiche_tipo_check;
alter table notifiche add constraint notifiche_tipo_check
  check (tipo in (
    'turno_assegnato',
    'turno_modificato',
    'turno_eliminato',
    'settimana_pianificata',
    'check_in',
    'check_out',
    'turni_pubblicati'
  ));
