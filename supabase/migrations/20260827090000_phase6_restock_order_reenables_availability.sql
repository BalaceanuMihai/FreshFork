-- create_order() auto-hides a dish the moment it sells out:
--   is_available = case when quantity_available - v_qty <= 0 then false else is_available end
-- restock_order() is the other half of that — called by cancel_order() and
-- the expiry sweep whenever an order that reserved stock doesn't complete —
-- but it only ever credited quantity_available back. A dish that sold out,
-- got auto-hidden, and then had its stock returned (the customer cancelled,
-- or the checkout was abandoned and expired) stayed hidden forever: nothing
-- ever flips is_available back to true. The vendor sees stock in their
-- dashboard but the dish never reappears on /browse until they manually
-- re-toggle it — a silent, permanent loss of a listing neither side asked
-- for.
--
-- Only auto-restore when the item was actually at or below zero before this
-- credit — a vendor who paused a still-in-stock dish for their own reasons
-- must not have that overridden by an unrelated order's stock return.
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
  set quantity_available = mi.quantity_available + oi.quantity,
      is_available = case when mi.quantity_available <= 0 then true else mi.is_available end
  from public.order_items oi
  where oi.order_id = p_order_id
    and mi.id = oi.menu_item_id
    and mi.quantity_available is not null;

  perform set_config('freshfork.allow_order_write', 'on', true);
  update public.orders set stock_returned = true where id = p_order_id;
  perform set_config('freshfork.allow_order_write', 'off', true);
end;
$fn$;
