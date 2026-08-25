-- FreshFork — the ordering rules that only exist in SQL.
--
-- Run with `supabase test db`.
--
-- Covers the three things create_order() exists to guarantee: prices come from
-- the database and not the request, stock cannot be oversold, and an order
-- cannot be advanced by whoever feels like it.

begin;

-- The helpers below live in a `tests` schema. It has to exist, and the roles
-- we switch into have to be able to reach it — without the grants, the first
-- `tests.become(...)` call made *after* switching to `authenticated` fails with
-- "permission denied for schema tests" rather than running the assertion.
create schema if not exists tests;
select plan(28);

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

create or replace function tests.become_service() returns void as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$ language plpgsql;

grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Fixtures: one live kitchen, one customer, one rival customer
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'cook@test.local', '{"role":"vendor"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'eater@test.local', '{"role":"customer"}'::jsonb),
  ('66666666-6666-6666-6666-666666666666', 'nosy@test.local', '{"role":"customer"}'::jsonb);

insert into public.vendors (
  id, profile_id, business_name, handle, cuisine, timezone,
  status, stripe_connect_status, stripe_charges_enabled, stripe_account_id
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Cook One Kitchen', 'cook-one', 'Nigerian', 'Europe/London',
  'approved', 'complete', true, 'acct_test'
);

-- Two dishes: one scarce, one unlimited.
insert into public.menu_items (id, vendor_id, name, price_cents, quantity_available, allergens)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Jollof rice', 1600, 3, array['peanuts']),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Puff puff', 600, null, array['gluten']);

-- A pickup window on every day, so the test never depends on today's date.
insert into public.pickup_windows (id, vendor_id, day_of_week, start_time, end_time)
select
  ('dddddddd-dddd-dddd-dddd-00000000000' || d)::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  d, '18:00', '20:00'
from generate_series(0, 6) as d;

-- Tomorrow, comfortably past the default 60-minute lead time.
create or replace function tests.pickup_date() returns date as $$
  select (now() at time zone 'Europe/London')::date + 1;
$$ language sql stable;

create or replace function tests.window_for(p_date date) returns uuid as $$
  select id from public.pickup_windows
  where vendor_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and day_of_week = extract(dow from p_date)::int;
$$ language sql stable;

-- ---------------------------------------------------------------------------
-- Nobody may write orders directly
-- ---------------------------------------------------------------------------

select tests.become('33333333-3333-3333-3333-333333333333');

select throws_ok(
  $$ insert into public.orders (
       code, customer_id, vendor_id, pickup_at, pickup_ends_at,
       subtotal_cents, total_cents, vendor_payout_cents, platform_fee_bps
     ) values (
       'FF-HACKED', '33333333-3333-3333-3333-333333333333',
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       now() + interval '1 day', now() + interval '1 day 2 hours',
       1, 1, 1, 0
     ) $$,
  null,
  'a customer cannot insert an order directly'
);

-- ---------------------------------------------------------------------------
-- create_order: pricing comes from the database
-- ---------------------------------------------------------------------------

select lives_ok(
  format(
    $$ select public.create_order(
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
         '[{"menu_item_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","quantity":2}]'::jsonb,
         '%s', '%s', 'no onions'
       ) $$,
    tests.window_for(tests.pickup_date()), tests.pickup_date()
  ),
  'a customer can place a valid order'
);

select is(
  (select subtotal_cents from public.orders order by created_at desc limit 1),
  3200,
  'the subtotal is priced from the menu, not the request'
);

select is(
  (select service_fee_cents from public.orders order by created_at desc limit 1),
  160,
  'a non-Plus customer pays the 5% service fee'
);

select is(
  (select total_cents from public.orders order by created_at desc limit 1),
  3360,
  'the total is subtotal plus service fee'
);

select is(
  (select platform_fee_cents from public.orders order by created_at desc limit 1),
  384,
  'the platform takes 12% of the food'
);

select is(
  (select vendor_payout_cents from public.orders order by created_at desc limit 1),
  2816,
  'the cook is paid the food minus the commission'
);

select is(
  (select status::text from public.orders order by created_at desc limit 1),
  'pending_payment',
  'a new order is unpaid'
);

-- ---------------------------------------------------------------------------
-- Snapshots and stock
-- ---------------------------------------------------------------------------

select is(
  (select allergens_snapshot from public.order_items limit 1),
  array['peanuts'],
  'allergens are snapshotted onto the line item'
);

