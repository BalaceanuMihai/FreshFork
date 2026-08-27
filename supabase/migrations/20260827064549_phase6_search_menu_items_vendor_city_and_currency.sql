-- Browse cards show a vendor's name and distance but not which city the
-- kitchen is actually in — with cooks spread across a dozen European
-- cities, "Lukas Andersson · 0.6 mi" reads as local even when the viewer
-- has no location set and the distance is meaningless. Surfacing
-- `vendor_city` lets the card say "Stockholm" outright.
--
-- A prior pass at this (applied as phase6_dish_card_vendor_city) dropped and
-- recreated search_menu_items to add vendor_city but was cut from a copy of
-- the function that predated phase6_search_returns_currency, silently
-- dropping the `currency` column that migration had added. Every SEK / PLN /
-- RON / GBP-priced dish then rendered with a euro sign on /browse
-- (formatPrice defaults to "eur" when currency is undefined). This
-- migration restores `currency` alongside `vendor_city`.
--
-- `CREATE OR REPLACE FUNCTION` cannot add a column to an existing
-- `RETURNS TABLE` — that's a return-type change, which Postgres rejects.
-- Drop and recreate.

drop function if exists public.search_menu_items(
  double precision, double precision, double precision, text[], text[],
  integer, integer, text, text[], text, integer, integer
);

create function public.search_menu_items(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m double precision default 4828,          -- 3 miles
  p_cuisines text[] default null,
  p_dietary text[] default null,
  p_price_min_cents integer default null,
  p_price_max_cents integer default null,
  p_availability text default null,                  -- 'today' | 'week' | null
  p_pickup_windows text[] default null,              -- 'lunch' | 'dinner' | 'late'
  p_sort text default 'distance',                    -- 'distance' | 'price' | 'newest'
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  menu_item_id uuid,
  vendor_id uuid,
  vendor_handle text,
  vendor_name text,
  vendor_city text,
  cuisine text,
  dish_name text,
  description text,
  price_cents integer,
  currency text,
  photo_path text,
  prep_note text,
  dietary_tags text[],
  allergens text[],
  quantity_available integer,
  lat double precision,
  lng double precision,
  distance_m double precision,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with origin as (
    select case
      when p_lat is null or p_lng is null then null
      else ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    end as point
  ),
  matched as (
    select
      mi.id as menu_item_id,
      v.id as vendor_id,
      v.handle as vendor_handle,
      v.business_name as vendor_name,
      v.pickup_city as vendor_city,
      v.cuisine,
      mi.name as dish_name,
      mi.description,
      mi.price_cents,
      v.currency,
      mi.photo_path,
      mi.prep_note,
      mi.dietary_tags,
      mi.allergens,
      mi.quantity_available,
      ST_Y(v.location::geometry) as lat,
      ST_X(v.location::geometry) as lng,
      case
        when (select point from origin) is null then null
        else ST_Distance(v.location, (select point from origin))
      end as distance_m,
      mi.created_at
    from public.menu_items mi
    join public.vendors v on v.id = mi.vendor_id
    where v.is_live
      and mi.is_available
      and (
        (select point from origin) is null
        or (
          v.location is not null
          and ST_DWithin(v.location, (select point from origin), p_radius_m)
        )
      )
      and (p_cuisines is null or v.cuisine = any(p_cuisines))
      and (p_dietary is null or mi.dietary_tags @> p_dietary)
      and (p_price_min_cents is null or mi.price_cents >= p_price_min_cents)
      and (p_price_max_cents is null or mi.price_cents <= p_price_max_cents)
      and (
        p_availability is null
        or (
          p_availability = 'today'
          and exists (
            select 1 from public.pickup_windows w
            where w.vendor_id = v.id
              and w.is_active
              and w.day_of_week = extract(dow from now())::smallint
          )
        )
        or (
          p_availability = 'week'
          and exists (
            select 1 from public.pickup_windows w
            where w.vendor_id = v.id and w.is_active
          )
        )
      )
      and (
        p_pickup_windows is null
        or exists (
          select 1 from public.pickup_windows w
          where w.vendor_id = v.id
            and w.is_active
            and (
              ('lunch' = any(p_pickup_windows) and w.start_time < time '14:00' and w.end_time > time '11:00')
              or ('dinner' = any(p_pickup_windows) and w.start_time < time '20:00' and w.end_time > time '17:00')
              or ('late' = any(p_pickup_windows) and w.end_time > time '20:00')
            )
        )
      )
  )
  select
    m.menu_item_id, m.vendor_id, m.vendor_handle, m.vendor_name, m.vendor_city, m.cuisine,
    m.dish_name, m.description, m.price_cents, m.currency, m.photo_path, m.prep_note,
    m.dietary_tags, m.allergens, m.quantity_available,
    m.lat, m.lng, m.distance_m,
    count(*) over () as total_count
  from matched m
  order by
    case when p_sort = 'price' then m.price_cents end asc nulls last,
    case when p_sort = 'newest' then m.created_at end desc nulls last,
    case when p_sort = 'distance' then m.distance_m end asc nulls last,
    m.dish_name asc
  limit greatest(1, least(p_limit, 60))
  offset greatest(0, p_offset);
$$;

revoke all on function public.search_menu_items(
  double precision, double precision, double precision, text[], text[],
  integer, integer, text, text[], text, integer, integer
) from public;

grant execute on function public.search_menu_items(
  double precision, double precision, double precision, text[], text[],
  integer, integer, text, text[], text, integer, integer
) to anon, authenticated;
