# FreshFork — Build Log (Session Source Material)

Factual record of one AI-assisted development session. Written for use as raw
material in a thesis methodology/results section — not a narrative, not
polished. Where something isn't verifiable from the session transcript itself,
it's marked "not clear from this session" rather than inferred.

**Scope note:** this log covers only the session in which it was written. The
codebase had prior history (Phase 0–3 already built, a Figma file referenced
in the README, an existing live Supabase project) that predates this session
and is not documented here except where this session's actions intersected
with it.

**Model note:** the session used a mix of Claude Opus and Claude Sonnet models,
switched by the user mid-session via `/model` commands. Which model produced
which specific output is not reliably reconstructable from the transcript.

---

## 1. Build chronology

### Step 1 — Backend audit (no code changes)

**Asked for:** "are all the functionalities enough for a complete end product,
are they fully tested and do you think it lacks anything on the backend part?"

**What happened:** Read existing source files (`src/lib/`, `src/app/api/`,
`supabase/migrations/`), ran `git status`/`git log`, checked `package.json` for
a test script (none existed). Produced a written assessment, no code changes.

**Findings reported:**
- No orders/checkout system existed (`orders` page was a stub, no `orders`
  table in migrations)
- `platform_fee_bps` and Resend env vars were defined but read by nothing
- `/api/geocode` called `getViewer()` and discarded the result — no actual
  rate limiting
- Stripe webhook had no idempotency handling
- Stripe object creation (`accounts.create`, `customers.create`) had no
  idempotency keys
- Several functions swallowed DB errors into empty-array/free-plan fallbacks,
  making outages indistinguishable from empty states
- `refreshStripeStatus` was exported from a `"use server"` file, making it a
  publicly callable action taking an arbitrary vendor ID (authorization was
  correct, but it was unrate-limited)
- `cert_doc_path` was accepted from the client with no ownership validation
- No test framework installed, no CI
- Reviews/reports (Phase 5) not started

**Deviation:** none — this step was analysis only.

---

### Step 2 — "Add all the missing functionalities that you found"

**Asked for:** implement everything from the Step 1 findings.

**What was built:**

*Database (written as local `.sql` files only — not yet applied to any
database at this point):*
- `20260825090000_phase4_platform_infrastructure.sql` — `rate_limits` table +
  `consume_rate_limit()` function, `stripe_events` table + claim/finish/release
  functions for webhook idempotency, `admin_actions` audit table,
  `storage_orphans` table + reap triggers on `menu_items`/`vendors`,
  storage-path ownership guard triggers, `memberships.updated_at` trigger,
  bounded `past_due` grace period on the `my_membership` view (14 days)
- `20260825091000_phase4_orders_schema.sql` — `orders`, `order_items` tables
  with guard triggers enforcing writes only through RPCs, `payout_ledger`
  table, `vendor_balances` view
- `20260825092000_phase4_order_lifecycle.sql` — `platform_settings` table,
  `create_order()`, `mark_order_paid()`, `fail_order_payment()`,
  `record_order_refund()`, `record_order_dispute()`, `record_order_transfer()`,
  `advance_order_status()`, `cancel_order()`, `expire_stale_orders()`
- `20260825093000_phase5_reviews_and_reports.sql` — `reviews` table anchored
  to completed orders (one review per order, enforced by unique constraint),
  `vendor_ratings` view, `reports` table + triage functions
- `20260825094000_phase4_pickup_slots_and_account_deletion.sql` —
  `vendor_pickup_slots()` function (expands recurring pickup windows into
  bookable dated slots), `delete_my_account()` function

*Application code:*
- `src/lib/log.ts` — structured logging + Sentry error reporting over the raw
  envelope HTTP endpoint (no `@sentry/nextjs` SDK dependency)
- `src/lib/rate-limit.ts` — wrapper around `consume_rate_limit()`, fails open
  if Supabase is unreachable
- `src/lib/fees.ts` — pure fee-calculation functions (mirrors the SQL logic in
  `create_order()`)
- `src/lib/settings.ts` — reads `platform_settings`
- `src/lib/email/templates.ts` + `send.ts` — Resend integration over raw
  `fetch` (no SDK), HTML+text email bodies for order events
- `src/lib/cart.ts`, `src/lib/cart-limits.ts` — cookie-based basket
- `src/lib/orders.ts` — order read/query helpers
- `src/lib/vendor-access.ts`, `src/lib/vendor-stripe.ts` — moved
  `refreshStripeStatus` out of the `"use server"` actions file into a plain
  module, added rate limiting to it
