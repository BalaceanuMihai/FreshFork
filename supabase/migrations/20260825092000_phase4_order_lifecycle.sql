-- FreshFork Phase 4 — order lifecycle.
--
-- Every state change an order can undergo lives here as a security-definer
-- function, for one reason: stock, money and status have to move together or
-- not at all. A client that could UPDATE orders directly could accept its own
-- order, or decrement nothing while claiming a dish.
--
-- Two audiences:
--   * `authenticated` may call create_order, cancel_order and
--     advance_order_status — each re-derives the caller from auth.uid() and
--     refuses to act on somebody else's order.
--   * `service_role` may call the payment-result functions. Those are driven
--     by Stripe webhooks and must never be reachable from a browser: a client
--     that could call mark_order_paid() would eat for free.

-- ---------------------------------------------------------------------------
-- Fee configuration
-- ---------------------------------------------------------------------------
-- Fees live in the database rather than in the request, because create_order()
-- is reachable over PostgREST: anything passed in as an argument is something
-- the customer can choose for themselves, and "how big is my own service fee"
-- is not their call to make.

create table public.platform_settings (
  id boolean primary key default true check (id),
  platform_fee_bps integer not null default 1200
    check (platform_fee_bps between 0 and 10000),
  service_fee_bps integer not null default 500
    check (service_fee_bps between 0 and 10000),
  service_fee_min_cents integer not null default 99 check (service_fee_min_cents >= 0),
  service_fee_max_cents integer not null default 500 check (service_fee_max_cents >= 0),
  order_lead_minutes integer not null default 60 check (order_lead_minutes >= 0),
  max_pickup_days_ahead integer not null default 14 check (max_pickup_days_ahead between 1 and 90),
  pending_payment_ttl_minutes integer not null default 30 check (pending_payment_ttl_minutes >= 5),
  customer_cancel_cutoff_minutes integer not null default 120 check (customer_cancel_cutoff_minutes >= 0),
  max_open_checkouts integer not null default 3 check (max_open_checkouts >= 1),
  updated_at timestamptz not null default now(),
  constraint platform_settings_fee_range check (service_fee_max_cents >= service_fee_min_cents)
);

comment on table public.platform_settings is
  'Single-row marketplace configuration. Readable by everyone (checkout has to be able to quote a fee before it is charged); writable only by admins.';

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

create policy "platform_settings_select_all"
  on public.platform_settings for select
  to anon, authenticated
  using (true);

create policy "platform_settings_update_admin"
  on public.platform_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.platform_settings to anon, authenticated;
