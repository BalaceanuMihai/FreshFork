-- FreshFork — RLS regression tests: identity, roles, and vendor listings.
--
-- Run with `supabase test db`.
--
-- These matter more than the TypeScript tests. The security model lives almost
-- entirely in RLS policies and security-definer triggers — code no compiler
-- checks, that fails at runtime, in production, silently, as data leakage.
-- Every policy is asserted in both directions: the allow *and* the deny.

begin;

-- The helpers below live in a `tests` schema. It has to exist, and the roles
-- we switch into have to be able to reach it — without the grants, the first
-- `tests.become(...)` call made *after* switching to `authenticated` fails with
-- "permission denied for schema tests" rather than running the assertion.
create schema if not exists tests;
select plan(24);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
-- Inserting into auth.users fires the on_auth_user_created trigger, which is
-- itself under test: it must clamp a self-assigned role.

create or replace function tests.become(p_uid uuid) returns void as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
    true
  );
end;
$$ language plpgsql;

create or replace function tests.become_anon() returns void as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$ language plpgsql;

create or replace function tests.become_service() returns void as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$ language plpgsql;

grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- Runs as the migration owner, so RLS does not apply to the setup itself.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'cook@test.local',
   '{"role": "vendor", "full_name": "Cook One"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'rival@test.local',
   '{"role": "vendor", "full_name": "Cook Two"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'eater@test.local',
   '{"role": "customer", "full_name": "Eater"}'::jsonb),
  -- Claims admin at signup. It must not get it.
  ('44444444-4444-4444-4444-444444444444', 'sneaky@test.local',
   '{"role": "admin", "full_name": "Sneaky"}'::jsonb),
  ('55555555-5555-5555-5555-555555555555', 'admin@test.local',
   '{"role": "customer", "full_name": "Real Admin"}'::jsonb);

-- The only way to become an admin: granted out of band.
update public.profiles set role = 'admin'
where id = '55555555-5555-5555-5555-555555555555';

-- ---------------------------------------------------------------------------
-- Signup role clamping
-- ---------------------------------------------------------------------------

