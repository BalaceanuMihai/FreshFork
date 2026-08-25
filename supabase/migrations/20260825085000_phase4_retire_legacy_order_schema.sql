-- FreshFork — retire the first ordering schema.
--
-- Background: an earlier pass built orders, order_items, reviews and reports
-- directly against the hosted project (migrations 20260823150245,
-- 20260823150608, 20260823151006) without committing the SQL to this repo.
-- The migrations that follow this one replace that work with a schema that
-- adds allergen snapshots, a service fee and Plus waiver, refund and dispute
-- tracking, a payout ledger, and timezone-resolved pickup slots.
--
-- The old tables are RENAMED, not dropped. They hold three real orders whose
-- rows reference live Stripe PaymentIntents and Charges — including a
-- completed sale and a processed refund — plus a moderation case an admin
-- resolved. That is a financial record; it does not get deleted on the way
-- past. A JSON snapshot also sits in supabase/backups/.
--
-- Once the new schema has been exercised and anything worth keeping has been
-- migrated across, these can be dropped in a later, deliberate migration.

-- ---------------------------------------------------------------------------
-- 1. Move the tables aside
-- ---------------------------------------------------------------------------

alter table if exists public.orders      rename to orders_legacy_20260823;
alter table if exists public.order_items rename to order_items_legacy_20260823;
alter table if exists public.reviews     rename to reviews_legacy_20260823;
alter table if exists public.reports     rename to reports_legacy_20260823;

comment on table public.orders_legacy_20260823 is
  'Retired 2026-08-25. Superseded by public.orders. Rows reference real Stripe objects — check Stripe before deleting. Snapshot: supabase/backups/20260825_pre_schema_replacement.json';

-- ---------------------------------------------------------------------------
-- 2. Drop the functions the old schema owned
-- ---------------------------------------------------------------------------
-- CASCADE removes the triggers still bound to the renamed tables, leaving them
-- as inert archives rather than live objects that fire on write.
--
-- Worth naming what the old create_order did: it accepted `p_platform_fee_bps`
-- as an argument. It is reachable over PostgREST, so the commission was a
-- number the customer could choose. The replacement reads it from
-- platform_settings instead.

drop function if exists public.create_order(uuid, jsonb, uuid, text, integer);
drop function if exists public.advance_order_status(uuid, public.order_status, text);
drop function if exists public.refresh_vendor_rating(uuid) cascade;
drop function if exists public.reviews_sync_vendor_rating() cascade;
drop function if exists public.reviews_set_author_name() cascade;
drop function if exists public.reviews_guard_update() cascade;
drop function if exists public.reports_guard() cascade;
drop function if exists public.orders_touch_updated_at() cascade;

-- ---------------------------------------------------------------------------
-- 3. Move the conflicting enum types aside
-- ---------------------------------------------------------------------------
-- The renamed tables keep using these; the columns follow the type rename.
--
--   order_status  — the old set had `preparing` and spelled it `cancelled`;
--                   the new one drops `preparing` and uses `canceled`, plus
--                   `rejected` for a kitchen declining an order.
--   report_status — same labels, but recreated by the new migration, so the
--                   name has to be free.

alter type public.order_status  rename to order_status_legacy_20260823;
alter type public.report_status rename to report_status_legacy_20260823;

-- `report_subject` is not reused by the new schema (which validates
-- subject_type with a CHECK, so `menu_item` could be added without a type
-- change), so it stays where it is, owned by the retired table.

-- ---------------------------------------------------------------------------
-- 4. Denormalised rating columns
-- ---------------------------------------------------------------------------
-- vendors.rating_avg / rating_count were maintained by the trigger dropped
-- above, so they are now frozen. They are left in place rather than dropped:
-- the new public.vendor_ratings view supersedes them, and removing columns
-- from a table with live rows is not worth the risk in the same pass that
-- replaces the ordering schema. Drop them once nothing reads them.

comment on column public.vendors.rating_avg is
  'Stale as of 2026-08-25 — the maintaining trigger was retired. Read public.vendor_ratings instead.';
comment on column public.vendors.rating_count is
  'Stale as of 2026-08-25 — the maintaining trigger was retired. Read public.vendor_ratings instead.';
