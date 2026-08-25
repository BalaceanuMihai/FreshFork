-- FreshFork Phase 4 — resolving pickup windows into bookable slots, and a
-- self-service account closure that doesn't shred the financial record.

-- ---------------------------------------------------------------------------
-- Bookable pickup slots
-- ---------------------------------------------------------------------------
-- pickup_windows is a weekly rhythm ("Sundays, 18:00–20:00"). Checkout needs
-- actual dates. Expanding the recurrence in SQL keeps one definition of "is
-- this slot still bookable" — the same lead time and horizon create_order
-- enforces, so the UI can never offer a slot the RPC will then refuse.

create or replace function public.vendor_pickup_slots(
  p_vendor_id uuid,
  p_days integer default null
)
returns table (
  pickup_window_id uuid,
  pickup_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  day_of_week smallint,
  start_time time,
  end_time time
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_settings public.platform_settings;
  v_vendor public.vendors;
  v_horizon integer;
begin
  select * into v_settings from public.platform_settings where id;

  select * into v_vendor from public.vendors where id = p_vendor_id;
  if not found then
    return;
  end if;

  -- Owners and admins can preview their own slots before going live; everyone
  -- else only sees slots for a kitchen that is actually open for business.
  if not v_vendor.is_live
     and v_vendor.profile_id is distinct from auth.uid()
     and not public.is_admin()
  then
    return;
  end if;

  v_horizon := least(coalesce(p_days, v_settings.max_pickup_days_ahead),
                     v_settings.max_pickup_days_ahead);

  return query
  select
    w.id,
    d.day::date,
    (d.day::date + w.start_time) at time zone v_vendor.timezone,
    (d.day::date + w.end_time) at time zone v_vendor.timezone,
    w.day_of_week,
    w.start_time,
    w.end_time
  from public.pickup_windows w
  cross join generate_series(
    (now() at time zone v_vendor.timezone)::date,
    (now() at time zone v_vendor.timezone)::date + v_horizon,
    interval '1 day'
  ) as d(day)
  where w.vendor_id = p_vendor_id
    and w.is_active
    and extract(dow from d.day)::integer = w.day_of_week
    and (d.day::date + w.start_time) at time zone v_vendor.timezone
        >= now() + make_interval(mins => v_settings.order_lead_minutes)
  order by 3 asc;
end;
$fn$;

revoke all on function public.vendor_pickup_slots(uuid, integer) from public;
grant execute on function public.vendor_pickup_slots(uuid, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Account closure
-- ---------------------------------------------------------------------------
-- orders.customer_id is ON DELETE RESTRICT on purpose: a completed sale is an
-- accounting record and a food-safety record, and it must survive the buyer
-- closing their account. So closure anonymises rather than deletes, and the
-- auth user is soft-deleted by the caller afterwards.

alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Set by delete_my_account(). The row survives because orders reference it; every human-identifying field has been cleared.';

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
  v_open_orders integer;
  v_vendor public.vendors;
begin
  if v_uid is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege';
  end if;

  -- Anything in flight has a counterparty waiting on it. Close those first.
  select count(*) into v_open_orders
  from public.orders
  where customer_id = v_uid
    and status in ('pending_payment', 'paid', 'accepted', 'ready');

  if v_open_orders > 0 then
    raise exception 'You have % order(s) in progress. Cancel or complete them first.', v_open_orders
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_vendor from public.vendors where profile_id = v_uid;
  if found then
    select count(*) into v_open_orders
    from public.orders
    where vendor_id = v_vendor.id
      and status in ('pending_payment', 'paid', 'accepted', 'ready');

    if v_open_orders > 0 then
      raise exception 'Your kitchen has % order(s) in progress. Finish them first.', v_open_orders
        using errcode = 'invalid_parameter_value';
    end if;

    -- Take the listing off the marketplace and strip the identifying parts.
    -- The row itself stays for the same reason the profile does.
    perform set_config('freshfork.allow_status_write', 'on', true);
    update public.vendors
    set status = 'suspended',
        status_note = 'Owner closed their account.',
        story = null,
        pickup_address_line = null,
        pickup_city = null,
        pickup_state = null,
        pickup_postal_code = null,
        location = null,
        cert_doc_path = null,
        hero_image_path = null,
        avatar_image_path = null,
        certification_label = null
    where id = v_vendor.id;
    perform set_config('freshfork.allow_status_write', 'off', true);

    -- The reap triggers queue the old object paths for deletion, so the
    -- certification document really does leave the bucket.
    delete from public.menu_items where vendor_id = v_vendor.id;
  end if;

  update public.profiles
  set full_name = null,
      avatar_url = null,
      phone = null,
      deleted_at = now()
  where id = v_uid;

  insert into public.admin_actions (actor_id, action, subject_type, subject_id, note)
  values (v_uid, 'account.closed', 'profile', v_uid, 'Self-service closure.');

  return jsonb_build_object('ok', true, 'vendor_id', v_vendor.id);
end;
$fn$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
