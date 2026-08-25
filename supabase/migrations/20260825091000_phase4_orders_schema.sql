-- FreshFork Phase 4 — the ordering domain.
--
-- Shape notes:
--   * One order belongs to exactly one vendor. A basket spanning two kitchens
--     is two orders — pickup is physical, so there is no such thing as a
--     combined handover, and it keeps payouts one-transfer-per-order.
--   * order_items snapshot name, price and allergens. A vendor renaming a dish
--     or changing its price must never rewrite what somebody already bought,
--     and allergens in particular are a safety record.
--   * Money is only ever integer cents. No floats anywhere in this file.
--   * `authenticated` gets SELECT and nothing else. Every write goes through a
--     security-definer RPC or the service role, the same posture Phase 2 used
--     for vendors.status and Phase 4 used for memberships.

-- Pickup times are wall-clock in the vendor's own city; without this we cannot
-- turn "Tuesday, 18:00–20:00" into an instant.
alter table public.vendors
  add column if not exists timezone text not null default 'Europe/London';

comment on column public.vendors.timezone is
  'IANA zone used to resolve recurring pickup_windows into concrete timestamps. Set from the geocoded address.';

create type public.order_status as enum (
  'pending_payment',  -- created, PaymentIntent not yet succeeded
  'payment_failed',   -- card declined; stock has been returned
  'paid',             -- money captured, awaiting the vendor's decision
  'accepted',         -- vendor is cooking
  'ready',            -- waiting at the pickup point
  'completed',        -- handed over
  'rejected',         -- vendor declined; refunded
  'canceled',         -- customer or system cancelled; refunded if it was paid
  'refunded'          -- refunded after completion (admin/dispute)
);

create type public.refund_state as enum ('none', 'partial', 'full');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  vendor_id uuid not null references public.vendors (id) on delete restrict,

  status public.order_status not null default 'pending_payment',

  -- Pickup slot, resolved from a recurring window into a real instant.
  pickup_window_id uuid references public.pickup_windows (id) on delete set null,
  pickup_at timestamptz not null,
  pickup_ends_at timestamptz not null,

  -- Money. subtotal is the vendor's food; service_fee is what the customer
  -- pays FreshFork; platform_fee is FreshFork's cut of the vendor's food.
  currency text not null default 'usd',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  service_fee_cents integer not null default 0 check (service_fee_cents >= 0),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  vendor_payout_cents integer not null check (vendor_payout_cents >= 0),
  platform_fee_bps integer not null check (platform_fee_bps between 0 and 10000),

  customer_note text,
  vendor_note text,

  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  stripe_transfer_id text,
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  refund_state public.refund_state not null default 'none',
  disputed_at timestamptz,

  canceled_by uuid references public.profiles (id) on delete set null,
  cancel_reason text,

  -- Reserved stock is returned exactly once, whichever path ends the order
  -- (decline, cancel, expiry). Without the flag a cancel-after-expiry would
  -- hand the vendor back the same portions twice.
  stock_returned boolean not null default false,

  paid_at timestamptz,
  accepted_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_totals_add_up
    check (total_cents = subtotal_cents + service_fee_cents),
  constraint orders_payout_adds_up
    check (vendor_payout_cents = subtotal_cents - platform_fee_cents),
  constraint orders_refund_within_total
    check (refunded_cents <= total_cents),
  constraint orders_pickup_window_order
    check (pickup_ends_at > pickup_at)
);

comment on table public.orders is
  'One pickup order against one vendor. Rows are created by create_order() and only ever advanced by the lifecycle RPCs or the Stripe webhook — authenticated clients have SELECT only.';

create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_vendor_idx on public.orders (vendor_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_pickup_idx on public.orders (vendor_id, pickup_at) where status in ('paid', 'accepted', 'ready');
create index orders_payment_intent_idx on public.orders (stripe_payment_intent_id);
-- Drives expire_stale_orders() without scanning the whole table.
create index orders_pending_idx on public.orders (created_at) where status = 'pending_payment';

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Kept for analytics, but nulled rather than blocking a vendor from tidying
  -- their menu. The snapshot columns are what the order actually means.
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name_snapshot text not null,
  section_snapshot text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_cents integer not null check (line_total_cents >= 0),
  allergens_snapshot text[] not null default '{}',
  dietary_snapshot text[] not null default '{}',
  prep_note_snapshot text,
  created_at timestamptz not null default now(),

  constraint order_items_line_total_adds_up
    check (line_total_cents = unit_price_cents * quantity)
);

comment on table public.order_items is
  'Immutable line items. name/price/allergens are snapshots — a later menu edit must not rewrite a past order, least of all its allergen record.';

create index order_items_order_idx on public.order_items (order_id);
create index order_items_menu_item_idx on public.order_items (menu_item_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "orders_select_customer"
  on public.orders for select
  to authenticated
  using (customer_id = auth.uid());

create policy "orders_select_vendor_or_admin"
  on public.orders for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.profile_id = auth.uid()
    )
  );

-- No insert/update/delete policies: create_order(), the lifecycle RPCs and the
-- webhook (service role) are the only writers.

create policy "order_items_select_participants"
  on public.order_items for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1 from public.vendors v
          where v.id = o.vendor_id and v.profile_id = auth.uid()
        )
      )
  ));

grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

