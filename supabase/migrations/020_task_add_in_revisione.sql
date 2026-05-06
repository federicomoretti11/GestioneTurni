-- supabase/migrations/020_task_add_in_revisione.sql
-- Aggiunge lo stato 'in_revisione' al board task (4ª colonna)

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_stato_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_stato_check
  CHECK (stato IN ('da_fare', 'in_corso', 'in_revisione', 'completato'));
