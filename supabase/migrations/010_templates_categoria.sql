-- supabase/migrations/010_templates_categoria.sql

create type categoria_template as enum ('lavoro','ferie','permesso','malattia');

alter table turni_template
  add column categoria categoria_template not null default 'lavoro';
