-- FreshFork Phase 2 — dishes.

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  section text not null default 'Mains',
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  photo_path text,
  -- Small fixed vocabularies, validated in the app layer so the list can grow
  -- without a migration. GIN-indexed for containment queries.
  allergens text[] not null default '{}',
  dietary_tags text[] not null default '{}',
  prep_note text,
  quantity_available integer check (quantity_available is null or quantity_available >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.menu_items is
  'Dishes belonging to a vendor. Visible publicly only while the parent vendor is live.';

create index menu_items_vendor_idx on public.menu_items (vendor_id);
create index menu_items_available_idx on public.menu_items (vendor_id, is_available) where is_available;
create index menu_items_dietary_idx on public.menu_items using gin (dietary_tags);
create index menu_items_allergens_idx on public.menu_items using gin (allergens);
create index menu_items_price_idx on public.menu_items (price_cents);

alter table public.menu_items enable row level security;

create policy "menu_items_select_public"
  on public.menu_items for select
  to anon, authenticated
  using (exists (
    select 1 from public.vendors v where v.id = vendor_id and v.is_live
  ));

create policy "menu_items_select_own_or_admin"
  on public.menu_items for select
  to authenticated
  using (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ));

create policy "menu_items_insert_own_or_admin"
  on public.menu_items for insert
  to authenticated
  with check (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ));

create policy "menu_items_update_own_or_admin"
  on public.menu_items for update
  to authenticated
  using (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ));

create policy "menu_items_delete_own_or_admin"
  on public.menu_items for delete
  to authenticated
  using (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ));

create or replace function public.menu_items_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.vendor_id := old.vendor_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger menu_items_touch_updated_at
  before update on public.menu_items
  for each row execute function public.menu_items_touch_updated_at();

revoke all on function public.menu_items_touch_updated_at() from public, anon, authenticated;

grant select, insert, update, delete on public.menu_items to authenticated;
grant select on public.menu_items to anon;
