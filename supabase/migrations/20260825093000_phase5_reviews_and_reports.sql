-- FreshFork Phase 5 — reviews and reports.
--
-- A review is anchored to an order, not to a vendor. That single decision is
-- what makes the ratings worth anything: you cannot review a kitchen you never
-- bought from, review it twice, or brigade a competitor.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  -- One review per order. The unique constraint *is* the anti-spam rule.
  order_id uuid not null unique references public.orders (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or length(body) <= 2000),

  vendor_reply text check (vendor_reply is null or length(vendor_reply) <= 1000),
  vendor_replied_at timestamptz,

  is_hidden boolean not null default false,
  hidden_reason text,
  hidden_by uuid references public.profiles (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reviews is
  'One review per completed order. Written only through submit_review() / edit_review(), so the "did this person actually buy this" check cannot be bypassed.';

create index reviews_vendor_idx on public.reviews (vendor_id, created_at desc) where not is_hidden;
create index reviews_customer_idx on public.reviews (customer_id, created_at desc);

alter table public.reviews enable row level security;

create policy "reviews_select_public"
  on public.reviews for select
  to anon, authenticated
  using (
    not is_hidden
    and exists (select 1 from public.vendors v where v.id = vendor_id and v.is_live)
  );

create policy "reviews_select_own_or_vendor_or_admin"
  on public.reviews for select
  to authenticated
  using (
    customer_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.profile_id = auth.uid()
    )
  );

-- No write policies: every mutation goes through a definer function below.

grant select on public.reviews to authenticated;
grant select on public.reviews to anon;

create or replace function public.reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if auth.uid() is not null
     and coalesce(current_setting('freshfork.allow_review_write', true), '') <> 'on'
  then
    raise exception 'Reviews are written through submit_review() and edit_review().'
      using errcode = 'insufficient_privilege';
  end if;

  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.order_id := old.order_id;
    new.vendor_id := old.vendor_id;
    new.customer_id := old.customer_id;
    new.created_at := old.created_at;
  end if;

  new.updated_at := now();
  return new;
end;
$fn$;

create trigger reviews_guard
  before insert or update on public.reviews
  for each row execute function public.reviews_guard();

revoke all on function public.reviews_guard() from public, anon, authenticated;

create or replace view public.vendor_ratings as
select
  v.id as vendor_id,
  count(r.id)::integer as review_count,
  round(avg(r.rating)::numeric, 2) as average_rating
from public.vendors v
left join public.reviews r on r.vendor_id = v.id and not r.is_hidden
where v.is_live
group by v.id;

comment on view public.vendor_ratings is
  'Public aggregate. Restricted to live vendors so a suspended kitchen stops advertising its old score.';