select is(
  (select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'vendor',
  'signup honours a legitimately requested vendor role'
);

select is(
  (select role::text from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  'customer',
  'signup metadata claiming admin is clamped to customer'
);

-- Scoped to the fixtures rather than counting the whole table: these run
-- against whatever database you point them at, which may already have real
-- rows in it. An assertion that only passes on an empty database is a
-- test that will cry wolf the first time it matters.
select is(
  (select count(*)::int from public.profiles where id in (
    '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555')),
  5,
  'every auth user got exactly one profile'
);

-- ---------------------------------------------------------------------------
-- profiles RLS
-- ---------------------------------------------------------------------------

select tests.become('33333333-3333-3333-3333-333333333333');

select is(
  (select count(*)::int from public.profiles),
  1,
  'a customer sees only their own profile'
);

select is(
  (select count(*)::int from public.profiles
   where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'a customer cannot read another user''s profile'
);

-- Privilege escalation: the guard trigger silently keeps the old role rather
-- than erroring, so the update "succeeds" and changes nothing.
update public.profiles set role = 'admin'
where id = '33333333-3333-3333-3333-333333333333';

select is(
  (select role::text from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  'customer',
  'a user cannot promote themselves to admin'
);

update public.profiles set full_name = 'Eater Renamed'
where id = '33333333-3333-3333-3333-333333333333';

select is(
  (select full_name from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  'Eater Renamed',
  'an ordinary profile edit still succeeds'
);

select tests.become('55555555-5555-5555-5555-555555555555');

-- The customer above could see exactly one row. An admin sees all five
-- fixtures, which is the same query returning a different answer purely
-- because of who is asking.
select is(
  (select count(*)::int from public.profiles where id in (
    '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555')),
  5,
  'an admin sees every profile'
);

-- ---------------------------------------------------------------------------
-- vendors RLS and the derived is_live gate
-- ---------------------------------------------------------------------------

select tests.become('11111111-1111-1111-1111-111111111111');

insert into public.vendors (profile_id, business_name, handle, cuisine, timezone)
values ('11111111-1111-1111-1111-111111111111', 'Cook One Kitchen', 'cook-one', 'Nigerian', 'Europe/London');

select is(
  (select status::text from public.vendors where handle = 'cook-one'),
  'draft',
  'a new listing is born as a draft'
);

select is(
  (select is_live from public.vendors where handle = 'cook-one'),
  false,
  'a new listing is never born live'
);

-- Try to self-approve and self-complete Stripe in one go.
update public.vendors
set status = 'approved', stripe_connect_status = 'complete', is_live = true
where handle = 'cook-one';

select is(
  (select status::text from public.vendors where handle = 'cook-one'),
  'draft',
  'a vendor cannot approve their own listing'
);

select is(
  (select stripe_connect_status::text from public.vendors where handle = 'cook-one'),
  'not_started',
  'a vendor cannot fake their Stripe status'
);

select is(
  (select is_live from public.vendors where handle = 'cook-one'),
  false,
  'is_live cannot be written directly'
);

-- The one status transition a vendor is allowed, and only when complete.
select throws_ok(
  $$ select public.submit_vendor_for_review(
       (select id from public.vendors where handle = 'cook-one')) $$,
  'Add your pickup address before submitting.',
  'submitting without an address is refused'
);

-- ---------------------------------------------------------------------------
-- Cross-vendor isolation
-- ---------------------------------------------------------------------------

select tests.become('22222222-2222-2222-2222-222222222222');

insert into public.vendors (profile_id, business_name, handle, cuisine)
values ('22222222-2222-2222-2222-222222222222', 'Cook Two Kitchen', 'cook-two', 'Thai');

select is(
  (select count(*)::int from public.vendors where handle = 'cook-one'),
  0,
  'a vendor cannot see a rival''s draft listing'
);

update public.vendors set business_name = 'Stolen' where handle = 'cook-one';

select tests.become_service();
select is(
  (select business_name from public.vendors where handle = 'cook-one'),
  'Cook One Kitchen',
  'a vendor cannot edit a rival''s listing'
);

-- ---------------------------------------------------------------------------
-- Storage path ownership
-- ---------------------------------------------------------------------------
-- Storage RLS stops a vendor uploading outside their own prefix; this is the
-- other half — pointing a column at somebody else's object.

select tests.become('22222222-2222-2222-2222-222222222222');

select throws_ok(
  format(
    $$ update public.vendors set cert_doc_path = '%s/stolen.pdf' where handle = 'cook-two' $$,
    (select id from public.vendors where handle = 'cook-one')
  ),
  null,
  'a vendor cannot point cert_doc_path at another vendor''s folder'
);

select lives_ok(
  format(
    $$ update public.vendors set cert_doc_path = '%s/mine.pdf' where handle = 'cook-two' $$,
    (select id from public.vendors where handle = 'cook-two')
  ),
  'a vendor can reference a document in their own folder'
);

-- ---------------------------------------------------------------------------
-- Going live requires both gates
-- ---------------------------------------------------------------------------

select tests.become_service();

update public.vendors set status = 'approved' where handle = 'cook-one';

select is(
  (select is_live from public.vendors where handle = 'cook-one'),
  false,
  'admin approval alone does not make a kitchen live'
);

update public.vendors set stripe_connect_status = 'complete' where handle = 'cook-one';

select is(
  (select is_live from public.vendors where handle = 'cook-one'),
  true,
  'approval plus a complete Stripe account makes a kitchen live'
);

select isnt(
  (select verified_since from public.vendors where handle = 'cook-one'),
  null,
  'going live stamps verified_since'
);

-- Suspension takes it straight back off the marketplace.
update public.vendors set status = 'suspended' where handle = 'cook-one';

select is(
  (select is_live from public.vendors where handle = 'cook-one'),
  false,
  'suspension immediately delists a kitchen'
);

-- ---------------------------------------------------------------------------
-- Public visibility
-- ---------------------------------------------------------------------------

update public.vendors set status = 'approved' where handle = 'cook-one';

select tests.become_anon();

select is(
  (select count(*)::int from public.vendors where handle = 'cook-one'),
  1,
  'a signed-out visitor sees a live kitchen'
);

select is(
  (select count(*)::int from public.vendors where handle = 'cook-two'),
  0,
  'a signed-out visitor cannot see a draft kitchen'
);

select * from finish();
rollback;
