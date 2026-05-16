-- Grant permissions on dipendenti_custom to PostgREST roles.
-- apply_migration via MCP does not add default grants that supabase CLI would add,
-- so these must be explicit.
--
-- KEY: authenticator has NOINHERIT on Supabase, so it does NOT inherit grants
-- from authenticated/anon. PostgREST builds its schema cache as authenticator,
-- so without a direct grant to authenticator the table is invisible (PGRST205).
-- Supabase CLI migration adds this automatically; MCP apply_migration does not.
GRANT SELECT, INSERT ON dipendenti_custom TO authenticated;
GRANT SELECT ON dipendenti_custom TO anon;
GRANT SELECT, INSERT ON dipendenti_custom TO authenticator;
NOTIFY pgrst, 'reload schema';