grant update on public.platform_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Plus status, with the same 14-day past_due grace the my_membership view
-- applies. Duplicated deliberately: create_order must not depend on a view
-- that filters by auth.uid(), because it also runs for a given customer id.
create or replace function public.has_plus_benefits(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(
    (
      select m.plan = 'plus'
         and not (
           m.status = 'past_due'
           and m.current_period_end is not null
           and m.current_period_end < now() - interval '14 days'
         )
      from public.memberships m
      where m.profile_id = p_profile_id
    ),
    false
  );
$fn$;

revoke all on function public.has_plus_benefits(uuid) from public, anon;
grant execute on function public.has_plus_benefits(uuid) to authenticated, service_role;

-- Return reserved portions to the menu. Idempotent via orders.stock_returned:
-- a cancel racing an expiry sweep must not credit the vendor twice.
create or replace function public.restock_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_returned boolean;
begin
  select stock_returned into v_returned
  from public.orders where id = p_order_id for update;

  if v_returned is null or v_returned then
    return;
  end if;

  update public.menu_items mi
  set quantity_available = mi.quantity_available + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id
    and mi.id = oi.menu_item_id
    and mi.quantity_available is not null;

  perform set_config('freshfork.allow_order_write', 'on', true);
  update public.orders set stock_returned = true where id = p_order_id;
  perform set_config('freshfork.allow_order_write', 'off', true);
end;
$fn$;

revoke all on function public.restock_order(uuid) from public, anon, authenticated;

create or replace function public.ledger_write(
  p_order_id uuid,
  p_vendor_id uuid,
  p_kind public.ledger_kind,
  p_amount_cents integer,
  p_currency text,
  p_stripe_object_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $fn$
  insert into public.payout_ledger
    (order_id, vendor_id, kind, amount_cents, currency, stripe_object_id, metadata)
  select p_order_id, p_vendor_id, p_kind, p_amount_cents,
         coalesce(p_currency, 'usd'), p_stripe_object_id, coalesce(p_metadata, '{}'::jsonb)
  where p_amount_cents <> 0
  on conflict (kind, stripe_object_id, order_id) do nothing;
$fn$;

revoke all on function public.ledger_write(uuid, uuid, public.ledger_kind, integer, text, text, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_order
-- ---------------------------------------------------------------------------
-- The only way an order comes into existence. Validates the vendor, resolves
-- the recurring pickup window into a real instant, re-prices every line from
-- the database, and decrements stock under a row lock — all in one
-- transaction, so an oversell is impossible rather than merely unlikely.
--
-- Prices are never taken from the caller. `p_items` carries ids and quantities
-- and nothing else.

create or replace function public.create_order(
  p_vendor_id uuid,
  p_items jsonb,
  p_pickup_window_id uuid,
  p_pickup_date date,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_customer uuid := auth.uid();
  v_settings public.platform_settings;
  v_vendor public.vendors;
  v_window public.pickup_windows;
  v_element jsonb;
  v_menu public.menu_items;
  v_qty integer;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_service_fee integer := 0;
  v_platform_fee integer;
  v_pickup_at timestamptz;
  v_pickup_ends timestamptz;
  v_open_checkouts integer;
  v_order public.orders;
begin
  if v_customer is null then
    raise exception 'Sign in before placing an order.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_settings from public.platform_settings where id;

  -- Vendor must be live *and* able to take money. is_live already implies a
  -- complete Connect account, but charges_enabled is checked explicitly so a
  -- restricted account cannot silently collect payments it cannot receive.
  select * into v_vendor from public.vendors where id = p_vendor_id;
  if not found then
    raise exception 'That kitchen no longer exists.' using errcode = 'no_data_found';
  end if;
  if not v_vendor.is_live then
    raise exception 'This kitchen is not taking orders right now.'
      using errcode = 'invalid_parameter_value';
  end if;
  if not v_vendor.stripe_charges_enabled then
    raise exception 'This kitchen cannot accept payment at the moment.'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_vendor.profile_id = v_customer then
    raise exception 'You cannot order from your own kitchen.'
      using errcode = 'invalid_parameter_value';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your basket is empty.' using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_array_length(p_items) > 25 then
    raise exception 'That is too many different dishes for one order.'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Abandoned checkouts hold stock hostage until the sweeper runs, so a
  -- customer may only have a few in flight at once.
  select count(*) into v_open_checkouts
  from public.orders
  where customer_id = v_customer
    and status = 'pending_payment'
    and created_at > now() - interval '1 hour';

  if v_open_checkouts >= v_settings.max_open_checkouts then
    raise exception 'You have unfinished checkouts. Complete or cancel one before starting another.'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Resolve the recurring weekly window against a concrete date, in the
  -- vendor's own timezone — 18:00 means 18:00 where the food is.
  select * into v_window
  from public.pickup_windows
  where id = p_pickup_window_id and vendor_id = p_vendor_id and is_active;

  if not found then
    raise exception 'That pickup time is no longer offered.'
      using errcode = 'invalid_parameter_value';
  end if;
  if extract(dow from p_pickup_date)::integer <> v_window.day_of_week then
    raise exception 'That date is not a % for this kitchen.', to_char(p_pickup_date, 'Day')
      using errcode = 'invalid_parameter_value';
  end if;

  v_pickup_at := (p_pickup_date + v_window.start_time) at time zone v_vendor.timezone;
  v_pickup_ends := (p_pickup_date + v_window.end_time) at time zone v_vendor.timezone;

  if v_pickup_at < now() + make_interval(mins => v_settings.order_lead_minutes) then
    raise exception 'Kitchens need at least % minutes notice.', v_settings.order_lead_minutes
      using errcode = 'invalid_parameter_value';
  end if;
  if v_pickup_at > now() + make_interval(days => v_settings.max_pickup_days_ahead) then
    raise exception 'You can only order up to % days ahead.', v_settings.max_pickup_days_ahead
      using errcode = 'invalid_parameter_value';
  end if;

  -- Price and reserve. FOR UPDATE serialises concurrent buyers of the last
  -- portion; a repeated dish id simply locks the same row again and sees its
  -- own decrement, so duplicates in the basket behave correctly.
  for v_element in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_element ->> 'quantity')::integer, 0);
    if v_qty < 1 or v_qty > 20 then
      raise exception 'Choose between 1 and 20 of each dish.'
        using errcode = 'invalid_parameter_value';
    end if;

    select * into v_menu
    from public.menu_items
    where id = (v_element ->> 'menu_item_id')::uuid
      and vendor_id = p_vendor_id
    for update;

    if not found then
      raise exception 'One of those dishes is no longer on the menu.'
        using errcode = 'no_data_found';
    end if;
    if not v_menu.is_available then
      raise exception '% is sold out.', v_menu.name using errcode = 'invalid_parameter_value';
    end if;

    if v_menu.quantity_available is not null then
      if v_menu.quantity_available < v_qty then
        raise exception 'Only % of % left.', v_menu.quantity_available, v_menu.name
          using errcode = 'invalid_parameter_value';
      end if;

      update public.menu_items
      set quantity_available = quantity_available - v_qty,
          is_available = case when quantity_available - v_qty <= 0 then false else is_available end
      where id = v_menu.id;
    end if;

    v_subtotal := v_subtotal + (v_menu.price_cents * v_qty);

    v_lines := v_lines || jsonb_build_object(
      'menu_item_id', v_menu.id,
      'name_snapshot', v_menu.name,
      'section_snapshot', v_menu.section,
      'unit_price_cents', v_menu.price_cents,
      'quantity', v_qty,
      'line_total_cents', v_menu.price_cents * v_qty,
      'allergens_snapshot', to_jsonb(v_menu.allergens),
      'dietary_snapshot', to_jsonb(v_menu.dietary_tags),
      'prep_note_snapshot', v_menu.prep_note
    );
  end loop;

  if v_subtotal <= 0 then
    raise exception 'Your basket is empty.' using errcode = 'invalid_parameter_value';
  end if;

  -- Plus waives the customer-side service fee. Determined here, from the
  -- membership table, never from anything the caller supplied.
  if not public.has_plus_benefits(v_customer) then
    v_service_fee := least(
      greatest(
        round(v_subtotal * v_settings.service_fee_bps / 10000.0)::integer,
        v_settings.service_fee_min_cents
      ),
      v_settings.service_fee_max_cents
    );
  end if;

  v_platform_fee := round(v_subtotal * v_settings.platform_fee_bps / 10000.0)::integer;

  perform set_config('freshfork.allow_order_write', 'on', true);

  insert into public.orders (
    code, customer_id, vendor_id, status,
    pickup_window_id, pickup_at, pickup_ends_at,
    subtotal_cents, service_fee_cents, platform_fee_cents,
    total_cents, vendor_payout_cents, platform_fee_bps,
    customer_note
  ) values (
    public.generate_order_code(), v_customer, p_vendor_id, 'pending_payment',
    p_pickup_window_id, v_pickup_at, v_pickup_ends,
    v_subtotal, v_service_fee, v_platform_fee,
    v_subtotal + v_service_fee, v_subtotal - v_platform_fee, v_settings.platform_fee_bps,
    nullif(left(coalesce(trim(p_note), ''), 500), '')
  )
  returning * into v_order;

  insert into public.order_items (
    order_id, menu_item_id, name_snapshot, section_snapshot,
    unit_price_cents, quantity, line_total_cents,
    allergens_snapshot, dietary_snapshot, prep_note_snapshot
  )
  select
    v_order.id,
    (line ->> 'menu_item_id')::uuid,
    line ->> 'name_snapshot',
    line ->> 'section_snapshot',
    (line ->> 'unit_price_cents')::integer,
    (line ->> 'quantity')::integer,
    (line ->> 'line_total_cents')::integer,
    coalesce(array(select jsonb_array_elements_text(line -> 'allergens_snapshot')), '{}'),
    coalesce(array(select jsonb_array_elements_text(line -> 'dietary_snapshot')), '{}'),
    line ->> 'prep_note_snapshot'
  from jsonb_array_elements(v_lines) as line;

  perform set_config('freshfork.allow_order_write', 'off', true);

  return v_order;
end;
$fn$;

revoke all on function public.create_order(uuid, jsonb, uuid, date, text) from public, anon;
grant execute on function public.create_order(uuid, jsonb, uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Payment results (service role only — driven by Stripe webhooks)
-- ---------------------------------------------------------------------------

create or replace function public.mark_order_paid(
  p_payment_intent_id text,
  p_charge_id text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders
  where stripe_payment_intent_id = p_payment_intent_id
  for update;

  if not found then
    return null;
  end if;

  -- Already applied. The webhook is de-duplicated upstream too, but a
  -- succeeded event can legitimately arrive after a manual reconciliation.
  if v_order.status <> 'pending_payment' then
    return v_order;
  end if;

  perform set_config('freshfork.allow_order_write', 'on', true);
  update public.orders
  set status = 'paid', paid_at = now(), stripe_charge_id = coalesce(p_charge_id, stripe_charge_id)
  where id = v_order.id
  returning * into v_order;
  perform set_config('freshfork.allow_order_write', 'off', true);

  -- Money moves: the vendor is credited the food, debited our cut; the
  -- customer-side service fee is platform revenue and carries no vendor.
  perform public.ledger_write(v_order.id, v_order.vendor_id, 'sale',
    v_order.subtotal_cents, v_order.currency, p_charge_id, '{}'::jsonb);
  perform public.ledger_write(v_order.id, v_order.vendor_id, 'platform_fee',
    -v_order.platform_fee_cents, v_order.currency, p_charge_id, '{}'::jsonb);
  perform public.ledger_write(v_order.id, null, 'service_fee',
    v_order.service_fee_cents, v_order.currency, p_charge_id, '{}'::jsonb);

  return v_order;
end;
$fn$;

create or replace function public.fail_order_payment(
  p_payment_intent_id text,
  p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders
  where stripe_payment_intent_id = p_payment_intent_id
  for update;

  if not found or v_order.status <> 'pending_payment' then
    return v_order;
  end if;

  perform public.restock_order(v_order.id);

  perform set_config('freshfork.allow_order_write', 'on', true);
  update public.orders
  set status = 'payment_failed',
      cancel_reason = left(coalesce(p_reason, 'Payment was declined.'), 300),
      canceled_at = now()
  where id = v_order.id
  returning * into v_order;
  perform set_config('freshfork.allow_order_write', 'off', true);

  return v_order;
end;
$fn$;

create or replace function public.record_order_refund(
  p_payment_intent_id text,
  p_refunded_total_cents integer,
  p_stripe_object_id text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_order public.orders;
  v_delta integer;
  v_fee_back integer;
begin
  select * into v_order from public.orders
  where stripe_payment_intent_id = p_payment_intent_id
  for update;

  if not found then
    return null;
  end if;

  -- Stripe reports the cumulative amount refunded, so the ledger entry is the
  -- difference against what we have already recorded.
  v_delta := greatest(p_refunded_total_cents - v_order.refunded_cents, 0);
  if v_delta = 0 then
    return v_order;
  end if;

  perform set_config('freshfork.allow_order_write', 'on', true);
  update public.orders
  set refunded_cents = least(p_refunded_total_cents, total_cents),
      status = case
        when p_refunded_total_cents >= total_cents
         and status in ('completed', 'ready', 'accepted', 'paid')
        then 'refunded'::public.order_status
        else status
      end
  where id = v_order.id
  returning * into v_order;
  perform set_config('freshfork.allow_order_write', 'off', true);

  perform public.ledger_write(v_order.id, v_order.vendor_id, 'refund',
    -v_delta, v_order.currency, p_stripe_object_id, '{}'::jsonb);

  -- A refund hands the platform fee back too, proportionally — we do not keep
  -- a commission on food that was never handed over.
  v_fee_back := round(v_order.platform_fee_cents * (v_delta::numeric / v_order.total_cents))::integer;
  perform public.ledger_write(v_order.id, v_order.vendor_id, 'fee_reversal',
    v_fee_back, v_order.currency, p_stripe_object_id, '{}'::jsonb);

  return v_order;
end;
$fn$;

create or replace function public.record_order_dispute(
  p_charge_id text,
  p_amount_cents integer,
  p_stripe_object_id text
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where stripe_charge_id = p_charge_id for update;
  if not found then
    return null;
  end if;

  perform set_config('freshfork.allow_order_write', 'on', true);
  update public.orders set disputed_at = now() where id = v_order.id returning * into v_order;
  perform set_config('freshfork.allow_order_write', 'off', true);

  perform public.ledger_write(v_order.id, v_order.vendor_id, 'dispute',
    -abs(p_amount_cents), v_order.currency, p_stripe_object_id, '{}'::jsonb);

  return v_order;
end;
$fn$;

create or replace function public.record_order_transfer(
  p_order_id uuid,
  p_amount_cents integer,
  p_transfer_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    return;
  end if;

  perform set_config('freshfork.allow_order_write', 'on', true);
  update public.orders set stripe_transfer_id = p_transfer_id where id = p_order_id;
  perform set_config('freshfork.allow_order_write', 'off', true);

  perform public.ledger_write(p_order_id, v_order.vendor_id, 'transfer',
    -abs(p_amount_cents), v_order.currency, p_transfer_id, '{}'::jsonb);
end;
$fn$;

-- Abandoned checkouts return their stock. Without this, one customer opening
-- checkout and walking away removes the last portion from sale indefinitely.
create or replace function public.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_settings public.platform_settings;
  v_order public.orders;
  v_count integer := 0;
begin
  select * into v_settings from public.platform_settings where id;

  for v_order in
    select * from public.orders
    where status = 'pending_payment'
      and created_at < now() - make_interval(mins => v_settings.pending_payment_ttl_minutes)
    for update skip locked
  loop
    perform public.restock_order(v_order.id);

    perform set_config('freshfork.allow_order_write', 'on', true);
    update public.orders
    set status = 'canceled',
        canceled_at = now(),
        cancel_reason = 'Checkout was not completed in time.'
    where id = v_order.id;
    perform set_config('freshfork.allow_order_write', 'off', true);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$fn$;

revoke all on function public.mark_order_paid(text, text) from public, anon, authenticated;
revoke all on function public.fail_order_payment(text, text) from public, anon, authenticated;
revoke all on function public.record_order_refund(text, integer, text) from public, anon, authenticated;
revoke all on function public.record_order_dispute(text, integer, text) from public, anon, authenticated;
revoke all on function public.record_order_transfer(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.expire_stale_orders() from public, anon, authenticated;

grant execute on function public.mark_order_paid(text, text) to service_role;
grant execute on function public.fail_order_payment(text, text) to service_role;
grant execute on function public.record_order_refund(text, integer, text) to service_role;
grant execute on function public.record_order_dispute(text, integer, text) to service_role;
grant execute on function public.record_order_transfer(uuid, integer, text) to service_role;
grant execute on function public.expire_stale_orders() to service_role;

-- ---------------------------------------------------------------------------
-- Human transitions
-- ---------------------------------------------------------------------------

-- The vendor's side of the order: accept, mark ready, hand over, or decline.
-- Only these transitions exist, so an order can never skip from paid straight
-- to completed and strand a customer with no notification.
create or replace function public.advance_order_status(
  p_order_id uuid,
  p_next public.order_status,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_order public.orders;
  v_is_vendor boolean;
  v_is_admin boolean := public.is_admin();
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'no_data_found';
  end if;

  select exists (
    select 1 from public.vendors v
    where v.id = v_order.vendor_id and v.profile_id = auth.uid()
  ) into v_is_vendor;

  if not v_is_vendor and not v_is_admin then
    raise exception 'That order is not yours to manage.' using errcode = 'insufficient_privilege';
  end if;

  if not (
       (v_order.status = 'paid'     and p_next in ('accepted', 'rejected'))
    or (v_order.status = 'accepted' and p_next in ('ready', 'rejected'))
    or (v_order.status = 'ready'    and p_next = 'completed')
  ) then
    raise exception 'An order that is % cannot become %.', v_order.status, p_next
      using errcode = 'invalid_parameter_value';
  end if;

  -- Declining releases the portions; the caller then refunds through Stripe,
  -- and the resulting charge.refunded webhook records the money side.
  if p_next = 'rejected' then
    perform public.restock_order(p_order_id);
  end if;

  perform set_config('freshfork.allow_order_write', 'on', true);
  update public.orders
  set status = p_next,
      vendor_note = coalesce(nullif(left(coalesce(trim(p_note), ''), 300), ''), vendor_note),
      accepted_at  = case when p_next = 'accepted'  then now() else accepted_at end,
      ready_at     = case when p_next = 'ready'     then now() else ready_at end,
      completed_at = case when p_next = 'completed' then now() else completed_at end,
      canceled_at  = case when p_next = 'rejected'  then now() else canceled_at end,
      canceled_by  = case when p_next = 'rejected'  then auth.uid() else canceled_by end,
      cancel_reason = case
        when p_next = 'rejected'
        then left(coalesce(nullif(trim(p_note), ''), 'The kitchen could not take this order.'), 300)
        else cancel_reason
      end
  where id = p_order_id
  returning * into v_order;
  perform set_config('freshfork.allow_order_write', 'off', true);

  return v_order;
end;
$fn$;

-- The customer's side. Allowed before the kitchen has committed, and up to a
-- configurable cutoff before pickup once it has — food already being cooked is
-- not refundable by unilateral cancel.
create or replace function public.cancel_order(
  p_order_id uuid,
  p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_order public.orders;
  v_settings public.platform_settings;
  v_is_admin boolean := public.is_admin();
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_settings from public.platform_settings where id;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'no_data_found';
  end if;

  if v_order.customer_id <> auth.uid() and not v_is_admin then
    raise exception 'That order is not yours.' using errcode = 'insufficient_privilege';
  end if;

  if v_order.status not in ('pending_payment', 'paid', 'accepted') then
    raise exception 'An order that is % can no longer be cancelled.', v_order.status
      using errcode = 'invalid_parameter_value';
  end if;

  if v_order.status = 'accepted'
     and not v_is_admin
     and v_order.pickup_at < now() + make_interval(mins => v_settings.customer_cancel_cutoff_minutes)
  then
    raise exception 'This order is already being prepared — contact the kitchen instead.'
      using errcode = 'invalid_parameter_value';
  end if;

  perform public.restock_order(p_order_id);

  perform set_config('freshfork.allow_order_write', 'on', true);
  update public.orders
  set status = 'canceled',
      canceled_at = now(),
      canceled_by = auth.uid(),
      cancel_reason = left(coalesce(nullif(trim(p_reason), ''), 'Cancelled by the customer.'), 300)
  where id = p_order_id
  returning * into v_order;
  perform set_config('freshfork.allow_order_write', 'off', true);

  return v_order;
end;
$fn$;

revoke all on function public.advance_order_status(uuid, public.order_status, text) from public, anon;
revoke all on function public.cancel_order(uuid, text) from public, anon;
grant execute on function public.advance_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