- `src/lib/stripe/orders.ts` — Stripe Checkout Session creation for orders
  (destination charges), refund handling, checkout session closing
- Server actions: `src/lib/actions/cart.ts`, `orders.ts`, `community.ts`,
  `account.ts`
- Rewrote `src/app/api/webhooks/stripe/route.ts` — added idempotency via
  `stripe_events` claim/release, handlers for
  `checkout.session.completed/expired`, `payment_intent.payment_failed`,
  `charge.refunded`, `charge.dispute.created`, `account.updated`,
  `customer.subscription.*`
- New routes: `src/app/api/health/route.ts`,
  `src/app/api/cron/maintenance/route.ts` (bearer-token authenticated,
  constant-time comparison)
- Rewrote `src/app/api/geocode/route.ts` — added dual-window rate limiting
  (per-user and per-IP)
- `next.config.ts` — added CSP and other security headers (none existed
  before)
- New UI pages: `/checkout`, `/orders/[id]`, `/dashboard/vendor/orders`,
  `/dashboard/admin/settings`, `/dashboard/admin/reports`,
  `DeleteAccountForm` on `/account`
- Test infrastructure: installed `vitest` + `@vitest/coverage-v8`, wrote
  `vitest.config.ts`, unit test files for fees, membership status mapping,
  validation schemas, email templates
- pgTAP test files `01_rls_identity.sql`, `02_order_lifecycle.sql`

**Deviation from ask:** none explicitly — this was an open-ended "build
everything" instruction, and the assistant's own judgment determined scope and
implementation choices (e.g., Stripe Checkout Sessions over PaymentIntents
directly, cookie-based cart over a DB table, offline currency/timezone
handling in a later step).

**Verification performed at this step:** `tsc --noEmit`, `eslint`, `vitest
run`, `next build` — all run locally via PowerShell/Bash, all passed after
fixes (see Section 2). **No migration was applied to any database at this
point** — the SQL files existed only in the local repo.

---

### Step 3 — "Where should I run `supabase test db`?"

**Asked for:** clarification on running the pgTAP suite.

**What happened:** assistant explained the Supabase CLI requires Docker
locally, checked (`which supabase`, `docker --version`) and confirmed neither
was installed in the sandbox environment. Gave instructions for running it on
the user's own machine, and an alternative (paste migrations + pgTAP files
into the Supabase Dashboard SQL Editor).

**No code changes at this step.**

---

### Step 4 — "Why can't you do this using the Supabase MCP like you did for
all the other migrations?"

**Note:** the user's premise was incorrect — the assistant had not used the
Supabase MCP for anything prior to this point; the earlier migrations visible
in the repo predated this session. The assistant confirmed this directly
rather than accepting the premise.

**What happened:**
- Called `list_projects` (first time in the session) — found a linked,
  active Supabase project ("FreshFork", `mgydmamjspbagbtquwen`)
- Called `list_migrations` on that project — found **three migrations that
  existed on the live database but not in the local repo**:
  `phase4_orders` (20260823150245), `phase5_reviews_and_reports`
  (20260823150608), `phase4_5_display_name_snapshots` (20260823151006)
- Called `list_tables` — found the live `orders` table had **3 real rows**,
  `order_items` had 4, `reviews` had 1, `reports` had 1
- Compared the live schema column-by-column against the Step 2 migration
  files and found they were **structurally different, not just missing
  locally**: the live schema had no service fee / Plus waiver concept, no
  allergen snapshots on order items, no refund-amount tracking (only a
  `payment_error` text field), no payout ledger, a sequential order code
  (`FF-00001`) instead of the random code the new migrations generated, and
  the live `create_order()` took `p_platform_fee_bps` as a caller-supplied
  argument (reachable over PostgREST)
- Pulled full row data for the 3 live orders and backed it up to
  `supabase/backups/20260825_pre_schema_replacement.json`, including real
  Stripe object IDs (`pi_3U7ggU0TOe7plifg1hDyVFSM`,
  `ch_3U7gni0TOe7plifg05XMLrDM`, etc. — one order shows a completed sale, one
  shows a paid-then-refunded order, one shows a failed payment)
- Asked the user via a structured question how to reconcile the two schemas
  (options: replace live with new, keep live and adapt code, show full schema
  first, or pause). **User chose "replace live schema with mine (backing up
  first)."**

