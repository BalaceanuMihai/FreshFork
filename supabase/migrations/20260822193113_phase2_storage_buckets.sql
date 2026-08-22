-- FreshFork Phase 2 — file storage.
-- Path convention for both buckets: {vendor_id}/{filename}, so ownership can be
-- derived from the first path segment.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vendor-docs', 'vendor-docs', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('dish-photos', 'dish-photos', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

-- Certification documents: owner and admin only, never public.
create policy "vendor_docs_owner_or_admin_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vendor-docs'
    and exists (
      select 1 from public.vendors v
      where v.id::text = (storage.foldername(name))[1]
        and (v.profile_id = auth.uid() or public.is_admin())
    )
  );

create policy "vendor_docs_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vendor-docs'
    and exists (
      select 1 from public.vendors v
      where v.id::text = (storage.foldername(name))[1]
        and v.profile_id = auth.uid()
    )
  );

create policy "vendor_docs_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vendor-docs'
    and exists (
      select 1 from public.vendors v
      where v.id::text = (storage.foldername(name))[1]
        and v.profile_id = auth.uid()
    )
  );

create policy "vendor_docs_owner_or_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vendor-docs'
    and exists (
      select 1 from public.vendors v
      where v.id::text = (storage.foldername(name))[1]
        and (v.profile_id = auth.uid() or public.is_admin())
    )
  );

-- Dish photos: world-readable, owner-writable.
create policy "dish_photos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'dish-photos');

create policy "dish_photos_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dish-photos'
    and exists (
      select 1 from public.vendors v
      where v.id::text = (storage.foldername(name))[1]
        and v.profile_id = auth.uid()
    )
  );

create policy "dish_photos_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'dish-photos'
    and exists (
      select 1 from public.vendors v
      where v.id::text = (storage.foldername(name))[1]
        and v.profile_id = auth.uid()
    )
  );

create policy "dish_photos_owner_or_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'dish-photos'
    and exists (
      select 1 from public.vendors v
      where v.id::text = (storage.foldername(name))[1]
        and (v.profile_id = auth.uid() or public.is_admin())
    )
  );
