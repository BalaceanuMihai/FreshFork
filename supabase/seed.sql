-- FreshFork demo data.
--
-- Two live cooks in Brooklyn with menus and pickup windows, for clicking
-- through discovery without completing onboarding by hand. NOT run
-- automatically — paste it into the Supabase SQL editor when you want it.
--
-- The fixture users have unusable passwords and @example.test addresses, so
-- they cannot be signed in as. To remove everything again:
--
--   delete from auth.users where email like 'fixture-%@example.test';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'fixture-amina@example.test',
   crypt(gen_random_uuid()::text, gen_salt('bf')), now(), now(), now(),
   '{"provider":"email"}', '{"role":"vendor","full_name":"Amina Tesfaye"}'),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'fixture-jonah@example.test',
   crypt(gen_random_uuid()::text, gen_salt('bf')), now(), now(), now(),
   '{"provider":"email"}', '{"role":"vendor","full_name":"Jonah Bell"}')
on conflict (id) do nothing;

insert into public.vendors (
  profile_id, handle, business_name, cuisine, kitchen_type, story,
  pickup_address_line, pickup_city, pickup_state, location,
  certification_label, cert_doc_path
)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'amina-tesfaye', 'Amina Tesfaye',
   'Ethiopian', 'Home kitchen · inspected',
   'I have been cooking my grandmother''s doro wat for twenty years. The berbere is still her recipe.',
   '215 DeKalb Ave', 'Brooklyn', 'NY', 'SRID=4326;POINT(-73.9738 40.6899)',
   'NYC Food Handler', 'fixture/cert.pdf'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'jonah-bell', 'Jonah Bell',
   'Baked goods', 'Micro-bakery',
   'Six bagels at a time, boiled and baked before dawn.',
   '1 Nassau Ave', 'Brooklyn', 'NY', 'SRID=4326;POINT(-73.9500 40.7250)',
   'NYC Food Handler', 'fixture/cert.pdf')
on conflict (handle) do nothing;

-- Clear both gates so the derived is_live flag flips on.
update public.vendors
set status = 'approved',
    stripe_connect_status = 'complete',
    stripe_charges_enabled = true,
    stripe_payouts_enabled = true
where handle in ('amina-tesfaye', 'jonah-bell');

insert into public.menu_items (
  vendor_id, section, name, description, price_cents,
  dietary_tags, allergens, prep_note, quantity_available
)
select id, 'Mains', 'Doro Wat + Injera',
       'Slow-cooked chicken in berbere, served with house injera.',
       1600, array['gluten_free'], array['eggs'], '4 LEFT · 6 PM', 4
from public.vendors where handle = 'amina-tesfaye'
union all
select id, 'Mains', 'Yemisir Wot',
       'Red lentils, berbere, no dairy at all.',
       1200, array['vegan', 'gluten_free'], array[]::text[], 'ORDER BY 3 PM', 6
from public.vendors where handle = 'amina-tesfaye'
union all
select id, 'Bakery', 'Sesame Bagels x6',
       'Boiled and baked before dawn.',
       1200, array['vegan'], array['wheat', 'sesame'], 'SAT 9–11', 12
from public.vendors where handle = 'jonah-bell';

insert into public.pickup_windows (vendor_id, day_of_week, start_time, end_time)
select v.id, d, time '18:00', time '20:00'
from public.vendors v, unnest(array[0, 1, 2, 3]) as d
where v.handle = 'amina-tesfaye'
union all
select v.id, 6, time '09:00', time '11:00'
from public.vendors v where v.handle = 'jonah-bell'
on conflict do nothing;