**Deviation:** the assistant did not simply apply the pre-written migration
files. It inserted an additional migration
(`20260825085000_phase4_retire_legacy_order_schema.sql`) to **rename** (not
drop) the live `orders`, `order_items`, `reviews`, `reports` tables to
`*_legacy_20260823`, rename their enum types, and drop the old
`create_order()`/`advance_order_status()`/review-sync functions, before
applying the new schema.

---

### Step 5 — Applying the migrations via MCP

**What happened, in order:**
1. Before applying, found and fixed a bug of its own making: the new
   storage-path-ownership guard trigger (`vendors_guard_paths`) would have
   validated *all* columns on every update, including unchanged ones — which
   would have thrown on every existing vendor row, because all 8 seeded
   vendors carried a placeholder `fixture/cert.pdf` path that doesn't match
   the ownership-prefix rule. Fixed by changing the trigger to only validate
   columns that are actually being changed.
2. Applied the retire-legacy migration via `apply_migration` — succeeded.
3. Attempted to apply `phase4_orders_schema` — **failed** with
   `ERROR: 42P07: relation "orders_customer_idx" already exists`. Renaming a
   table in Postgres does not rename its indexes/constraints, so the
   `*_legacy_20260823` tables still held names like `orders_pkey` and
   `orders_customer_idx` that the new schema needed.
4. Wrote and applied a second fix-up migration
   (`20260825085500_phase4_retire_legacy_index_names.sql`) that walks
   `pg_constraint`/`pg_index` and renames every constraint/index on the
   `*_legacy_20260823` tables with an `_lg23` suffix.
5. Re-applied `phase4_orders_schema` — succeeded.
6. Applied the remaining migrations (`phase4_order_lifecycle`,
   `phase5_reviews_and_reports`, `phase4_pickup_slots_and_account_deletion`)
   — succeeded on first attempt each.
7. Ran `get_advisors` (Supabase's built-in security linter) — returned INFO/WARN
   level findings (some tables had RLS enabled with no policies — intentional,
   service-role-only tables; several `SECURITY DEFINER` functions callable by
   `anon`/`authenticated` — intentional, by design; leaked-password protection
   disabled — pre-existing, addressed in Step 6). No CRITICAL/ERROR findings.
8. Attempted `generate_typescript_types` to regenerate the TypeScript types
   file from the live schema — **failed**: the MCP tool's output (71,556
   characters) exceeded the tool's own maximum token limit and was written to
   a file instead of returned inline. The assistant did not read that file or
   regenerate the types file from it; instead it ran a targeted SQL query
   comparing `information_schema.columns` for the `orders` table against the
   manually-maintained TypeScript types file and confirmed an exact column
   match. **The TypeScript types file in the repo was hand-written/hand-edited
   throughout this session, not machine-generated**, despite a comment at the
   top of that file stating it should be regenerated after every migration.

**Verification after applying:** re-ran `tsc --noEmit`, `eslint`, `vitest
run`, `next build` locally — all passed.

**Deviation from what the file header comments claim:** the
`database.types.ts` file's own header comment says "Regenerate after every
migration — do not hand-edit." This session did not follow that; it was
hand-edited throughout because the generation tool's output exceeded the
tool's size limit.

---

### Step 6 — Three follow-up requests in one message

**Asked for:**
1. Leaked-password protection (user stated they don't have Supabase Pro, so
   the built-in feature is unavailable)
2. A different solution to the `vendors.timezone` problem (previously
   identified as defaulting to `Europe/London` with nothing setting it)
3. Keep the legacy tables (explicitly, for thesis material) rather than
   dropping them

**What was built:**

*Leaked-password protection:* `src/lib/auth/pwned.ts` — implements the
k-anonymity check against the Have I Been Pwned Pwned Passwords API directly
(free, no API key), independent of Supabase's own Pro-only feature. SHA-1
hash computed locally, only the first 5 hex characters sent. Wired into the
`signUp` server action in `src/lib/actions/auth.ts`. Fails open (allows
signup) if the HIBP API is unreachable. Verified against the live HIBP API
during the session (not mocked) with 4 sample passwords — 3 flagged, 1 clean —
before writing the corresponding unit tests, which are mocked.

*Timezone:* investigated and found a real bug: all 8 existing vendor rows
were set to `Europe/London` (the column default) despite being located in
Brooklyn, New York (confirmed by querying `ST_Y`/`ST_X` on their `location`
column). This meant every pickup time for those vendors was being resolved 5
hours from the intended time. Fixed by:
- Installing `tz-lookup` (offline coordinate→IANA-zone lookup, ~150KB,
  public domain) — chosen over `geo-tz` (rejected: ~73MB unpacked, too large
  for a serverless bundle)
