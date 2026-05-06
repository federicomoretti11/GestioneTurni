-- supabase/migrations/019_task_management.sql
-- Task management: kanban board per admin, manager e dipendente

CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titolo      TEXT NOT NULL,
  descrizione TEXT,
  stato       TEXT NOT NULL DEFAULT 'da_fare' CHECK (stato IN ('da_fare', 'in_corso', 'completato')),
  priorita    TEXT NOT NULL DEFAULT 'media' CHECK (priorita IN ('bassa', 'media', 'alta')),
  scadenza    DATE,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_assegnazioni (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dipendente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(task_id, dipendente_id)
);

CREATE TABLE task_commenti (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  autore_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  testo      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assegnazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_commenti ENABLE ROW LEVEL SECURITY;

-- Admin e Manager: accesso completo ai task del proprio tenant
CREATE POLICY "admin_manager_tasks" ON tasks FOR ALL
  USING (
    tenant_id = get_my_tenant_id()
    AND (
      get_is_super_admin()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin', 'manager'))
    )
  );

-- Dipendente: vede solo i task a lui assegnati
CREATE POLICY "dipendente_tasks_select" ON tasks FOR SELECT
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM task_assegnazioni
      WHERE task_id = tasks.id AND dipendente_id = auth.uid()
    )
  );

-- Dipendente: può aggiornare lo stato dei task assegnati a lui
CREATE POLICY "dipendente_tasks_update" ON tasks FOR UPDATE
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM task_assegnazioni
      WHERE task_id = tasks.id AND dipendente_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM task_assegnazioni
      WHERE task_id = tasks.id AND dipendente_id = auth.uid()
    )
  );

-- task_assegnazioni: admin/manager gestiscono, dipendente legge le proprie
CREATE POLICY "admin_manager_assegnazioni" ON task_assegnazioni FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
        AND t.tenant_id = get_my_tenant_id()
        AND (
          get_is_super_admin()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin', 'manager'))
        )
    )
  );

CREATE POLICY "dipendente_assegnazioni_select" ON task_assegnazioni FOR SELECT
  USING (dipendente_id = auth.uid());

-- task_commenti: leggono tutti i partecipanti (admin/manager/assegnati)
CREATE POLICY "commenti_select" ON task_commenti FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_id AND t.tenant_id = get_my_tenant_id()
      AND (
        get_is_super_admin()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin', 'manager'))
        OR EXISTS (SELECT 1 FROM task_assegnazioni WHERE task_id = t.id AND dipendente_id = auth.uid())
      )
    )
  );

-- Scrivono tutti i partecipanti
CREATE POLICY "commenti_insert" ON task_commenti FOR INSERT
  WITH CHECK (
    autore_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_id AND t.tenant_id = get_my_tenant_id()
      AND (
        get_is_super_admin()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin', 'manager'))
        OR EXISTS (SELECT 1 FROM task_assegnazioni WHERE task_id = t.id AND dipendente_id = auth.uid())
      )
    )
  );

-- Eliminano chi ha scritto o admin/manager
CREATE POLICY "commenti_delete" ON task_commenti FOR DELETE
  USING (
    autore_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_id AND t.tenant_id = get_my_tenant_id()
      AND (
        get_is_super_admin()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin', 'manager'))
      )
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();
