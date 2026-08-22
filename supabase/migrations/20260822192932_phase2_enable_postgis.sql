-- PostGIS powers vendor proximity search (ST_DWithin / ST_Distance).
-- Supabase convention: extensions live in their own schema, not public.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

grant usage on schema extensions to anon, authenticated, service_role;