- Writing a hand-authored `.d.ts` file for `tz-lookup` since it ships no
  types
- `src/lib/geo/timezone.ts` — derives timezone from lat/lng, falls back to
  `UTC` (changed from `Europe/London`) on invalid input
- A new migration (`20260825100000_phase4_vendor_timezone_derivation.sql`)
  that changes the column default to `UTC`, adds a trigger validating the
  timezone against `pg_timezone_names`, and backfills the 8 existing vendors'
  timezone to `America/New_York` (values computed by running `tz-lookup`
  against their actual coordinates in a throwaway Node script, then hardcoded
  into the migration by vendor ID)
- Wired `timezoneForCoordinates()` into `saveAddress()` in
  `vendor-onboarding.ts` so future address submissions derive the timezone
  automatically

*Legacy tables:* no schema change — documented their existence and contents
in the README instead of dropping them, per instruction.

**Deviation:** none flagged by the user at this step.

---

### Step 7 — "FreshFork market is Europe... create vendors and clients from
different European cities"

**Asked for:** relocate/create test data across multiple European cities for
final testing, given the market is Europe (not the US, as the seed data had
implied).

**Context the assistant surfaced before acting:** in the prior turn's closing
summary, the assistant had flagged that the Mapbox geocoder was already
scoped to a Europe-only bounding box while all seed/vendor data was in
Brooklyn — i.e., the bounding box was correct and the data was wrong. The user
confirmed Europe was the intended market.

**What was built:**
- Queried the 8 existing vendors' exact coordinates before changing anything
- New migration (`20260825110000_phase6_european_market.sql`):
  - Added `vendors.currency` column (ISO 4217, lowercase, format-checked)
  - Relocated the 8 existing vendors to real addresses in Berlin, London,
    Madrid, Paris, Amsterdam, Lisbon, Bucharest, and Warsaw — chosen to keep
    each vendor's existing cuisine plausible for the city, each given a
    country-appropriate certification label string
  - Changed `create_order()` to read `currency` from the vendor row instead
    of the column default (previously always `usd`, i.e., every order was
    denominated in dollars regardless of vendor location)
- Additional migrations applied via MCP (not all written as local files
  first — see Section 2 gap noted below): 4 new vendor accounts (Athens,
  Dublin, Stockholm, Rome) + 4 new customer accounts, each with menus and
  pickup windows; `search_menu_items()` updated to return a `currency` column
- Set a single known password (value redacted; it was committed to the repo at
  the time, and was rotated on 2026-08-28 before public hosting) on all
  `@freshfork.test` accounts, both the pre-existing ones and the newly
  created ones, via a direct `UPDATE` on `auth.users` (not a migration file)
  so they could actually be signed in as during testing. Because that `UPDATE`
  matched on the email domain rather than on the seed's account list, it also
  caught `pilot-admin@freshfork.test` — giving a publicly-documented password
  to an `admin` account, which is the defect the 2026-08-28 rotation fixed.
- App-layer currency work: `formatPrice()` rewritten to take a currency
  parameter and use `Intl.NumberFormat`; email template `money()` helper
  updated the same way; every UI call site of `formatPrice` updated to pass
  the relevant currency; `DishResult` type gained a `currency` field
- Rewrote `supabase/seed.sql` entirely (previously 2 Brooklyn vendors) to the
  4 new European vendors with the same city/currency spread
- New pgTAP file `03_currency_and_timezone.sql` (10 assertions)
- README updated with a login table (all pilot account emails, cities,
  currencies) and a coordinate table for testing discovery from each city

**Verification performed:**
- Ran a live SQL query simulating a `search_menu_items()` call from each of
  the 12 city coordinates — confirmed each returns the correct local vendor
  and correct currency
- Ran a live SQL query resolving pickup window start times through each
  vendor's timezone — confirmed Athens (UTC+3 in the tested period), Rome
  (UTC+2), and Dublin (UTC+1) all converted correctly, including DST
- Ran the new pgTAP assertions via MCP `execute_sql` (same pattern as Step
  5) — 8/8 passed, then 10/10 after the file was finalized
- `tsc --noEmit`, `eslint`, `vitest run` (93 tests), `next build` — all
  passed

