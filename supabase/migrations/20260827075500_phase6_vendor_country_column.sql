-- `startStripeOnboarding` calls `stripe.accounts.create()` with no `country`,
-- so every Express account silently inherits the *platform* account's
-- country (this project's Stripe sandbox is Romania) regardless of where the
-- vendor's kitchen actually is. A cook in Berlin gets a Romanian Connect
-- account — wrong jurisdiction for identity verification, bank account
-- matching, and tax reporting. `saveAddress()` already derives `timezone`
-- from the geocoded coordinate (see phase4_vendor_timezone_derivation); this
-- adds the same treatment for the ISO country, captured from Mapbox at the
-- same step, so it is on hand when the payouts step later creates the
-- Stripe account. `currency` already exists as a column but nothing sets it
-- outside of seed data — this is also the first real write path for it.
alter table public.vendors
  add column country text
  check (country is null or country ~ '^[A-Z]{2}$');

comment on column public.vendors.country is
  'ISO 3166-1 alpha-2, captured from the geocoded pickup address during onboarding. Feeds both `currency` and the country passed to stripe.accounts.create() — never asked for directly, same reasoning as timezone.';
