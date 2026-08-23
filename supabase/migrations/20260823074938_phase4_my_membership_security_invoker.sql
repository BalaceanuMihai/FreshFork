-- The view defaults to running as its owner, which owns profiles/memberships
-- and therefore bypasses their RLS entirely — the `where p.id = auth.uid()`
-- filter would still scope it correctly, but security_invoker makes the
-- underlying tables' RLS authoritative too, belt and braces (advisor 0010).
alter view public.my_membership set (security_invoker = on);
