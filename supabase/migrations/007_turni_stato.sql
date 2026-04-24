-- supabase/migrations/007_turni_stato.sql
-- Aggiunge lo stato bozza/confermato ai turni e aggiorna la RLS
-- del dipendente per non esporgli mai le bozze.

create type stato_turno as enum ('bozza', 'confermato');

alter table turni
  add column stato stato_turno not null default 'confermato';

create index idx_turni_stato_data on turni(stato, data);

-- Dipendente: vede solo i propri turni CONFERMATI.
drop policy "dipendente_turni_select" on turni;
create policy "dipendente_turni_select" on turni
  for select using (
    get_my_role() = 'dipendente'
    and dipendente_id = auth.uid()
    and stato = 'confermato'
  );
