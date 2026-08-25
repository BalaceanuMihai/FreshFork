-- FreshFork — move the marketplace to the market it was built for.
--
-- The geocoder has always been scoped to Europe (`bbox=-25,34,45,71` in
-- src/lib/mapbox/geocode.ts) while every seeded vendor sat in Brooklyn. The
-- practical effect was that a real cook in any of these cities could not find
-- their own address in autocomplete, and the vendors on the marketplace could
-- never have been found by the customers it geocodes for.
--
-- The vendors are RELOCATED rather than replaced: three of them are referenced
-- by the retired orders (`orders_legacy_20260823`), and their profiles, menus
-- and pickup windows are all still perfectly good. Only the address, the
-- coordinate, the timezone and the currency change.
--
-- Currency arrives with the addresses. A marketplace spanning Bucharest and
-- Stockholm cannot bill everyone in dollars, and `orders.currency` already
-- existed for exactly this reason — it was simply never set from anything.

-- ---------------------------------------------------------------------------
-- 1. Currency belongs to the kitchen
-- ---------------------------------------------------------------------------
-- Per-vendor rather than per-platform: a cook is paid out in the currency of
-- the country they cook in, and the customer should see the price they will
-- actually be charged. `create_order()` copies it onto the order, which then
-- freezes it — an order's currency must never move after the fact.

alter table public.vendors
  add column if not exists currency text not null default 'eur';

comment on column public.vendors.currency is
  'ISO 4217, lowercase, as Stripe expects it. Set from the country of the pickup address. Copied onto each order at checkout and immutable thereafter.';

alter table public.vendors
  add constraint vendors_currency_format check (currency ~ '^[a-z]{3}$');

alter table public.orders alter column currency set default 'eur';
alter table public.payout_ledger alter column currency set default 'eur';

-- ---------------------------------------------------------------------------
-- 2. Relocate the existing kitchens
-- ---------------------------------------------------------------------------
-- Cuisine kept, city chosen to suit it — these are all communities that really
-- do cook this food in these cities. Coordinates are real addresses so the
-- PostGIS radius search returns something sensible.
--
-- Timezones are written explicitly here rather than derived, because a
-- migration cannot call the application's lookup table; they match what
-- `timezoneForCoordinates()` returns for each coordinate, and the trigger
-- added in 20260825100000 validates them against pg_timezone_names.

update public.vendors set
  pickup_address_line = 'Sonnenallee 45', pickup_city = 'Berlin',
  pickup_state = 'Berlin', pickup_postal_code = '12045',
  location = 'SRID=4326;POINT(13.4390 52.4870)',
  timezone = 'Europe/Berlin', currency = 'eur',
  certification_label = 'Gesundheitsamt Belehrung §43 IfSG'
where handle = 'amina-tesfaye';

update public.vendors set
  pickup_address_line = '12 Broadway Market', pickup_city = 'London',
  pickup_state = 'England', pickup_postal_code = 'E8 4PH',
  location = 'SRID=4326;POINT(-0.0614 51.5362)',
  timezone = 'Europe/London', currency = 'gbp',
  certification_label = 'Level 2 Food Hygiene (CIEH)'
where handle = 'jonah-bell';

update public.vendors set
  pickup_address_line = 'Calle de Embajadores 52', pickup_city = 'Madrid',
  pickup_state = 'Comunidad de Madrid', pickup_postal_code = '28012',
  location = 'SRID=4326;POINT(-3.7028 40.4053)',
  timezone = 'Europe/Madrid', currency = 'eur',
  certification_label = 'Carné de Manipulador de Alimentos'
where handle = 'marisol-villanueva';

update public.vendors set
  pickup_address_line = '24 Rue de Belleville', pickup_city = 'Paris',
  pickup_state = 'Île-de-France', pickup_postal_code = '75020',
  location = 'SRID=4326;POINT(2.3780 48.8720)',
  timezone = 'Europe/Paris', currency = 'eur',
  certification_label = 'Formation HACCP'
where handle = 'nadia-haddad';

update public.vendors set
  pickup_address_line = 'Javastraat 18', pickup_city = 'Amsterdam',
  pickup_state = 'Noord-Holland', pickup_postal_code = '1094 HD',
  location = 'SRID=4326;POINT(4.9330 52.3640)',
  timezone = 'Europe/Amsterdam', currency = 'eur',
  certification_label = 'HACCP Hygiënecode'
where handle = 'priya-raman';

update public.vendors set
  pickup_address_line = 'Rua da Boavista 84', pickup_city = 'Lisboa',
  pickup_state = 'Lisboa', pickup_postal_code = '1200-068',
  location = 'SRID=4326;POINT(-9.1520 38.7086)',
  timezone = 'Europe/Lisbon', currency = 'eur',
  certification_label = 'Formação HACCP'
where handle = 'rosa-mendez';

update public.vendors set
  pickup_address_line = 'Strada Franceză 30', pickup_city = 'București',
  pickup_state = 'București', pickup_postal_code = '030106',
  location = 'SRID=4326;POINT(26.1010 44.4310)',
  timezone = 'Europe/Bucharest', currency = 'ron',
  certification_label = 'Curs Igienă (DSP)'
where handle = 'tomas-varga';

update public.vendors set
  pickup_address_line = 'ulica Nowogrodzka 40', pickup_city = 'Warszawa',
  pickup_state = 'Mazowieckie', pickup_postal_code = '00-691',
  location = 'SRID=4326;POINT(21.0060 52.2280)',
  timezone = 'Europe/Warsaw', currency = 'pln',
  certification_label = 'Książeczka sanepidowska'
where handle = 'wei-lin';

-- ---------------------------------------------------------------------------
-- 3. create_order() bills in the kitchen's currency
-- ---------------------------------------------------------------------------
-- Previously the column default decided, which meant every order everywhere
-- was denominated in dollars regardless of where the food was.

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

  select count(*) into v_open_checkouts
  from public.orders
  where customer_id = v_customer
    and status = 'pending_payment'
    and created_at > now() - interval '1 hour';

  if v_open_checkouts >= v_settings.max_open_checkouts then
    raise exception 'You have unfinished checkouts. Complete or cancel one before starting another.'
      using errcode = 'invalid_parameter_value';
  end if;

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
    currency,
    subtotal_cents, service_fee_cents, platform_fee_cents,
    total_cents, vendor_payout_cents, platform_fee_bps,
    customer_note
  ) values (
    public.generate_order_code(), v_customer, p_vendor_id, 'pending_payment',
    p_pickup_window_id, v_pickup_at, v_pickup_ends,
    v_vendor.currency,
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
