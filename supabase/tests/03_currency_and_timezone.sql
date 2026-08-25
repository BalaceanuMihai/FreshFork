-- FreshFork — the two things that make this a European marketplace rather
-- than an American one with European names on it.
--
-- Run with `supabase test db`.
--
-- Both bugs these cover shipped and went unnoticed, because both produce
-- numbers that look entirely reasonable:
--
--   * every vendor defaulted to Europe/London while sitting in Brooklyn, so
--     pickup times were resolved five hours from where the food was;
--   * every order was denominated in dollars regardless of the kitchen, so a
--     Warsaw cook's 16.00 zloty dish was charged as 16.00 USD.

begin;

create schema if not exists tests;
select plan(10);

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

grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'cook@test.local', '{"role":"vendor"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'eater@test.local', '{"role":"customer"}'::jsonb);

-- Warsaw: zloty, and UTC+2 for most of the year rather than UTC+0.
insert into public.vendors (
  id, profile_id, business_name, handle, cuisine,
  timezone, currency, status, stripe_connect_status,
  stripe_charges_enabled, stripe_account_id
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Test Kitchen', 'tz-test-kitchen', 'Polish',
  'Europe/Warsaw', 'pln', 'approved', 'complete', true, 'acct_test'
);

insert into public.menu_items (id, vendor_id, name, price_cents, quantity_available, allergens)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Pierogi', 1600, 5, array['gluten']);

insert into public.pickup_windows (id, vendor_id, day_of_week, start_time, end_time)
select ('dddddddd-dddd-dddd-dddd-00000000000' || d)::uuid,
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', d, '18:00', '20:00'
from generate_series(0, 6) as d;

create or replace function tests.pd() returns date as $$
  select (now() at time zone 'Europe/Warsaw')::date + 1;
$$ language sql stable;

create or replace function tests.wf(p date) returns uuid as $$
  select id from public.pickup_windows
  where vendor_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and day_of_week = extract(dow from p)::int;
$$ language sql stable;

grant execute on all functions in schema tests to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Timezone validation
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update public.vendors set timezone = 'Middle/Earth' where handle = 'tz-test-kitchen' $$,
  null,
  'a timezone Postgres does not recognise is rejected at write time'
);

select lives_ok(
  $$ update public.vendors set timezone = 'Europe/Warsaw' where handle = 'tz-test-kitchen' $$,
  'a real IANA zone is accepted'
);

-- ---------------------------------------------------------------------------
-- Currency travels from the kitchen onto the order
-- ---------------------------------------------------------------------------

select tests.become('33333333-3333-3333-3333-333333333333');

select lives_ok(
  format(
    $$ select public.create_order(
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
         '[{"menu_item_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","quantity":2}]'::jsonb,
         '%s', '%s', null) $$,
    tests.wf(tests.pd()), tests.pd()
  ),
  'an order can be placed against a Warsaw kitchen'
);

select is(
  (select currency from public.orders order by created_at desc limit 1),
  'pln',
  'the order is billed in the kitchen currency, not a platform default'
);

select is(
  (select subtotal_cents from public.orders order by created_at desc limit 1),
  3200,
  'pricing is unaffected by the currency work'
);

select is(
  (select service_fee_cents from public.orders order by created_at desc limit 1),
  160,
  'the service fee still applies'
);

select is(
  (select total_cents from public.orders order by created_at desc limit 1),
  3360,
  'the total still adds up'
);

-- ---------------------------------------------------------------------------
-- Wall-clock times resolve through the kitchen's zone
-- ---------------------------------------------------------------------------
-- 18:00 in Warsaw is 16:00 UTC under CEST. Under the old Europe/London default
-- it would have resolved to 17:00 UTC — an hour of food going cold.

select is(
  (select to_char(pickup_at at time zone 'UTC', 'HH24:MI')
   from public.orders order by created_at desc limit 1),
  '16:00',
  'the local pickup time is converted using the kitchen timezone'
);

select is(
  (select to_char(pickup_at at time zone 'Europe/Warsaw', 'HH24:MI')
   from public.orders order by created_at desc limit 1),
  '18:00',
  'and reads back as the wall-clock time the cook actually set'
);

select is(
  (select to_char(pickup_ends_at at time zone 'Europe/Warsaw', 'HH24:MI')
   from public.orders order by created_at desc limit 1),
  '20:00',
  'the end of the window converts the same way'
);

select * from finish();
rollback;