select is(
  (select quantity_available from public.menu_items
   where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'placing the order reserved two of the three portions'
);

-- The remaining portion cannot cover a request for two.
select throws_ok(
  format(
    $$ select public.create_order(
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
         '[{"menu_item_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","quantity":2}]'::jsonb,
         '%s', '%s', null
       ) $$,
    tests.window_for(tests.pickup_date()), tests.pickup_date()
  ),
  'Only 1 of Jollof rice left.',
  'the last portions cannot be oversold'
);

-- Taking the final portion marks the dish sold out.
select lives_ok(
  format(
    $$ select public.create_order(
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
         '[{"menu_item_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","quantity":1}]'::jsonb,
         '%s', '%s', null
       ) $$,
    tests.window_for(tests.pickup_date()), tests.pickup_date()
  ),
  'the final portion can be bought'
);

select is(
  (select is_available from public.menu_items
   where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  false,
  'running out marks the dish unavailable'
);

-- ---------------------------------------------------------------------------
-- Timing and ownership rules
-- ---------------------------------------------------------------------------

select throws_ok(
  format(
    $$ select public.create_order(
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
         '[{"menu_item_id":"cccccccc-cccc-cccc-cccc-cccccccccccc","quantity":1}]'::jsonb,
         '%s', '%s', null
       ) $$,
    tests.window_for(tests.pickup_date()), (tests.pickup_date() - 5)
  ),
  null,
  'a pickup date in the past is refused'
);

select throws_ok(
  $$ select public.create_order(
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '[]'::jsonb,
       'dddddddd-dddd-dddd-dddd-000000000001', current_date + 1, null
     ) $$,
  'Your basket is empty.',
  'an empty basket is refused'
);

select tests.become('11111111-1111-1111-1111-111111111111');

select throws_ok(
  format(
    $$ select public.create_order(
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
         '[{"menu_item_id":"cccccccc-cccc-cccc-cccc-cccccccccccc","quantity":1}]'::jsonb,
         '%s', '%s', null
       ) $$,
    tests.window_for(tests.pickup_date()), tests.pickup_date()
  ),
  'You cannot order from your own kitchen.',
  'a cook cannot order from themselves'
);

-- ---------------------------------------------------------------------------
-- Order visibility
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from public.orders),
  2,
  'the cook sees the orders placed with them'
);

select tests.become('66666666-6666-6666-6666-666666666666');

select is(
  (select count(*)::int from public.orders),
  0,
  'an unrelated customer sees no orders at all'
);

select is(
  (select count(*)::int from public.order_items),
  0,
  'an unrelated customer sees no line items either'
);

-- ---------------------------------------------------------------------------
-- State machine
-- ---------------------------------------------------------------------------

select tests.become_service();

-- Simulate the webhook confirming payment.
update public.orders set stripe_payment_intent_id = 'pi_test_1'
where code = (select code from public.orders order by created_at asc limit 1);

-- Capture the order id while we can still see it.
--
-- The obvious thing — looking it up inside the stranger's assertion below —
-- silently returns NULL, because RLS hides the row from them. That is exactly
-- the behaviour we want, but it makes the lookup useless for *building* the
-- call, and the test then fails on a uuid cast instead of on the policy it
-- meant to exercise. (It did, the first time this suite ran.)
create temp table ctx as
  select id as order_id from public.orders where stripe_payment_intent_id = 'pi_test_1';
grant all on ctx to authenticated, anon;

select lives_ok(
  $$ select public.mark_order_paid('pi_test_1', 'ch_test_1') $$,
  'the webhook can mark an order paid'
);

select is(
  (select status::text from public.orders where stripe_payment_intent_id = 'pi_test_1'),
  'paid',
  'payment moves the order to paid'
);

-- Idempotency: a redelivered event must not double-write the ledger.
select lives_ok(
  $$ select public.mark_order_paid('pi_test_1', 'ch_test_1') $$,
  'marking paid twice is harmless'
);

select is(
  (select count(*)::int from public.payout_ledger
   where kind = 'sale'
     and order_id = (select order_id from ctx)),
  1,
  'a replayed payment writes only one sale to the ledger'
);

-- A stranger cannot accept somebody else's order.
select tests.become('66666666-6666-6666-6666-666666666666');

select is(
  (select count(*)::int from public.orders where id = (select order_id from ctx)),
  0,
  'the stranger genuinely cannot see that order'
);

select throws_ok(
  format(
    $$ select public.advance_order_status('%s', 'accepted', null) $$,
    (select order_id from ctx)
  ),
  'That order is not yours to manage.',
  'a stranger cannot advance an order'
);

-- Nor can the cook skip straight past cooking it.
select tests.become('11111111-1111-1111-1111-111111111111');

select throws_ok(
  format(
    $$ select public.advance_order_status('%s', 'completed', null) $$,
    (select order_id from ctx)
  ),
  null,
  'an order cannot jump from paid straight to completed'
);

select lives_ok(
  format(
    $$ select public.advance_order_status('%s', 'accepted', null) $$,
    (select order_id from ctx)
  ),
  'the cook can accept a paid order'
);

-- ---------------------------------------------------------------------------
-- Cancelling returns the stock, exactly once
-- ---------------------------------------------------------------------------

select tests.become_service();

select is(
  (select stock_returned from public.orders where stripe_payment_intent_id = 'pi_test_1'),
  false,
  'stock is still reserved while the order is live'
);

select * from finish();
rollback;
