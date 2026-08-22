-- FreshFork Phase 2 — recurring weekly pickup windows.
-- Deliberately recurring, not calendar slots: the product describes pickup as a
-- weekly rhythm ("Sun–Wed 6–8 pm"). Per-date capacity becomes necessary when
-- checkout lands; this shape does not model one-off closures.

create table public.pickup_windows (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint pickup_windows_time_order check (end_time > start_time),
  constraint pickup_windows_no_dupes unique (vendor_id, day_of_week, start_time, end_time)
);

create index pickup_windows_vendor_idx on public.pickup_windows (vendor_id);
create index pickup_windows_day_idx on public.pickup_windows (day_of_week) where is_active;

alter table public.pickup_windows enable row level security;

create policy "pickup_windows_select_public"
  on public.pickup_windows for select
  to anon, authenticated
  using (exists (
    select 1 from public.vendors v where v.id = vendor_id and v.is_live
  ));

create policy "pickup_windows_select_own_or_admin"
  on public.pickup_windows for select
  to authenticated
  using (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ));

create policy "pickup_windows_insert_own_or_admin"
  on public.pickup_windows for insert
  to authenticated
  with check (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ));

create policy "pickup_windows_update_own_or_admin"
  on public.pickup_windows for update
  to authenticated
  using (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ));

create policy "pickup_windows_delete_own_or_admin"
  on public.pickup_windows for delete
  to authenticated
  using (exists (
    select 1 from public.vendors v
    where v.id = vendor_id and (v.profile_id = auth.uid() or public.is_admin())
  ));

grant select, insert, update, delete on public.pickup_windows to authenticated;
grant select on public.pickup_windows to anon;