-- Short, unambiguous, and safe to read aloud at a pickup counter: no vowels
-- (so no accidental words) and no 0/O/1/I.
create or replace function public.generate_order_code()
returns text
language sql
volatile
set search_path = public, pg_temp
as $fn$
  select 'FF-' || string_agg(
    substr('23456789BCDFGHJKLMNPQRSTVWXZ', 1 + floor(random() * 28)::integer, 1),
    ''
  )
  from generate_series(1, 6);
$fn$;

revoke all on function public.generate_order_code() from public, anon, authenticated;

create or replace function public.orders_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  -- Only create_order() (which sets the flag) or the service role may insert.
  if auth.uid() is not null
     and coalesce(current_setting('freshfork.allow_order_write', true), '') <> 'on'
  then
    raise exception 'Orders are created through create_order().'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(new.code), '') = '' then
    new.code := public.generate_order_code();
  end if;

  new.status := coalesce(new.status, 'pending_payment');
  new.refunded_cents := 0;
  new.refund_state := 'none';
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger orders_guard_insert
  before insert on public.orders
  for each row execute function public.orders_guard_insert();

create or replace function public.orders_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if auth.uid() is not null
     and coalesce(current_setting('freshfork.allow_order_write', true), '') <> 'on'
  then
    raise exception 'Orders are advanced through the order lifecycle functions.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Immutable for everyone, service role included: rewriting who bought what,
  -- from whom, or for how much would destroy the financial record.
  new.id := old.id;
  new.code := old.code;
  new.customer_id := old.customer_id;
  new.vendor_id := old.vendor_id;
  new.subtotal_cents := old.subtotal_cents;
  new.service_fee_cents := old.service_fee_cents;
  new.platform_fee_cents := old.platform_fee_cents;
  new.total_cents := old.total_cents;
  new.vendor_payout_cents := old.vendor_payout_cents;
  new.platform_fee_bps := old.platform_fee_bps;
  new.currency := old.currency;
  new.created_at := old.created_at;
  new.updated_at := now();

  new.refund_state := case
    when new.refunded_cents <= 0 then 'none'::public.refund_state
    when new.refunded_cents >= new.total_cents then 'full'::public.refund_state
    else 'partial'::public.refund_state
  end;

  return new;
end;
$fn$;

create trigger orders_guard_update
  before update on public.orders
  for each row execute function public.orders_guard_update();

-- Line items are written once, inside create_order(), and never again.
create or replace function public.order_items_immutable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null
       and coalesce(current_setting('freshfork.allow_order_write', true), '') <> 'on'
    then
      raise exception 'Order items are created through create_order().'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  raise exception 'Order items are immutable.' using errcode = 'insufficient_privilege';
end;
$fn$;

create trigger order_items_immutable
  before insert or update or delete on public.order_items
  for each row execute function public.order_items_immutable();

revoke all on function public.orders_guard_insert() from public, anon, authenticated;
revoke all on function public.orders_guard_update() from public, anon, authenticated;
revoke all on function public.order_items_immutable() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Payout ledger
-- ---------------------------------------------------------------------------
-- Stripe knows the truth about money movement, but reconciling a vendor's
-- question ("why is this payout smaller?") against the Stripe dashboard alone
-- is miserable. Every money event gets a signed row here as it happens.

create type public.ledger_kind as enum (
  'sale',           -- + gross the customer paid for food
  'service_fee',    -- + customer-side FreshFork fee (platform revenue)
  'platform_fee',   -- − FreshFork's cut of the vendor's food
  'transfer',       -- − moved to the vendor's connected account
  'refund',         -- − returned to the customer
  'fee_reversal',   -- + platform fee handed back on a refund
  'dispute',        -- − chargeback held
  'adjustment'      -- manual correction
);

create table public.payout_ledger (
  id bigint generated always as identity primary key,
  order_id uuid references public.orders (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete set null,
  kind public.ledger_kind not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  stripe_object_id text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (kind, stripe_object_id, order_id)
);

comment on table public.payout_ledger is
  'Signed, append-only money events. Positive credits the vendor, negative debits. Written only by the Stripe webhook via the service role.';

create index payout_ledger_vendor_idx on public.payout_ledger (vendor_id, occurred_at desc);
create index payout_ledger_order_idx on public.payout_ledger (order_id);

alter table public.payout_ledger enable row level security;

create policy "payout_ledger_select_vendor_or_admin"
  on public.payout_ledger for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.profile_id = auth.uid()
    )
  );

grant select on public.payout_ledger to authenticated;

create or replace view public.vendor_balances as
select
  v.id as vendor_id,
  coalesce(sum(l.amount_cents) filter (where l.kind in ('sale', 'fee_reversal', 'adjustment')), 0)::bigint as credited_cents,
  coalesce(sum(-l.amount_cents) filter (where l.kind in ('platform_fee', 'refund', 'dispute')), 0)::bigint as debited_cents,
  coalesce(sum(-l.amount_cents) filter (where l.kind = 'transfer'), 0)::bigint as transferred_cents,
  coalesce(sum(l.amount_cents), 0)::bigint as balance_cents
from public.vendors v
left join public.payout_ledger l on l.vendor_id = v.id
where v.profile_id = auth.uid() or public.is_admin()
group by v.id;

alter view public.vendor_balances set (security_invoker = on);
grant select on public.vendor_balances to authenticated;
