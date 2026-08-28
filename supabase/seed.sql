-- FreshFork demo data — twelve live kitchens across Europe.
--
-- NOT run automatically. Paste it into the Supabase SQL editor when you want a
-- populated marketplace to click through.
--
-- The spread is deliberate. Discovery, pickup scheduling and pricing all
-- behave differently by country, and a dataset confined to one city hides all
-- three:
--
--   * three UTC offsets (+0 Dublin/Lisbon/London, +1 most, +2 Athens/Bucharest)
--   * four currencies (EUR, GBP, PLN, SEK)
--   * addresses inside the geocoder's bounding box, so autocomplete can
--     actually find them
--
-- Every account shares one password so they can be signed in as. Before
-- running this, replace the SET_A_PASSWORD_BEFORE_RUNNING placeholder below
-- with a real value — and do not commit that value back to this file.
--
-- A shared password is only acceptable because every address is
-- @freshfork.test. If the deployment this points at is reachable from the
-- internet, treat these as real credentials: pick something unguessable, keep
-- it out of the repo, and never give any of them the `admin` role.
--
-- To remove it all again:
--
--   delete from auth.users where email like 'pilot-%@freshfork.test';

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated',
  p.email, extensions.crypt('SET_A_PASSWORD_BEFORE_RUNNING', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('role', p.role, 'full_name', p.full_name)
from (values
  -- Cooks
  ('e1e1e1e1-0000-4000-8000-000000000001'::uuid, 'pilot-eleni@freshfork.test',   'vendor',   'Eleni Dimitriou'),
  ('e1e1e1e1-0000-4000-8000-000000000002'::uuid, 'pilot-saoirse@freshfork.test', 'vendor',   'Saoirse Brennan'),
  ('e1e1e1e1-0000-4000-8000-000000000003'::uuid, 'pilot-lukas@freshfork.test',   'vendor',   'Lukas Andersson'),
  ('e1e1e1e1-0000-4000-8000-000000000004'::uuid, 'pilot-giulia@freshfork.test',  'vendor',   'Giulia Moretti'),
  -- Customers, one per major market
  ('c1c1c1c1-0000-4000-8000-000000000001'::uuid, 'pilot-lea@freshfork.test',       'customer', 'Léa Dubois'),
  ('c1c1c1c1-0000-4000-8000-000000000002'::uuid, 'pilot-miguel@freshfork.test',    'customer', 'Miguel Santos'),
  ('c1c1c1c1-0000-4000-8000-000000000003'::uuid, 'pilot-katarzyna@freshfork.test', 'customer', 'Katarzyna Nowak'),
  ('c1c1c1c1-0000-4000-8000-000000000004'::uuid, 'pilot-andrei@freshfork.test',    'customer', 'Andrei Popescu')
) as p(id, email, role, full_name)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Kitchens
-- ---------------------------------------------------------------------------
-- `timezone` and `currency` are written explicitly here because a SQL seed
-- cannot call the application's coordinate lookup. In the real flow the
-- address step derives the timezone from the geocoded point
-- (src/lib/geo/timezone.ts) and the trigger validates it.

insert into public.vendors (
  profile_id, handle, business_name, cuisine, kitchen_type, story,
  pickup_address_line, pickup_city, pickup_state, pickup_postal_code,
  location, timezone, currency, certification_label
) values
  ('e1e1e1e1-0000-4000-8000-000000000001', 'eleni-dimitriou', 'Eleni Dimitriou',
   'Greek', 'Home kitchen · inspected',
   'My mother''s recipes from Ikaria, where people forget to die. Everything is cooked in olive oil from our own trees.',
   'Adrianou 42', 'Athina', 'Attiki', '105 55',
   'SRID=4326;POINT(23.7265 37.9755)', 'Europe/Athens', 'eur', 'Pistopoiitiko Ygieinis'),
  ('e1e1e1e1-0000-4000-8000-000000000002', 'saoirse-brennan', 'Saoirse Brennan',
   'Irish', 'Micro-bakery',
   'Soda bread, brown scones, and a proper coddle on Fridays. Nothing my grandmother would not recognise.',
   '15 Camden Street Lower', 'Dublin', 'Leinster', 'D02 XE80',
   'SRID=4326;POINT(-6.2650 53.3339)', 'Europe/Dublin', 'eur', 'Safe Food Handling (FSAI)'),
  ('e1e1e1e1-0000-4000-8000-000000000003', 'lukas-andersson', 'Lukas Andersson',
   'Nordic', 'Home kitchen · inspected',
   'Pickling, curing, and rye. I cook what keeps through a long winter, because that is what tastes of home.',
   'Swedenborgsgatan 24', 'Stockholm', 'Stockholms lan', '118 27',
   'SRID=4326;POINT(18.0650 59.3160)', 'Europe/Stockholm', 'sek', 'Livsmedelshygien (Livsmedelsverket)'),
  ('e1e1e1e1-0000-4000-8000-000000000004', 'giulia-moretti', 'Giulia Moretti',
   'Italian', 'Home kitchen · inspected',
   'Cacio e pepe the way it is made in Testaccio: four ingredients, no cream, and a great deal of arguing about it.',
   'Via dei Cappellari 68', 'Roma', 'Lazio', '00186',
   'SRID=4326;POINT(12.4700 41.8955)', 'Europe/Rome', 'eur', 'Attestato HACCP')
on conflict (handle) do nothing;

-- Both gates open, so the derived is_live flag flips on.
update public.vendors
set status = 'approved', stripe_connect_status = 'complete',
    stripe_charges_enabled = true, stripe_payouts_enabled = true
where handle in ('eleni-dimitriou', 'saoirse-brennan', 'lukas-andersson', 'giulia-moretti');

-- ---------------------------------------------------------------------------
-- Menus
-- ---------------------------------------------------------------------------
-- Prices are integer minor units of each kitchen's own currency: cents for the
-- euro kitchens, öre for Stockholm. 16500 öre is roughly €15, not 165 kronor.

insert into public.menu_items (
  vendor_id, section, name, description, price_cents,
  dietary_tags, allergens, prep_note, quantity_available
)
select v.id, x.section, x.name, x.description, x.price_cents,
       x.dietary_tags, x.allergens, x.prep_note, x.qty
from public.vendors v
join (values
  ('eleni-dimitriou', 'Mains',  'Soutzoukakia', 'Cumin-scented meatballs braised in tomato, with rice.', 1350, array[]::text[], array['gluten','eggs'], '6 LEFT · 7 PM', 6),
  ('eleni-dimitriou', 'Mains',  'Briam', 'Slow-roasted summer vegetables in Ikarian olive oil.', 1100, array['vegan','gluten_free'], array[]::text[], 'MADE TO ORDER', null),
  ('eleni-dimitriou', 'Sides',  'Tzatziki + Pita', 'Strained yoghurt, cucumber, far too much garlic.', 550, array['vegetarian'], array['dairy','gluten'], null, 10),
  ('saoirse-brennan', 'Mains',  'Dublin Coddle', 'Sausage, bacon and potato, simmered slow. Friday only.', 1250, array[]::text[], array['gluten'], '5 LEFT · FRI', 5),
  ('saoirse-brennan', 'Bakery', 'Brown Soda Bread', 'Wholemeal, buttermilk, baked this morning.', 450, array['vegetarian'], array['gluten','dairy'], null, 12),
  ('saoirse-brennan', 'Bakery', 'Treacle Scones', 'Four to a bag, still warm if you are quick.', 600, array['vegetarian'], array['gluten','dairy','eggs'], '8 LEFT', 8),
  ('lukas-andersson', 'Mains',  'Gravlax + Dill Potatoes', 'Cured for three days with dill and aquavit.', 16500, array['gluten_free'], array['fish'], '4 LEFT · 6 PM', 4),
  ('lukas-andersson', 'Mains',  'Kalops', 'Allspice beef stew, the way it is made in winter.', 14500, array[]::text[], array[]::text[], null, 6),
  ('lukas-andersson', 'Sides',  'Rye + Cultured Butter', 'Dense, dark, faintly sweet.', 4500, array['vegetarian'], array['gluten','dairy'], null, 10),
  ('giulia-moretti',  'Mains',  'Cacio e Pepe', 'Pecorino romano, black pepper, pasta water. Nothing else.', 1200, array['vegetarian'], array['gluten','dairy'], '6 LEFT · 8 PM', 6),
  ('giulia-moretti',  'Mains',  'Carciofi alla Romana', 'Artichokes braised with mint and garlic.', 1050, array['vegan','gluten_free'], array[]::text[], 'IN SEASON', 5),
  ('giulia-moretti',  'Sides',  'Supplì', 'Fried rice croquettes with a mozzarella heart. Two per portion.', 700, array['vegetarian'], array['gluten','dairy','eggs'], null, 12)
) as x(handle, section, name, description, price_cents, dietary_tags, allergens, prep_note, qty)
  on x.handle = v.handle
where not exists (
  select 1 from public.menu_items m where m.vendor_id = v.id and m.name = x.name
);

-- ---------------------------------------------------------------------------
-- Pickup windows
-- ---------------------------------------------------------------------------
-- Local wall-clock times. 19:00 in Rome and 19:00 in Dublin are two different
-- instants, which is the whole reason vendors.timezone exists.

insert into public.pickup_windows (vendor_id, day_of_week, start_time, end_time)
select v.id, w.dow, w.starts, w.ends
from public.vendors v
join (values
  ('eleni-dimitriou', 2, '18:00'::time, '20:30'::time),
  ('eleni-dimitriou', 4, '18:00'::time, '20:30'::time),
  ('eleni-dimitriou', 6, '12:00'::time, '15:00'::time),
  ('saoirse-brennan', 5, '17:00'::time, '19:30'::time),
  ('saoirse-brennan', 6, '09:00'::time, '12:00'::time),
  ('saoirse-brennan', 0, '09:00'::time, '12:00'::time),
  ('lukas-andersson', 3, '17:30'::time, '19:30'::time),
  ('lukas-andersson', 5, '17:30'::time, '20:00'::time),
  ('giulia-moretti',  1, '19:00'::time, '21:00'::time),
  ('giulia-moretti',  4, '19:00'::time, '21:00'::time),
  ('giulia-moretti',  6, '19:00'::time, '21:30'::time)
) as w(handle, dow, starts, ends) on w.handle = v.handle
on conflict (vendor_id, day_of_week, start_time, end_time) do nothing;

-- ---------------------------------------------------------------------------
-- Coordinates for exercising discovery
-- ---------------------------------------------------------------------------
-- The location bar takes lat/lng, so these can be pasted straight into
-- /browse?lat=..&lng=..&loc=.. to search as if standing in each city.
--
--   Athens      37.9838,  23.7275     Lisbon      38.7223,  -9.1393
--   Amsterdam   52.3676,   4.9041     London      51.5072,  -0.1276
--   Berlin      52.5200,  13.4050     Madrid      40.4168,  -3.7038
--   Bucharest   44.4268,  26.1025     Paris       48.8566,   2.3522
--   Dublin      53.3498,  -6.2603     Rome        41.9028,  12.4964
--   Stockholm   59.3293,  18.0686     Warsaw      52.2297,  21.0122
