-- supabase/migrations/002_rls.sql

-- Abilita RLS su tutte le tabelle
alter table profiles enable row level security;
alter table reparti enable row level security;
alter table turni_template enable row level security;
alter table turni enable row level security;

-- Helper function per ottenere il ruolo dell'utente corrente
create or replace function get_my_role()
returns ruolo_utente as $$
  select ruolo from profiles where id = auth.uid();
$$ language sql security definer stable
   set search_path = public, pg_temp;

-- Helper function per ottenere il reparto_id dell'utente corrente
create or replace function get_my_reparto()
returns uuid as $$
  select reparto_id from profiles where id = auth.uid();
$$ language sql security definer stable
   set search_path = public, pg_temp;

-- === PROFILES ===
-- Admin: vede tutto
create policy "admin_profiles_all" on profiles
  for all using (get_my_role() = 'admin');

-- Manager: vede i profili del proprio reparto
create policy "manager_profiles_select" on profiles
  for select using (
    get_my_role() = 'manager' and
    (reparto_id = get_my_reparto() or id = auth.uid())
  );

-- Dipendente: vede solo se stesso
create policy "dipendente_profiles_select" on profiles
  for select using (id = auth.uid());

-- === REPARTI ===
create policy "admin_reparti_all" on reparti
  for all using (get_my_role() = 'admin');

create policy "manager_reparti_select" on reparti
  for select using (
    get_my_role() = 'manager' and id = get_my_reparto()
  );

create policy "dipendente_reparti_select" on reparti
  for select using (
    get_my_role() = 'dipendente' and id = get_my_reparto()
  );

-- === TURNI_TEMPLATE ===
-- Tutti i ruoli autenticati possono leggere i template
create policy "authenticated_template_select" on turni_template
  for select using (auth.uid() is not null);

-- Solo admin e manager possono modificare
create policy "admin_manager_template_all" on turni_template
  for all using (get_my_role() in ('admin', 'manager'));

-- === TURNI ===
create policy "admin_turni_all" on turni
  for all using (get_my_role() = 'admin');

-- Manager: gestisce i turni del proprio reparto
create policy "manager_turni_all" on turni
  for all using (
    get_my_role() = 'manager' and
    dipendente_id in (
      select id from profiles where reparto_id = get_my_reparto()
    )
  );

-- Dipendente: vede solo i propri turni
create policy "dipendente_turni_select" on turni
  for select using (
    get_my_role() = 'dipendente' and dipendente_id = auth.uid()
  );