**Deviation / gap not corrected within the session:** three of the migrations
applied via `apply_migration` in this step —
`phase6_european_pilot_accounts`, `phase6_european_pilot_menus`, and
`phase6_search_returns_currency` — were **not** written as corresponding
files in the local `supabase/migrations/` directory. The local repo's
migration history is therefore incomplete relative to what was actually
applied to the live database as of the end of this session. This was not
caught or flagged during the session itself; it is being noted here for the
first time while compiling this log.

---

### Step 8 — This build log

**Asked for:** this document.

---

## 2. Errors and fixes

| # | What broke | Exact error | Attempts | Fix | User had to intervene? |
|---|---|---|---|---|---|
| 1 | Bash heredoc SQL writes failed early in Step 2 | `/usr/bin/bash: -c: line 203: unexpected EOF while looking for matching ''` | 1 (then abandoned the approach) | Switched from Bash heredocs to the `Write` tool for all subsequent SQL file creation | No |
| 2 | Unit tests failed on first run in Step 2 | 3 failing tests: negative-price parsing accepted (`"-5"` parsed as a positive price), same bug in refund-amount parsing, `escapeHtml()` didn't escape apostrophes | 1 fix cycle (wrote `src/lib/money.ts` with strict parsing, escaped apostrophes, then one further test-expectation fix for a sub-cent-precision case) | Rewrote money-string parsing to reject negatives/malformed input instead of silently coercing them; added apostrophe to the HTML-escape function | No |
| 3 | Migration apply failed in Step 5 | `ERROR: 42P07: relation "orders_customer_idx" already exists` | 1 failed attempt, then fixed | Wrote and applied a migration to rename every index/constraint on the renamed-aside legacy tables before re-applying the new schema | No |
| 4 | pgTAP schema permission error while running tests via MCP | `ERROR: 42501: permission denied for schema tests` | 1 | Added `grant usage on schema tests to authenticated, anon;` and `grant execute on all functions in schema tests to authenticated, anon;` before the test blocks | No |
| 5 | One pgTAP assertion failed in Step 5's first full run | `not ok 24 - a stranger cannot advance an order` / `caught: 22P02: invalid input syntax for type uuid: ""` | 1 | Root cause: the test looked up an order ID *while impersonating a user who could not see it* (RLS correctly hid it), producing an empty string passed into a function expecting a UUID — the policy was working, the test was flawed. Fixed by capturing the order ID into a temp table before switching roles. | No |
| 6 | Node script couldn't resolve `tz-lookup` | `Error: Cannot find module 'tz-lookup'` / `MODULE_NOT_FOUND` | 1 | Script was run from `/tmp`, outside the project's `node_modules`. Fixed by copying the script into the project root before running it. | No |
| 7 | `generate_typescript_types` MCP call failed | `result (71,556 characters across 1 line) exceeds maximum allowed tokens` | 1 (not retried — worked around) | Did not regenerate the types file from this output. Verified schema match via a targeted `information_schema.columns` query instead. Types file remained hand-maintained. | No |
| 8 | TypeScript compile errors after threading currency through the codebase in Step 7 | `'cart.vendor' is possibly 'null'` (checkout/page.tsx); `Cannot find name 'currency'` (templates.ts); `Expected 1 arguments, but got 2` ×2 (templates.ts, `linesText` call sites) | 1 fix cycle | Hoisted a narrowed `vendor` const in the checkout page; added a `currency` parameter to `linesText()` and updated both call sites | No |
| 9 | One unit test failed after the currency work | `expected 'Your order from Auntie Bee's Kitchen…' to contain '$39.90'` | 1 | Test asserted the old hardcoded dollar-sign format; updated the test to expect euro formatting by default and added new assertions for GBP/SEK rendering | No |
| 10 | `npm install` warnings (not errors) | `npm warn allow-scripts` for `esbuild`/`unrs-resolver` postinstall scripts not covered by `allowScripts` | 0 — not addressed | Left as-is; scripts were not approved or run | No |

