-- FreshFork Phase 2 — the vendor business record.

create type public.vendor_status as enum (
  'draft', 'pending_review', 'changes_requested', 'approved', 'suspended'
);

create type public.connect_status as enum (
  'not_started', 'onboarding', 'restricted', 'complete'
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  handle text not null unique,

  -- Business info (wizard step 1)
  business_name text not null,
  story text,
  cuisine text,
  kitchen_type text,

  -- Pickup address (wizard step 2, geocoded via Mapbox)
  pickup_address_line text,
  pickup_city text,
  pickup_state text,
  pickup_postal_code text,
  location extensions.geography(Point, 4326),

  -- Certification (wizard step 3)
  certification_label text,
  cert_doc_path text,
  cert_expires_on date,

  -- Imagery (dish-photos bucket)
  hero_image_path text,
  avatar_image_path text,

  -- Admin review gate
  status public.vendor_status not null default 'draft',
  status_note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  verified_since date,

  -- Stripe Connect gate (written only by the webhook, via service role)
  stripe_account_id text unique,
  stripe_connect_status public.connect_status not null default 'not_started',
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,

  -- Derived from both gates. Never written directly.
  is_live boolean not null default false,

  onboarding_step text not null default 'business',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vendors is
  'One business per vendor profile. Created lazily on first onboarding step, not at signup. `is_live` is derived from admin approval AND Stripe onboarding — never set it directly.';

comment on column public.vendors.is_live is
  'Derived: status = approved AND stripe_connect_status = complete. Maintained by the vendors guard triggers.';

create index vendors_location_idx on public.vendors using gist (location);
create index vendors_status_idx on public.vendors (status);
create index vendors_live_idx on public.vendors (is_live) where is_live;
create index vendors_cuisine_idx on public.vendors (cuisine);

alter table public.vendors enable row level security;

-- Anyone may see a live vendor. Owners and admins see their own drafts too.
create policy "vendors_select_public_live"
  on public.vendors for select
  to anon, authenticated
  using (is_live);

create policy "vendors_select_own_or_admin"
  on public.vendors for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy "vendors_insert_own"
  on public.vendors for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "vendors_update_own_or_admin"
  on public.vendors for update
  to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy "vendors_delete_admin"
  on public.vendors for delete
  to authenticated
  using (public.is_admin());

-- Privilege guard, mirroring profiles_guard_update: a vendor editing their own
-- listing silently keeps the review/Stripe columns they are not allowed to set,
-- so ordinary edits still succeed instead of erroring.
-- NOTE: superseded by 20260822193156_phase2_status_write_escape_hatch.sql.
create or replace function public.vendors_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  acting_uid uuid := auth.uid();
  acting_is_admin boolean := acting_uid is not null and public.is_admin();
begin
  -- acting_uid is null for the service role (webhooks, admin client).
  if acting_uid is not null and not acting_is_admin then
    new.status := old.status;
    new.status_note := old.status_note;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.verified_since := old.verified_since;

    new.stripe_account_id := old.stripe_account_id;
    new.stripe_connect_status := old.stripe_connect_status;
    new.stripe_charges_enabled := old.stripe_charges_enabled;
    new.stripe_payouts_enabled := old.stripe_payouts_enabled;
  end if;

  -- is_live is always derived, for everyone.
  new.is_live := (new.status = 'approved' and new.stripe_connect_status = 'complete');
  if new.is_live and new.verified_since is null then
    new.verified_since := current_date;
  end if;

  new.profile_id := old.profile_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger vendors_guard_update
  before update on public.vendors
  for each row execute function public.vendors_guard_update();

-- Same derivation on insert, so a row can never be born live.
create or replace function public.vendors_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := 'draft';
    new.status_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.verified_since := null;
    new.stripe_account_id := null;
    new.stripe_connect_status := 'not_started';
    new.stripe_charges_enabled := false;
    new.stripe_payouts_enabled := false;
  end if;

  new.is_live := (new.status = 'approved' and new.stripe_connect_status = 'complete');
  return new;
end;
$$;

create trigger vendors_guard_insert
  before insert on public.vendors
  for each row execute function public.vendors_guard_insert();

revoke all on function public.vendors_guard_update() from public, anon, authenticated;
revoke all on function public.vendors_guard_insert() from public, anon, authenticated;

grant select, insert, update on public.vendors to authenticated;
grant select on public.vendors to anon;
