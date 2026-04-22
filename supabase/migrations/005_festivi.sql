-- supabase/migrations/005_festivi.sql

-- Tabella festivi: nazionali (generati da algoritmo) + patronali/custom (aggiunti a mano dall'admin)
create table festivi (
  data date primary key,
  nome text not null,
  tipo text not null default 'nazionale' check (tipo in ('nazionale', 'patronale', 'custom')),
  created_at timestamptz not null default now()
);

create index festivi_data_idx on festivi(data);

alter table festivi enable row level security;

-- Tutti gli utenti autenticati possono leggere i festivi (serve ovunque per evidenziare maggiorazioni)
create policy "authenticated_festivi_select" on festivi
  for select using (auth.uid() is not null);

-- Solo admin può inserire / aggiornare / eliminare
create policy "admin_festivi_all" on festivi
  for all using (get_my_role() = 'admin');
