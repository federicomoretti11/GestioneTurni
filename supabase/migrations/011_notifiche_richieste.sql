-- supabase/migrations/011_notifiche_richieste.sql
-- Aggiunge i tipi notifica per il sistema richieste self-service.

alter table notifiche drop constraint if exists notifiche_tipo_check;
alter table notifiche add constraint notifiche_tipo_check
  check (tipo in (
    'turno_assegnato',
    'turno_modificato',
    'turno_eliminato',
    'settimana_pianificata',
    'check_in',
    'check_out',
    'turni_pubblicati',
    'richiesta_creata',
    'richiesta_approvata_manager',
    'richiesta_approvata',
    'richiesta_rifiutata',
    'richiesta_cancellata',
    'malattia_comunicata'
  ));
