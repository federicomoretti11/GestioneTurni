-- supabase/migrations/009_richieste.sql

create type tipo_richiesta as enum ('ferie','permesso','malattia','cambio_turno');
create type stato_richiesta as enum ('pending','approvata_manager','approvata','rifiutata','annullata','comunicata');
create type permesso_tipo as enum ('giornata','mezza_mattina','mezza_pomeriggio','ore');

create table richieste (
  id                    uuid primary key default gen_random_uuid(),
  dipendente_id         uuid not null references profiles(id) on delete cascade,
  tipo                  tipo_richiesta not null,
  data_inizio           date not null,
  data_fine             date,
  permesso_tipo         permesso_tipo,
  ora_inizio            time,
  ora_fine              time,
  turno_id              uuid references turni(id) on delete set null,
  stato                 stato_richiesta not null default 'pending',
  note_dipendente       text,
  motivazione_decisione text,
  manager_id            uuid references profiles(id),
  manager_decisione_at  timestamptz,
  admin_id              uuid references profiles(id),
  admin_decisione_at    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_richieste_dipendente on richieste(dipendente_id, created_at desc);
create index idx_richieste_stato on richieste(stato) where stato in ('pending','approvata_manager');
create index idx_richieste_tipo_data on richieste(tipo, data_inizio);

create trigger richieste_updated_at
  before update on richieste
  for each row execute function update_updated_at();

-- RLS
alter table richieste enable row level security;

-- Dipendente: vede e crea solo le proprie
create policy "dipendente_select_proprie" on richieste
  for select using (dipendente_id = auth.uid());

create policy "dipendente_insert" on richieste
  for insert with check (dipendente_id = auth.uid());

-- Dipendente: UPDATE solo per annullare (pending → annullata)
create policy "dipendente_annulla" on richieste
  for update using (
    dipendente_id = auth.uid()
    and stato = 'pending'
  ) with check (
    dipendente_id = auth.uid()
    and stato in ('pending', 'annullata')
  );

-- Manager/Admin: vedono tutto
create policy "staff_select_all" on richieste
  for select using (get_my_role() in ('admin','manager'));

-- Manager/Admin: UPDATE per transizioni stato
create policy "staff_update" on richieste
  for update using (
    get_my_role() in ('admin','manager')
  ) with check (
    get_my_role() in ('admin','manager')
  );

-- Admin: DELETE
create policy "admin_delete" on richieste
  for delete using (get_my_role() = 'admin');

-- Realtime
alter publication supabase_realtime add table richieste;
