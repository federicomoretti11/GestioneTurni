-- Grant permissions on dipendenti_custom to PostgREST roles.
-- apply_migration via MCP does not add default grants that supabase CLI would add,
-- so these must be explicit. Without them, the authenticated role cannot see the
-- table in the PostgREST schema cache (PGRST205).
GRANT SELECT, INSERT ON dipendenti_custom TO authenticated;
GRANT SELECT ON dipendenti_custom TO anon;
NOTIFY pgrst, 'reload schema';
