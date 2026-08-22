-- Trigger functions never need to be callable over PostgREST; the triggers
-- themselves run as the table owner. Revoking EXECUTE keeps them off
-- /rest/v1/rpc/... (Supabase security advisor 0028/0029).
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.profiles_guard_update() from public, anon, authenticated;

-- Unused by the app: the role is read from the profiles row instead, so this
-- extra RPC surface buys nothing.
drop function if exists public.current_user_role();
