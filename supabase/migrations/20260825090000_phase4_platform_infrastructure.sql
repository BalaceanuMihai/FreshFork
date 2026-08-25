-- FreshFork Phase 4 — platform infrastructure that everything else leans on.
--
-- Five unrelated-looking pieces share one migration because they are all
-- "plumbing with no UI": request throttling, webhook de-duplication, an admin
-- audit trail, storage garbage collection, and the path guards that stop a
-- client pointing a document column at somebody else's object.

-- ---------------------------------------------------------------------------
-- 1. Rate limiting
-- ---------------------------------------------------------------------------
-- Serverless functions share no memory, so the counter lives in Postgres. One
-- row per bucket, reset when the fixed window rolls over. Only the service role
-- may touch it: if `authenticated` could call consume_rate_limit it could burn
-- through somebody else's bucket on their behalf.

create table public.rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  hits integer not null default 0
);

comment on table public.rate_limits is
  'Fixed-window request counters keyed by "<action>:<subject>". Server-side only — never exposed to authenticated clients.';

create index rate_limits_window_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
-- No policies at all: the service role bypasses RLS, everyone else is denied.

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'consume_rate_limit needs a positive limit and window.'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Floor "now" to the window boundary so every caller in the same window
  -- agrees on the key without needing a separate schedule.
  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as rl (bucket, window_start, hits)
  values (p_bucket, v_window_start, 1)
  on conflict (bucket) do update
    set hits = case when rl.window_start = excluded.window_start then rl.hits + 1 else 1 end,
        window_start = excluded.window_start
  returning rl.hits into v_hits;

  return query select
    v_hits <= p_limit,
    greatest(p_limit - v_hits, 0),
    case
      when v_hits <= p_limit then 0
      else greatest(
        ceil(extract(epoch from (
          v_window_start + make_interval(secs => p_window_seconds) - clock_timestamp()
        )))::integer,
        1
      )
    end;
end;
$fn$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Windows are self-healing (a stale row is overwritten on next use), but a
-- bucket nobody revisits would linger forever. Swept by the cron route.
create or replace function public.prune_rate_limits(p_older_than_seconds integer default 86400)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
  where window_start < now() - make_interval(secs => p_older_than_seconds);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$fn$;

revoke all on function public.prune_rate_limits(integer) from public, anon, authenticated;
grant execute on function public.prune_rate_limits(integer) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Stripe webhook idempotency + ordering
-- ---------------------------------------------------------------------------
-- Stripe retries on any non-2xx and makes no ordering guarantee. Without this
-- table a redelivered `customer.subscription.updated` from ten minutes ago can
-- overwrite newer state.

