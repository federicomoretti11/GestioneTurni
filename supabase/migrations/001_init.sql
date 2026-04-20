-- supabase/migrations/001_init.sql
-- NOTA: Questo file va eseguito manualmente nel SQL Editor di Supabase Dashboard
-- https://supabase.com/dashboard → SQL Editor → New query → incolla e clicca Run

-- Enum per i ruoli
create type ruolo_utente as enum ('admin', 'manager', 'dipendente');

-- Tabella reparti (prima di profiles perché profiles la referenzia)
create table reparti (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  manager_id uuid,
  created_at timestamptz not null default now()
);

-- Tabella profiles (estende auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  cognome text not null,
  ruolo ruolo_utente not null default 'dipendente',
  reparto_id uuid references reparti(id) on delete set null,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

-- FK da reparti a profiles (aggiunta dopo perché profiles era da creare prima)
alter table reparti
  add constraint fk_reparti_manager
  foreign key (manager_id) references profiles(id) on delete set null;

-- Tabella turni_template
create table turni_template (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ora_inizio time not null,
  ora_fine time not null,
  colore text not null default '#3b82f6',
  created_at timestamptz not null default now()
);

-- Tabella turni
create table turni (
  id uuid primary key default gen_random_uuid(),
  dipendente_id uuid not null references profiles(id) on delete cascade,
  template_id uuid references turni_template(id) on delete set null,
  data date not null,
  ora_inizio time not null,
  ora_fine time not null,
  note text,
  creato_da uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger per aggiornare updated_at automaticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger turni_updated_at
  before update on turni
  for each row execute function update_updated_at();

-- Trigger per creare il profilo automaticamente dopo la registrazione
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nome, cognome, ruolo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'cognome', ''),
    coalesce((new.raw_user_meta_data->>'ruolo')::ruolo_utente, 'dipendente')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
