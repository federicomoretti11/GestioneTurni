-- supabase/migrations/025_task_visibility_notification.sql
-- 1. Aggiunge sblocco_approvato, menzione_task, task_assegnato alla CHECK constraint notifiche
-- 2. Allarga visibilità task: tutti i membri del tenant vedono tutti i task (non solo i propri)
-- 3. Aggiorna policy commenti di conseguenza

-- =====================================================================
-- 1. Aggiorna CHECK constraint notifiche.tipo
-- =====================================================================
ALTER TABLE notifiche DROP CONSTRAINT IF EXISTS notifiche_tipo_check;
ALTER TABLE notifiche ADD CONSTRAINT notifiche_tipo_check
  CHECK (tipo IN (
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
    'malattia_comunicata',
    'sblocco_approvato',
    'menzione_task',
    'task_assegnato'
  ));

-- =====================================================================
-- 2. Visibilità task: tutti i membri del tenant vedono tutti i task
-- =====================================================================
DROP POLICY IF EXISTS "dipendente_tasks_select" ON tasks;
CREATE POLICY "dipendente_tasks_select" ON tasks FOR SELECT
  USING (tenant_id = get_my_tenant_id());

-- =====================================================================
-- 3. Commenti: tutti i membri del tenant possono leggere e scrivere
-- =====================================================================
DROP POLICY IF EXISTS "commenti_select" ON task_commenti;
CREATE POLICY "commenti_select" ON task_commenti FOR SELECT
  USING (task_in_my_tenant(task_id));

DROP POLICY IF EXISTS "commenti_insert" ON task_commenti;
CREATE POLICY "commenti_insert" ON task_commenti FOR INSERT
  WITH CHECK (
    autore_id = auth.uid()
    AND task_in_my_tenant(task_id)
  );