create table public.stripe_events (
  id text primary key,                       -- Stripe's evt_… id
  type text not null,
  event_created timestamptz not null,        -- Stripe's own timestamp, for ordering
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

comment on table public.stripe_events is
  'Every webhook delivery we have accepted. The primary key is the de-duplication mechanism; event_created is used to discard out-of-order replays.';

create index stripe_events_type_idx on public.stripe_events (type, event_created desc);

alter table public.stripe_events enable row level security;

-- Claim an event for processing. Returns false when this event id has been
-- seen before, which the route turns into a 200 without doing any work —
-- Stripe stops retrying and we never apply the same state change twice.
create or replace function public.claim_stripe_event(
  p_id text,
  p_type text,
  p_event_created timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_rows integer := 0;
begin
  insert into public.stripe_events (id, type, event_created)
  values (p_id, p_type, p_event_created)
  on conflict (id) do nothing;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$fn$;

create or replace function public.finish_stripe_event(p_id text, p_error text default null)
returns void
language sql
security definer
set search_path = public, pg_temp
as $fn$
  update public.stripe_events
  set processed_at = now(), error = p_error
  where id = p_id;
$fn$;

-- Release a claim so Stripe's retry can have another go. Called when handling
-- threw: the row must not survive, or the retry would be swallowed as a
-- duplicate and the state change lost forever.
create or replace function public.release_stripe_event(p_id text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $fn$
  delete from public.stripe_events where id = p_id and processed_at is null;
$fn$;

revoke all on function public.claim_stripe_event(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.finish_stripe_event(text, text) from public, anon, authenticated;
revoke all on function public.release_stripe_event(text) from public, anon, authenticated;
grant execute on function public.claim_stripe_event(text, text, timestamptz) to service_role;
grant execute on function public.finish_stripe_event(text, text) to service_role;
grant execute on function public.release_stripe_event(text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Admin audit trail
-- ---------------------------------------------------------------------------
-- vendors.reviewed_by / reviewed_at only ever holds the *latest* decision. A
-- moderation history needs its own append-only table.

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_actions is
  'Append-only record of privileged decisions (vendor approvals, refunds, review moderation). Written by the service role; readable by admins.';

create index admin_actions_subject_idx on public.admin_actions (subject_type, subject_id, created_at desc);
create index admin_actions_actor_idx on public.admin_actions (actor_id, created_at desc);

alter table public.admin_actions enable row level security;

create policy "admin_actions_select_admin"
  on public.admin_actions for select
  to authenticated
  using (public.is_admin());

grant select on public.admin_actions to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Storage garbage collection
-- ---------------------------------------------------------------------------
-- Deleting a row cascades in Postgres but leaves the object sitting in the
-- bucket. Deleting from storage.objects here would drop the metadata row while
-- orphaning the actual file, so instead we queue the path and let a cron route
-- remove it through the Storage API.

create table public.storage_orphans (
  id bigint generated always as identity primary key,
  bucket text not null,
  object_path text not null,
  queued_at timestamptz not null default now(),
  deleted_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  unique (bucket, object_path)
);

comment on table public.storage_orphans is
  'Objects whose owning row is gone. Swept by /api/cron/storage-sweep, which is the only thing that can actually remove the bytes.';

create index storage_orphans_pending_idx on public.storage_orphans (queued_at) where deleted_at is null;

alter table public.storage_orphans enable row level security;

create or replace function public.queue_storage_orphan(p_bucket text, p_path text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $fn$
  insert into public.storage_orphans (bucket, object_path)
  select p_bucket, p_path
  where coalesce(trim(p_path), '') <> ''
  on conflict (bucket, object_path) do nothing;
$fn$;

revoke all on function public.queue_storage_orphan(text, text) from public, anon, authenticated;

create or replace function public.menu_items_reap_photo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'DELETE' then
    perform public.queue_storage_orphan('dish-photos', old.photo_path);
    return old;
  end if;

  if new.photo_path is distinct from old.photo_path then
    perform public.queue_storage_orphan('dish-photos', old.photo_path);
  end if;
  return new;
end;
$fn$;

create trigger menu_items_reap_photo
  after update or delete on public.menu_items
  for each row execute function public.menu_items_reap_photo();

create or replace function public.vendors_reap_files()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'DELETE' then
    perform public.queue_storage_orphan('vendor-docs', old.cert_doc_path);
    perform public.queue_storage_orphan('dish-photos', old.hero_image_path);
    perform public.queue_storage_orphan('dish-photos', old.avatar_image_path);
    return old;
  end if;

  if new.cert_doc_path is distinct from old.cert_doc_path then
    perform public.queue_storage_orphan('vendor-docs', old.cert_doc_path);
  end if;
  if new.hero_image_path is distinct from old.hero_image_path then
    perform public.queue_storage_orphan('dish-photos', old.hero_image_path);
  end if;
  if new.avatar_image_path is distinct from old.avatar_image_path then
    perform public.queue_storage_orphan('dish-photos', old.avatar_image_path);
  end if;
  return new;
end;
$fn$;

create trigger vendors_reap_files
  after update or delete on public.vendors
  for each row execute function public.vendors_reap_files();

revoke all on function public.menu_items_reap_photo() from public, anon, authenticated;
revoke all on function public.vendors_reap_files() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Object-path ownership guards
-- ---------------------------------------------------------------------------
-- Storage RLS stops a vendor *uploading* outside their own `{vendor_id}/`
-- prefix, but nothing stopped them *pointing* cert_doc_path at another
-- vendor's object — which an admin would then dutifully open during review.
-- The prefix convention is now enforced on the referencing column too.

create or replace function public.assert_owned_path(p_path text, p_owner_id uuid)
returns void
language plpgsql
immutable
set search_path = public, pg_temp
as $fn$
begin
  if coalesce(trim(p_path), '') = '' then
    return;
  end if;
  if split_part(p_path, '/', 1) <> p_owner_id::text then
    raise exception 'Storage path "%" does not belong to %.', p_path, p_owner_id
      using errcode = 'insufficient_privilege';
  end if;
end;
$fn$;

-- Only values actually being set or changed are validated. Rows that predate
-- this guard (seed fixtures, imports) stay editable — they simply cannot
-- introduce a *new* bad path. Validating unchanged values would freeze every
-- existing listing the moment the guard shipped.
create or replace function public.vendors_guard_paths()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'INSERT' or new.cert_doc_path is distinct from old.cert_doc_path then
    perform public.assert_owned_path(new.cert_doc_path, new.id);
  end if;
  if tg_op = 'INSERT' or new.hero_image_path is distinct from old.hero_image_path then
    perform public.assert_owned_path(new.hero_image_path, new.id);
  end if;
  if tg_op = 'INSERT' or new.avatar_image_path is distinct from old.avatar_image_path then
    perform public.assert_owned_path(new.avatar_image_path, new.id);
  end if;
  return new;
end;
$fn$;

create trigger vendors_guard_paths
  before insert or update on public.vendors
  for each row execute function public.vendors_guard_paths();

create or replace function public.menu_items_guard_paths()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'INSERT' or new.photo_path is distinct from old.photo_path then
    perform public.assert_owned_path(new.photo_path, new.vendor_id);
  end if;
  return new;
end;
$fn$;

create trigger menu_items_guard_paths
  before insert or update on public.menu_items
  for each row execute function public.menu_items_guard_paths();

revoke all on function public.assert_owned_path(text, uuid) from public, anon, authenticated;
revoke all on function public.vendors_guard_paths() from public, anon, authenticated;
revoke all on function public.menu_items_guard_paths() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. memberships.updated_at, and an end to the infinite past_due grace
-- ---------------------------------------------------------------------------

create or replace function public.memberships_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger memberships_touch_updated_at
  before update on public.memberships
  for each row execute function public.memberships_touch_updated_at();

revoke all on function public.memberships_touch_updated_at() from public, anon, authenticated;

-- `past_due` intentionally keeps Plus alive so a failed card doesn't yank
-- benefits away mid-cycle. It used to do so forever — if webhooks stopped
-- arriving, the member kept Plus indefinitely. The grace now expires 14 days
-- past the period end, computed at read time so no job is needed to enforce it.
create or replace view public.my_membership as
select
  p.id as profile_id,
  case
    when m.status = 'past_due'
     and m.current_period_end is not null
     and m.current_period_end < now() - interval '14 days'
    then 'free'::public.membership_plan
    else coalesce(m.plan, 'free'::public.membership_plan)
  end as plan,
  coalesce(m.status, 'active'::public.membership_status) as status,
  m.current_period_end,
  coalesce(m.cancel_at_period_end, false) as cancel_at_period_end,
  case
    when m.status = 'past_due' and m.current_period_end is not null
    then m.current_period_end + interval '14 days'
    else null
  end as grace_ends_at
from public.profiles p
left join public.memberships m on m.profile_id = p.id
where p.id = auth.uid();

alter view public.my_membership set (security_invoker = on);
grant select on public.my_membership to authenticated;
