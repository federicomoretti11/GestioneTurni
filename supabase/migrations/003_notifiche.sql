-- supabase/migrations/003_notifiche.sql

create table notifiche (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references profiles(id) on delete cascade,
  tipo text not null check (tipo in ('turno_assegnato','turno_modificato','turno_eliminato','settimana_pianificata')),
  titolo text not null,
  messaggio text not null,
  turno_id uuid references turni(id) on delete cascade,
  data_turno date,
  letta boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifiche_destinatario_idx
  on notifiche(destinatario_id, letta, created_at desc);

alter table notifiche enable row level security;

-- Dipendente legge solo le proprie
create policy "notifiche_select_proprie" on notifiche
  for select using (destinatario_id = auth.uid());

-- Dipendente può marcare come letta le proprie
create policy "notifiche_update_proprie" on notifiche
  for update using (destinatario_id = auth.uid())
  with check (destinatario_id = auth.uid());

-- Insert solo server-side (service_role): nessuna policy INSERT per gli utenti

-- Abilita Realtime
alter publication supabase_realtime add table notifiche;
