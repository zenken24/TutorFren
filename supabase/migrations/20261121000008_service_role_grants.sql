-- Newer hosted Supabase projects no longer grant new tables to service_role automatically.
-- The Edge Functions and setup scripts run as service_role (server only), so grant it explicitly.
-- App users (anon/authenticated) are unchanged: they keep only the grants + RLS policies defined earlier.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
