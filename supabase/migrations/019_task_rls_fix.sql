-- supabase/migrations/019_task_rls_fix.sql
-- Fix: infinite recursion in tasks <-> task_assegnazioni RLS policies
--
-- Il ciclo era:
--   tasks (dipendente_tasks_select) → task_assegnazioni → tasks → ...
-- Soluzione: due funzioni SECURITY DEFINER che leggono le tabelle
-- senza innescare la RLS (bypassa il loop).

-- =====================================================================
-- 1. FUNZIONI HELPER SECURITY DEFINER
-- =====================================================================

-- Controlla se il dipendente corrente è assegnato a un task
-- (legge task_assegnazioni senza trigger RLS)
CREATE OR REPLACE FUNCTION dipendente_assigned_to_task(p_task_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM task_assegnazioni
    WHERE task_id = p_task_id AND dipendente_id = auth.uid()
  )
$$;

-- Controlla se un task appartiene al tenant dell'utente corrente
-- (legge tasks senza trigger RLS)
CREATE OR REPLACE FUNCTION task_in_my_tenant(p_task_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks WHERE id = p_task_id AND tenant_id = get_my_tenant_id()
  )
$$;

-- =====================================================================
-- 2. RICREA POLICY tasks — spezza il ciclo con SECURITY DEFINER
-- =====================================================================

DROP POLICY IF EXISTS "dipendente_tasks_select" ON tasks;
CREATE POLICY "dipendente_tasks_select" ON tasks FOR SELECT
  USING (
    tenant_id = get_my_tenant_id()
    AND dipendente_assigned_to_task(id)
  );

DROP POLICY IF EXISTS "dipendente_tasks_update" ON tasks;
CREATE POLICY "dipendente_tasks_update" ON tasks FOR UPDATE
  USING (
    tenant_id = get_my_tenant_id()
    AND dipendente_assigned_to_task(id)
  )
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND dipendente_assigned_to_task(id)
  );

-- =====================================================================
-- 3. RICREA POLICY task_assegnazioni — usa SECURITY DEFINER per tasks
-- =====================================================================

DROP POLICY IF EXISTS "admin_manager_assegnazioni" ON task_assegnazioni;
CREATE POLICY "admin_manager_assegnazioni" ON task_assegnazioni FOR ALL
  USING (
    task_in_my_tenant(task_id)
    AND (
      get_is_super_admin()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin', 'manager'))
    )
  );

DROP POLICY IF EXISTS "dipendente_assegnazioni_select" ON task_assegnazioni;
CREATE POLICY "dipendente_assegnazioni_select" ON task_assegnazioni FOR SELECT
  USING (dipendente_id = auth.uid());

-- =====================================================================
-- 4. RICREA POLICY task_commenti — stessa soluzione
-- =====================================================================

DROP POLICY IF EXISTS "commenti_select" ON task_commenti;
CREATE POLICY "commenti_select" ON task_commenti FOR SELECT
  USING (
    task_in_my_tenant(task_id)
    AND (
      get_is_super_admin()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin', 'manager'))
      OR dipendente_assigned_to_task(task_id)
    )
  );

DROP POLICY IF EXISTS "commenti_insert" ON task_commenti;
CREATE POLICY "commenti_insert" ON task_commenti FOR INSERT
  WITH CHECK (
    autore_id = auth.uid()
    AND task_in_my_tenant(task_id)
    AND (
      get_is_super_admin()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin', 'manager'))
      OR dipendente_assigned_to_task(task_id)
    )
  );

DROP POLICY IF EXISTS "commenti_delete" ON task_commenti;
CREATE POLICY "commenti_delete" ON task_commenti FOR DELETE
  USING (
    autore_id = auth.uid()
    OR (
      task_in_my_tenant(task_id)
      AND (
        get_is_super_admin()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin', 'manager'))
      )
    )
  );
