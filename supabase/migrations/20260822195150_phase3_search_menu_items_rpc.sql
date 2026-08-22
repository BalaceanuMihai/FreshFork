-- FreshFork Phase 3 — proximity + filter search behind one RPC.
--
-- A single function rather than composed PostgREST filters: the distance
-- calculation, the vendor join, and the availability window check all need to
-- happen in SQL, and doing it here keeps `is_live` enforcement in one place.
-- Safe to grant to anon because it filters `v.is_live` itself.

create or replace function public.search_menu_items(
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
  cuisine text,
  dish_name text,
  description text,
  price_cents integer,
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
      v.cuisine,
      mi.name as dish_name,
      mi.description,
      mi.price_cents,
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
    m.menu_item_id, m.vendor_id, m.vendor_handle, m.vendor_name, m.cuisine,
    m.dish_name, m.description, m.price_cents, m.photo_path, m.prep_note,
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

-- Counts for the filter rail and the home page, over the same live set.
create or replace function public.discovery_stats(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m double precision default 4828
)
returns table (live_vendors bigint, live_dishes bigint, cuisines bigint)
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
  nearby as (
    select v.id, v.cuisine
    from public.vendors v
    where v.is_live
      and (
        (select point from origin) is null
        or (v.location is not null
            and ST_DWithin(v.location, (select point from origin), p_radius_m))
      )
  )
  select
    (select count(*) from nearby),
    (select count(*) from public.menu_items mi
      where mi.is_available and mi.vendor_id in (select id from nearby)),
    (select count(distinct cuisine) from nearby where cuisine is not null);
$$;

revoke all on function public.discovery_stats(double precision, double precision, double precision) from public;
grant execute on function public.discovery_stats(double precision, double precision, double precision) to anon, authenticated;
