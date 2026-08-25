-- FreshFork — make vendors.timezone trustworthy.
--
-- The column shipped with a `Europe/London` default and nothing that set it,
-- which turned out to be actively wrong: every seeded vendor is in Brooklyn.
-- A pickup window of "Sundays 18:00–20:00" was therefore being resolved five
-- hours away from the moment the cook actually meant.
--
-- Three changes:
--   1. The default becomes UTC — a neutral placeholder rather than a plausible
--      but incorrect locale. The address step now derives the real zone from
--      the geocoded coordinate (see src/lib/geo/timezone.ts).
--   2. A trigger validates the zone against pg_timezone_names, so a bad value
--      cannot reach the column at all.
--   3. The existing rows are corrected.

-- ---------------------------------------------------------------------------
-- 1. A default that does not pretend to know
-- ---------------------------------------------------------------------------

alter table public.vendors alter column timezone set default 'UTC';

comment on column public.vendors.timezone is
  'IANA zone used to resolve recurring pickup_windows into concrete timestamps. Derived from the geocoded pickup coordinate during onboarding; defaults to UTC only until the address step runs. Validated against pg_timezone_names.';

-- ---------------------------------------------------------------------------
-- 2. Reject anything Postgres cannot resolve
-- ---------------------------------------------------------------------------
-- The value now comes from a lookup table in application code, so the database
-- should not take its word for it. `at time zone <garbage>` throws at query
-- time — which would mean a broken checkout rather than a rejected write.

create or replace function public.vendors_guard_timezone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'INSERT' or new.timezone is distinct from old.timezone then
    if coalesce(trim(new.timezone), '') = '' then
      new.timezone := 'UTC';
    elsif not exists (
      select 1 from pg_timezone_names where name = new.timezone
    ) then
      raise exception '"%" is not a timezone this database recognises.', new.timezone
        using errcode = 'invalid_parameter_value';
    end if;
  end if;
  return new;
end;
$fn$;

create trigger vendors_guard_timezone
  before insert or update on public.vendors
  for each row execute function public.vendors_guard_timezone();

revoke all on function public.vendors_guard_timezone() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Correct the rows that are already wrong
-- ---------------------------------------------------------------------------
-- Values computed with the same tz-lookup table the application uses, from
-- each vendor's stored coordinate. All eight resolve to America/New_York;
-- they are listed individually rather than blanket-updated so the mapping is
-- auditable and this migration stays correct if run against another dataset.

update public.vendors set timezone = 'America/New_York'
where id in (
  'cb428051-3867-4d0b-8899-d878eeff2835',  -- amina-tesfaye,       40.68990, -73.97380
  'eef92eb4-01b2-48d3-bc86-229210665c2f',  -- jonah-bell,          40.72500, -73.95000
  '7c19b6b0-614a-45ac-aa2f-e51b69aa18b2',  -- marisol-villanueva,  40.67840, -73.99230
  'b125b6de-d85b-4b1d-a782-83addacf993b',  -- nadia-haddad,        40.68850, -73.98910
  'd054aef4-aef1-4628-a47d-0662c76abb29',  -- priya-raman,         40.68320, -73.96450
  '8fd810bb-f4d2-41b1-bba8-3d794686f769',  -- rosa-mendez,         40.68160, -73.97950
  'c9d1d4dc-6367-4550-a03a-d2bcb971ea20',  -- tomas-varga,         40.71320, -73.95560
  '4dbf6a09-356c-473a-9e78-c080ba47b83c'   -- wei-lin,             40.72110, -73.94970
)
and timezone = 'Europe/London';

-- Any vendor that still has no address cannot be live and cannot take orders,
-- so UTC is harmless for them until the address step fills it in.
update public.vendors
set timezone = 'UTC'
where location is null and timezone = 'Europe/London';