**Manual interventions by the user (outside the assistant's own tool calls),
as evidenced in the transcript:**
- The user enabled the `pgtap` Postgres extension on the live Supabase
  project themselves via the Supabase dashboard, stated explicitly: "i have
  checked the extension pgtap." This was not done by the assistant.
- The user made three explicit product/scope decisions when asked: (a)
  "replace live schema with mine" when presented with the schema-conflict
  choice in Step 4; (b) accept leaked-password protection staying disabled at
  the Supabase-platform level (compensating control built instead); (c) keep
  the legacy tables rather than drop them.
- The user switched the active model (`/model claude-sonnet-5`,
  `/model claude-opus-5`) at several points via slash commands. This is
  session configuration, not a code or content intervention.

**No evidence in the transcript of the user directly editing a file,
running a terminal command themselves and reporting output back, or looking
up external documentation and pasting it in.** All code changes, SQL, and
verification commands in this session were executed by the assistant via its
own tools.

---

## 3. Features simplified, skipped, or blocked

- **`supabase test db` (the actual CLI command) was never executed in this
  session.** Docker and the Supabase CLI were both confirmed absent from the
  sandbox environment (`which supabase` / `docker --version` both failed).
  All pgTAP validation was done by manually running equivalent SQL — the
  same `plan()`/`is()`/`throws_ok()` calls the `.sql` test files contain —
  through the MCP's `execute_sql` tool, wrapped in `begin; ... rollback;`
  blocks against the live database. This is functionally similar but is not
  the same as running the CLI test harness the `npm run test:db` script
  documents.
- **No browser-based / UI verification was performed at any point in this
  session.** No dev server was started, no page was rendered, no manual
  click-through happened. All verification was `tsc --noEmit`, `eslint`,
  `vitest run`, `next build`, and direct SQL queries against the live
  database. The assistant's own final summaries repeatedly describe the new
  UI as "functional but unstyled" — this is asserted, not demonstrated within
  the session.
- **No live/end-to-end Stripe test was performed.** No `stripe listen` was
  invoked, no actual Checkout Session was created and completed through a
  browser, no webhook delivery was tested against the new handler code. The
  webhook logic, idempotency handling, and refund logic were written and
  passed static type/lint checks, but were not exercised against real Stripe
  events in this session. The Stripe object IDs present in the backed-up
  legacy order data (`pi_3U7ggU0...`, `ch_3U7ggU0...`) were created by
  whatever process built the legacy schema, predating this session — not by
  this session's work.
- **The TypeScript types file (`src/lib/supabase/database.types.ts`) is
  hand-maintained, contrary to its own header comment** ("Regenerate after
  every migration — do not hand-edit"), because the code-generation tool's
  output exceeded the calling tool's size limit once and was not retried or
  worked around by another method (e.g., paging the output).
- **Three applied migrations have no corresponding file in
  `supabase/migrations/`** (see Step 7's noted gap): the new pilot vendor
  accounts, their menus/pickup windows, and the `search_menu_items()` currency
  change. The local migration history is not a complete record of what was
  applied to the live database by the end of the session.
- **Cross-currency Stripe payout mechanics were not tested or fully
  resolved.** The assistant flagged, but did not verify or resolve, that
  Stripe destination charges settling into a different currency than the
  platform account holds incur FX fees and may have country-support
  constraints. This was left as a stated caveat, not implemented or tested.
- **Leaked-password protection is not equivalent to Supabase's native
  feature.** The custom HIBP check in `pwned.ts` is only invoked from the
  app's own `signUp` server action. It would not catch a user created through
  Supabase's Auth API directly, an admin-created user, or (if ever added) an
  OAuth signup — Supabase's built-in Pro feature would apply at the Auth
  service level regardless of entry point. This distinction was not raised
  to the user during the session.
- **Figma was not used in this session.** The README (pre-existing, not
  written in this session) references a Figma file and design tokens, but no
  Figma MCP tool was called at any point in this transcript. Not clear from
  this session whether/how Figma was used for the parts of the UI that exist.
- **No performance, load, or accessibility testing of any kind** was
  performed or claimed.

---

## 4. Architecture summary

### Database schema (as of end of session)

**Core tables (pre-existing, not created this session):** `profiles`,
`vendors`, `menu_items`, `pickup_windows`, `memberships`.

**Tables created this session:**
- `rate_limits` (bucket text PK, window_start, hits) — service-role only
- `stripe_events` (id text PK = Stripe event id, type, event_created,
  processed_at, error) — webhook idempotency ledger
- `admin_actions` (append-only audit log: actor_id, action, subject_type,
  subject_id, note, metadata jsonb)
- `storage_orphans` (bucket, object_path, queued_at, deleted_at, attempts) —
  garbage-collection queue for deleted files
- `orders` (id, code, customer_id, vendor_id, status enum, pickup_window_id,
  pickup_at/pickup_ends_at timestamptz, currency, subtotal_cents,
  service_fee_cents, platform_fee_cents, total_cents, vendor_payout_cents,
  platform_fee_bps, stripe_checkout_session_id, stripe_payment_intent_id,
  stripe_charge_id, stripe_transfer_id, refunded_cents, refund_state enum,
  disputed_at, canceled_by, cancel_reason, stock_returned bool, timestamps for
  each lifecycle stage) — CHECK constraints enforce
  `total_cents = subtotal_cents + service_fee_cents` and
  `vendor_payout_cents = subtotal_cents - platform_fee_cents`
- `order_items` (order_id FK, menu_item_id FK nullable, `name_snapshot`,
  `section_snapshot`, `unit_price_cents`, `quantity`, `line_total_cents`,
  `allergens_snapshot text[]`, `dietary_snapshot text[]`,
  `prep_note_snapshot`) — immutable after insert (enforced by trigger)
- `payout_ledger` (append-only signed money-movement log: order_id, vendor_id,
  kind enum [sale/service_fee/platform_fee/transfer/refund/fee_reversal/
  dispute/adjustment], amount_cents, currency, stripe_object_id)
- `platform_settings` (single-row config table: fee basis points, service-fee
  min/max, order lead time, booking horizon, checkout TTL, cancel cutoff, max
  concurrent checkouts)
- `reviews` (order_id FK unique — one review per order, vendor_id, customer_id,
  rating 1-5, body, vendor_reply, is_hidden, hidden_reason, hidden_by)
- `reports` (reporter_id, subject_type, subject_id, reason enum, detail,
  status enum, resolution_note, resolved_by, resolved_at)

**Views created this session:** `vendor_balances`, `vendor_ratings`, and a
rewritten `my_membership` (added `grace_ends_at`, bounded `past_due` grace to
14 days).

**Columns added to existing tables this session:** `vendors.timezone` (text,
IANA zone, default changed from `Europe/London` to `UTC` mid-session),
`vendors.currency` (text, ISO 4217 lowercase, CHECK-constrained format),
`profiles.deleted_at`.

**Legacy tables retained (renamed, not dropped) at the user's explicit
instruction:** `orders_legacy_20260823`, `order_items_legacy_20260823`,
`reviews_legacy_20260823`, `reports_legacy_20260823` — hold 3 orders, 4 order
items, 1 review, 1 report from a prior (pre-session) implementation. A JSON
snapshot of these rows is also kept at
`supabase/backups/20260825_pre_schema_replacement.json`.

**Key security-relevant constraints:**
- `authenticated` role has `SELECT`-only grants on `orders`, `order_items`,
  `payout_ledger`; all writes go through `SECURITY DEFINER` functions
- Guard triggers on `orders`/`order_items` reject direct writes from any
  non-service-role caller not going through the designated RPCs (enforced via
  a transaction-local `current_setting()` flag pattern, e.g.
  `freshfork.allow_order_write`)
- `vendors.is_live` is a derived/trigger-maintained boolean, not directly
  writable — requires both admin approval (`status = 'approved'`) and Stripe
  Connect completion (`stripe_connect_status = 'complete'`)
- A storage-path-ownership guard trigger validates that
  `cert_doc_path`/`hero_image_path`/`avatar_image_path`/`photo_path` values
  begin with the owning row's own ID (added this session; retroactively
  scoped to only validate *changed* values after it was found to break
  existing seeded rows — see Section 2)

### Auth / RBAC (mostly pre-existing; this session added enforcement in new
areas, did not redesign the core model)

- Supabase Auth (email + password) for identity
- `profiles.role` enum: `customer` / `vendor` / `admin`
- Role assigned at signup via a database trigger (`handle_new_user`,
  pre-existing) reading `raw_user_meta_data`, clamped so `admin` cannot be
  self-assigned regardless of what the signup request claims
- A second trigger (`profiles_guard_update`, pre-existing) blocks a user from
  changing their own `role` via a direct table update
- Admin role can only be granted by a manual `UPDATE` run directly against the
  database — no UI path exists for it, by design
- Authorization enforced in two layers throughout: server actions call
  `requireRole()`/`requireViewer()` helpers (pre-existing pattern, reused this
  session for new actions), and RLS policies + `SECURITY DEFINER` functions
  enforce the same rules at the database level independently, since a server
  action is not the only way to reach PostgREST

### Stripe integration

- **Mode: test only.** `.env.example` specifies `sk_test_`/`pk_test_` key
  prefixes. No evidence in this session of live-mode keys or a live charge.
- **Connect:** Express accounts (pre-existing onboarding flow, reused/rate-
  limited this session), `account.updated` webhook drives
  `stripe_charges_enabled`/`stripe_payouts_enabled`/`stripe_connect_status`
- **Checkout:** Stripe Checkout Sessions used for both order payment (new
  this session) and the pre-existing Plus membership subscription. Order
  checkout uses `mode: "payment"` with `payment_intent_data` carrying
  `application_fee_amount` and `transfer_data.destination` (destination
  charge pattern) — the customer pays FreshFork, Stripe splits off the
  platform's commission + service fee, the remainder settles to the vendor's
  connected account
- **Webhooks handled (new this session, except account.updated and
  subscription.* which were pre-existing):**
  `checkout.session.completed`, `checkout.session.expired`,
  `payment_intent.payment_failed`, `charge.refunded`,
  `charge.dispute.created`, plus the pre-existing `account.updated` and
  `customer.subscription.created/updated/deleted`
- **Idempotency (new this session):** every webhook event is claimed via
  `claim_stripe_event()` (inserts the Stripe event ID as a primary key; a
  duplicate insert is detected and the event is acknowledged with 200 without
  re-processing). If the handler throws, `release_stripe_event()` deletes the
  claim so Stripe's retry isn't silently swallowed. Subscription state is
  re-fetched from Stripe rather than trusted from the event payload, so
  out-of-order webhook delivery can't regress state.
- **Refunds:** `refunds.create()` called with `reverse_transfer: true` and
  `refund_application_fee: true`; idempotency key derived from order ID +
  running refunded total

### Mapbox integration

- Used for forward geocoding only (address → coordinates), via
  `/api/geocode`, called from the vendor onboarding address step and a
  customer location bar (both pre-existing UI, the route itself was rewritten
  this session to add rate limiting)
- Bounding box restricted to Europe (`bbox=-25,34,45,71`) — this was
  pre-existing and, per Step 7, was in fact correct for the stated market; the
  seed/vendor data was wrong, not the geocoder config
- Not clear from this session whether/how Mapbox map tiles (mentioned in the
  README's stack list) are wired in — no tile-rendering code was reviewed or
  touched this session

### Figma / design handoff

**No Figma work occurred in this session.** No Figma MCP tool was called. The
pre-existing README references a Figma file and a design-token table; this
session did not verify, use, or update that connection. All UI built this
session used plain semantic HTML with no styling applied, per the assistant's
own repeated characterization ("functional but unstyled").

---

## 5. Time / effort signals

**Explicit wall-clock timing: not clear from this session.** The transcript
contains no elapsed-time statements from either party. File modification
timestamps observed via `ls -la` late in the session show files touched
between roughly 11:59 and 15:02 on a single date (per the sandbox clock), but
this reflects tool-call timestamps within one sandbox session, not a
verified real-world duration, and doesn't cover the full session (earlier
steps weren't captured this way).

**Turn count:** 7 substantive user requests drove the entire session (backend
audit; "add all the missing functionality"; a clarifying question about
running tests; a clarifying question about MCP usage; a 3-part follow-up
request; the Europe/currency request; this build-log request). Several of
these were answered in a single long assistant turn involving many tool
calls (e.g., the "add all the missing functionality" step produced roughly
40+ new/modified files in one continuous response).

**Iteration counts by feature (from Section 2):**
- Money-parsing bug: 1 fix cycle after initial test failure
- Migration index-collision: 1 failed apply + 1 fix migration + successful
  re-apply
- pgTAP schema-permission error: 1 fix
- pgTAP test-logic bug (`not ok 24`): 1 fix
- Currency-threading TypeScript errors: 1 fix cycle covering 4 distinct
  compiler errors
- Everything else that was written passed type-check/lint/tests on first
  attempt after being written, as far as the transcript shows

**Verification cadence:** the assistant re-ran the full local check sequence
(`tsc --noEmit`, `eslint`, `vitest run`, `next build`) after essentially every
discrete unit of work — visible as a repeated pattern roughly 8-10 times
across the session.

**Scale of output (approximate, from file listings and migration content
visible in the transcript):**
- ~9 SQL migration files written to the local repo this session (plus at
  least 3 more migrations applied via MCP with no local file — see Section 3)
- 93 unit tests, 62 pgTAP assertions by the end of the session (both counts
  stated by the assistant and consistent with the `plan()` calls visible in
  the three pgTAP files)
- 12 vendor/kitchen accounts and 8 customer accounts in the final seed/pilot
  data set, spread across 12 European cities, 5 currencies