alter view public.vendor_ratings set (security_invoker = on);
grant select on public.vendor_ratings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Review lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.submit_review(
  p_order_id uuid,
  p_rating smallint,
  p_body text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_order public.orders;
  v_review public.reviews;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Pick a rating between 1 and 5.' using errcode = 'invalid_parameter_value';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found.' using errcode = 'no_data_found';
  end if;
  if v_order.customer_id <> auth.uid() then
    raise exception 'You can only review your own orders.' using errcode = 'insufficient_privilege';
  end if;
  if v_order.status <> 'completed' then
    raise exception 'You can review an order once it has been picked up.'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_order.completed_at < now() - interval '30 days' then
    raise exception 'This order is too old to review.' using errcode = 'invalid_parameter_value';
  end if;

  perform set_config('freshfork.allow_review_write', 'on', true);

  insert into public.reviews (order_id, vendor_id, customer_id, rating, body)
  values (
    p_order_id, v_order.vendor_id, auth.uid(), p_rating,
    nullif(left(coalesce(trim(p_body), ''), 2000), '')
  )
  returning * into v_review;

  perform set_config('freshfork.allow_review_write', 'off', true);

  return v_review;
exception
  when unique_violation then
    raise exception 'You have already reviewed this order.' using errcode = 'invalid_parameter_value';
end;
$fn$;

-- Second thoughts are allowed briefly; after that the score is part of the
-- vendor's public record and stops being editable.
create or replace function public.edit_review(
  p_review_id uuid,
  p_rating smallint,
  p_body text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_review public.reviews;
begin
  select * into v_review from public.reviews where id = p_review_id for update;
  if not found then
    raise exception 'Review not found.' using errcode = 'no_data_found';
  end if;
  if v_review.customer_id <> auth.uid() then
    raise exception 'That review is not yours.' using errcode = 'insufficient_privilege';
  end if;
  if v_review.created_at < now() - interval '7 days' then
    raise exception 'Reviews can only be edited within a week of posting.'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Pick a rating between 1 and 5.' using errcode = 'invalid_parameter_value';
  end if;

  perform set_config('freshfork.allow_review_write', 'on', true);
  update public.reviews
  set rating = p_rating,
      body = nullif(left(coalesce(trim(p_body), ''), 2000), '')
  where id = p_review_id
  returning * into v_review;
  perform set_config('freshfork.allow_review_write', 'off', true);

  return v_review;
end;
$fn$;

create or replace function public.reply_to_review(p_review_id uuid, p_reply text)
returns public.reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_review public.reviews;
  v_owns boolean;
begin
  select * into v_review from public.reviews where id = p_review_id for update;
  if not found then
    raise exception 'Review not found.' using errcode = 'no_data_found';
  end if;

  select exists (
    select 1 from public.vendors v
    where v.id = v_review.vendor_id and v.profile_id = auth.uid()
  ) into v_owns;

  if not v_owns then
    raise exception 'Only the kitchen being reviewed can reply.' using errcode = 'insufficient_privilege';
  end if;

  perform set_config('freshfork.allow_review_write', 'on', true);
  update public.reviews
  set vendor_reply = nullif(left(coalesce(trim(p_reply), ''), 1000), ''),
      vendor_replied_at = now()
  where id = p_review_id
  returning * into v_review;
  perform set_config('freshfork.allow_review_write', 'off', true);

  return v_review;
end;
$fn$;

create or replace function public.moderate_review(
  p_review_id uuid,
  p_hidden boolean,
  p_reason text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_review public.reviews;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'insufficient_privilege';
  end if;

  perform set_config('freshfork.allow_review_write', 'on', true);
  update public.reviews
  set is_hidden = p_hidden,
      hidden_reason = case when p_hidden then left(coalesce(trim(p_reason), ''), 300) else null end,
      hidden_by = case when p_hidden then auth.uid() else null end
  where id = p_review_id
  returning * into v_review;
  perform set_config('freshfork.allow_review_write', 'off', true);

  insert into public.admin_actions (actor_id, action, subject_type, subject_id, note)
  values (auth.uid(), case when p_hidden then 'review.hidden' else 'review.unhidden' end,
          'review', p_review_id, left(coalesce(p_reason, ''), 300));

  return v_review;
end;
$fn$;

revoke all on function public.submit_review(uuid, smallint, text) from public, anon;
revoke all on function public.edit_review(uuid, smallint, text) from public, anon;
revoke all on function public.reply_to_review(uuid, text) from public, anon;
revoke all on function public.moderate_review(uuid, boolean, text) from public, anon;
grant execute on function public.submit_review(uuid, smallint, text) to authenticated;
grant execute on function public.edit_review(uuid, smallint, text) to authenticated;
grant execute on function public.reply_to_review(uuid, text) to authenticated;
grant execute on function public.moderate_review(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
-- A marketplace selling food out of home kitchens needs a route for "this made
-- me ill" and "the allergen list is wrong" that does not depend on the vendor
-- choosing to pass it on.

create type public.report_reason as enum (
  'food_safety', 'allergen_error', 'hygiene', 'fraud', 'offensive', 'other'
);

create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  subject_type text not null check (subject_type in ('vendor', 'menu_item', 'review', 'order')),
  subject_id uuid not null,
  reason public.report_reason not null,
  detail text check (detail is null or length(detail) <= 2000),
  status public.report_status not null default 'open',
  resolution_note text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.reports is
  'Safety and abuse reports. Reporters see their own; admins see and triage all of them.';

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_subject_idx on public.reports (subject_type, subject_id);

alter table public.reports enable row level security;

create policy "reports_select_own_or_admin"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid() and status = 'open');

create policy "reports_update_admin"
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert on public.reports to authenticated;
grant update on public.reports to authenticated;

-- Reporters must not be able to hand themselves a resolution.
create or replace function public.reports_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'INSERT' then
    new.status := 'open';
    new.resolution_note := null;
    new.resolved_by := null;
    new.resolved_at := null;
    new.created_at := now();
    return new;
  end if;

  new.id := old.id;
  new.reporter_id := old.reporter_id;
  new.subject_type := old.subject_type;
  new.subject_id := old.subject_id;
  new.reason := old.reason;
  new.detail := old.detail;
  new.created_at := old.created_at;

  if new.status in ('resolved', 'dismissed') and old.status not in ('resolved', 'dismissed') then
    new.resolved_by := auth.uid();
    new.resolved_at := now();
  end if;

  return new;
end;
$fn$;

create trigger reports_guard
  before insert or update on public.reports
  for each row execute function public.reports_guard();

revoke all on function public.reports_guard() from public, anon, authenticated;
