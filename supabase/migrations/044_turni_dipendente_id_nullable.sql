-- supabase/migrations/044_turni_dipendente_id_nullable.sql
-- Rende dipendente_id nullable per permettere turni di dipendenti custom.
-- Il constraint check_dipendente_xor (aggiunto in 043) garantisce che
-- esattamente uno tra dipendente_id e dipendente_custom_id sia valorizzato.
ALTER TABLE turni ALTER COLUMN dipendente_id DROP NOT NULL;
