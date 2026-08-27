# FreshFork

A local food marketplace connecting home cooks and small food producers ("vendors") with nearby customers who order dishes for **pickup**.

North star: [shef.com](https://shef.com) — warm, trustworthy, food-photography-driven, with food-safety trust signals front and center.

## Stack

- **Framework** — Next.js 16 (App Router) + React 19 + TypeScript
- **Styling** — Tailwind CSS v4, custom design tokens (see `src/app/globals.css`)
- **Backend** — Supabase (Postgres + PostGIS, Auth, Storage) — _wired_
- **Payments** — Stripe Connect Express + destination charges (vendor payouts and order charges) — _wired_. Stripe Billing (FreshFork Plus membership, $10/mo) — _wired_
- **Maps** — Mapbox (geocoding + tiles) — _wired_
- **Email** — Resend, over `fetch` (no SDK) — _wired_
- **Errors** — Sentry, over the envelope endpoint (no SDK) — _wired_
- **Timezones** — `tz-lookup`, offline coordinate → IANA zone — _wired_
- **Tests** — Vitest (pure logic) + pgTAP (RLS and order lifecycle) — _wired_
- **Hosting** — Vercel

## Getting started

```bash
# 1. Install
npm install

# 2. Copy env template and fill in what you need (Phase 0 only needs the app URL to run)
cp .env.example .env.local

# 3. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Supabase credentials are required from Phase 1 on. Stripe and Mapbox keys are
optional — without them the payouts step and address search show an inline
"not configured" message instead of failing.

Stripe webhooks in local dev:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Making someone an admin

There is deliberately no UI for this: signup clamps the role to `customer` or
`vendor`, and the `handle_new_user` database trigger clamps it again, so `admin`
can never be self-assigned. Grant it by hand in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

The admin queue then appears at `/dashboard/admin/vendors`.

### FreshFork Plus (membership)

A $10/mo subscription on the platform's own Stripe account (Billing, not
Connect) — separate from vendor payouts. `/pricing` has the two plans;
Checkout and the Billing Portal handle signup and self-serve cancellation.
`memberships.plan`/`status`/`stripe_*` are written only by the
`customer.subscription.*` webhook — never trust the Checkout success redirect.
Needs `STRIPE_PLUS_PRICE_ID` (a recurring Price id) alongside the Stripe keys
above.

### Demo data

`supabase/seed.sql` populates the marketplace with live kitchens across Europe,
for clicking through discovery without completing onboarding by hand. Paste it
into the SQL editor; the header comment says how to remove it again.

Every pilot account shares one password — **`FreshFork!Pilot2026`** — so any of
them can be signed in as. That is only acceptable because every address is
`@freshfork.test` and this is a development project.

| Role | Sign in as | Kitchen | City | Currency |
| --- | --- | --- | --- | --- |
| Cook | `pilot-amina-tesfaye@freshfork.test` | Ethiopian | Berlin | EUR |
| Cook | `pilot-jonah-bell@freshfork.test` | Baked goods | London | GBP |
| Cook | `pilot-marisol-villanueva@freshfork.test` | Filipino | Madrid | EUR |
| Cook | `pilot-nadia-haddad@freshfork.test` | Levantine | Paris | EUR |
| Cook | `pilot-priya-raman@freshfork.test` | Bengali | Amsterdam | EUR |
| Cook | `pilot-rosa-mendez@freshfork.test` | Oaxacan | Lisboa | EUR |
| Cook | `pilot-tomas-varga@freshfork.test` | Georgian | București | RON |
| Cook | `pilot-wei-lin@freshfork.test` | Sichuan | Warszawa | PLN |
| Cook | `pilot-eleni@freshfork.test` | Greek | Athina | EUR |
| Cook | `pilot-saoirse@freshfork.test` | Irish | Dublin | EUR |
| Cook | `pilot-lukas@freshfork.test` | Nordic | Stockholm | SEK |
| Cook | `pilot-giulia@freshfork.test` | Italian | Roma | EUR |
| Customer | `pilot-lea@freshfork.test`, `pilot-miguel@freshfork.test`, `pilot-katarzyna@freshfork.test`, `pilot-andrei@freshfork.test`, `pilot-dana@freshfork.test`, `pilot-marcus@freshfork.test`, `pilot-sam@freshfork.test`, `pilot-yuki@freshfork.test` | — | — | — |
| Admin | `pilot-admin@freshfork.test` | — | — | — |

Discovery takes coordinates, so search as if standing in a given city with
`/browse?lat=..&lng=..&loc=..`:

| City | lat, lng | City | lat, lng |
| --- | --- | --- | --- |
| Athens | `37.9838, 23.7275` | Lisbon | `38.7223, -9.1393` |
| Amsterdam | `52.3676, 4.9041` | London | `51.5072, -0.1276` |
| Berlin | `52.5200, 13.4050` | Madrid | `40.4168, -3.7038` |
| Bucharest | `44.4268, 26.1025` | Paris | `48.8566, 2.3522` |
| Dublin | `53.3498, -6.2603` | Rome | `41.9028, 12.4964` |
| Stockholm | `59.3293, 18.0686` | Warsaw | `52.2297, 21.0122` |

## Design system

Design lives in Figma → [FreshFork file](https://www.figma.com/design/blZqzMTB2SFuvmfMQqYbLZ/FreshFork).

Tokens (kept in sync with Figma):

| Token         | Hex        | Role                         |
| ------------- | ---------- | ---------------------------- |
| `forest`      | `#0e2a22`  | Primary ink, nav, CTAs       |
| `buttermilk`  | `#f7f4ec`  | Page background              |
| `persimmon`   | `#e86a3c`  | Accent, verified dot         |
| `sage`        | `#8fa687`  | Dietary tags, secondary      |
| `straw`       | `#d4c4a6`  | Hairlines, chip borders      |
| `card`        | `#fdfaf3`  | Card surface                 |

Type: **Fraunces** (display), **Inter** (body/UI), **IBM Plex Mono** (price + scarcity).

## Roadmap

Phase 0 — scaffold + tokens · **done**
Phase 1 — Supabase Auth + roles · **done**
Phase 2 — Vendor onboarding + menu CRUD + admin verification · **done**
Phase 3 — Customer discovery + Mapbox · **done**
Phase 4 — Ordering + Stripe charges + email receipts · **done**
Phase 5 — Reviews + reports · **done**
Phase 6 — Ordering UI, reviews/reports UI, multi-currency, pre-production QA · **done — ← you are here**

## Backend architecture

### Where the rules live

Business rules live in the database, not in server actions. A server action is
one way to reach PostgREST; it is not the only way, so anything that must hold
for every caller is a security-definer function or an RLS policy.

Concretely, `authenticated` has `SELECT` on `orders`, `order_items`, `reviews`
and `payout_ledger` and **no write access at all**. Every write goes through:

| Function | Who may call it | What it guarantees |
| --- | --- | --- |
| `create_order` | the customer | prices re-derived from the menu, stock decremented under a row lock, pickup slot validated, fees applied from `platform_settings` |
| `advance_order_status` | the kitchen, an admin | only the transitions that exist (`paid→accepted→ready→completed`) |
| `cancel_order` | the customer, an admin | stock returned exactly once, cutoff enforced |
| `mark_order_paid`, `record_order_refund`, `record_order_dispute` | `service_role` only | driven by Stripe webhooks; unreachable from a browser |
| `submit_review` | the customer | you bought it, it was handed over, and you haven't reviewed it already |

Fees are deliberately **not** request parameters. `create_order` reads them
from `platform_settings` and determines Plus status from `memberships` itself,
because anything passed in is something the customer could choose.

### Money

Integer cents everywhere; no floats in any SQL or TypeScript path.

Orders use Stripe **destination charges**: the customer pays FreshFork, Stripe
splits off `application_fee_amount` (our commission plus the customer-side
service fee), and the remainder settles to the cook's connected account. The
cook is therefore not on the hook for disputes or refunds.

Every money event also lands in `payout_ledger` as a signed row, so "why was
this payout smaller?" is answerable without reading the Stripe dashboard.

### Webhooks

`/api/webhooks/stripe` is the sole writer of `vendors.stripe_*`, all of
`memberships`, every order status past `pending_payment`, and the ledger.

Two guarantees Stripe does not provide on its own:

- **Exactly once** — `claim_stripe_event` inserts the event id and reports
  whether we won it. A redelivery is answered `200` and ignored. If the handler
  throws, the claim is released so the retry can work.
- **Latest wins** — subscription state is re-fetched from Stripe rather than
  read out of a possibly stale event payload, so out-of-order delivery cannot
  regress a member's plan.

### Currency

FreshFork sells across Europe, so there is no single platform currency. Each
kitchen has one, set from the country of its pickup address, and
`create_order()` copies it onto the order — where the guard trigger then
freezes it, because an order's currency must never move after the money did.

Amounts are integer minor units throughout: cents, grosze, öre. Every currency
in use divides by 100, so the arithmetic is uniform; only the rendering differs.
`formatPrice(cents, currency)` and the email templates take the code, and
nothing assumes a symbol.

Stripe destination charges settle to the connected account, so a cook in Warsaw
is paid in złoty. Cross-currency payouts (a euro-denominated platform paying a
kronor account) carry Stripe FX fees — worth checking before opening a market
whose currency the platform account does not hold.

### Timezones

`pickup_windows` stores a weekly rhythm ("Sundays, 18:00–20:00"), and
`create_order()` turns that into a real instant with
`(date + start_time) at time zone vendors.timezone`. The zone therefore has to
be right, and it has to travel with the address.

It is **derived, never asked for**: the address step already has a geocoded
coordinate, and `src/lib/geo/timezone.ts` maps that to an IANA name offline
via `tz-lookup` (~150 KB, public domain, no API key, no network call, no
failure mode). Postgres then validates the name against `pg_timezone_names`
before it can be stored, so a bad value is rejected at write time rather than
blowing up inside `at time zone` during a checkout.

The column defaults to `UTC` — deliberately neutral. It originally defaulted to
`Europe/London`, which read as correct and was not: every seeded vendor is in
Brooklyn, so every pickup time was being resolved five hours out. A default
that looks plausible is worse than one that looks unset.

### Retired schema (kept on purpose)

`orders_legacy_20260823`, `order_items_legacy_20260823`,
`reviews_legacy_20260823` and `reports_legacy_20260823` hold the first
ordering implementation and its data — three orders (one completed, one
refunded, one declined card), four line items, a review, and a moderation case
an admin resolved.

They are **retained as a record of how the system evolved**, not as dead
weight. The two schemas differ in ways worth writing about: the original
`create_order()` took `p_platform_fee_bps` as a caller argument (reachable over
PostgREST, so the commission was a number the customer could choose), had no
allergen snapshot on line items, no refund or dispute tracking, and no payout
ledger. A JSON snapshot of the rows also sits in `supabase/backups/`.

Do not drop them without checking Stripe first — `FF-24004` references a real
refunded charge.

### Scheduled maintenance

`POST /api/cron/maintenance` (bearer `CRON_SECRET`) returns stock from
abandoned checkouts, deletes storage objects whose owning row is gone, and
prunes rate-limit rows. Run it every 5–15 minutes. Without it, an abandoned
checkout holds the last portion of a dish until Stripe's own session expiry.

### Passwords

Supabase's breached-password check is a Pro-plan feature. The corpus behind it
— Have I Been Pwned's Pwned Passwords set — is free and keyless, so
`src/lib/auth/pwned.ts` queries it directly and signup gets the same
protection on the free plan.

The password never leaves the process. The API uses k-anonymity: we send the
first five hex characters of its SHA-1 digest, get back ~2,100 candidate
suffixes, and compare locally. Padding is requested so the response size leaks
nothing either. The check **fails open** — a third party's outage must not
block registration.

### Rate limiting

Counted in Postgres (`consume_rate_limit`), because serverless instances share
no memory. Budgets are named in `src/lib/rate-limit.ts`. It **fails open** if
the database is unreachable — an unavailable limiter should not take down
sign-in — and logs loudly when it does.

## Testing

```bash
npm run test      # unit tests (vitest)
npm run typecheck
npm run lint
npm run verify    # all three

npm run test:db   # pgTAP: RLS policies and order lifecycle (needs `supabase start`)
```

`npm run test:db` is the one that matters most. The security model lives in RLS
policies and security-definer triggers — code no compiler checks, that fails at
runtime, in production, silently, as data leakage. Every policy is asserted in
both directions: the allow **and** the deny.

Current state: **101 unit tests and 62 pgTAP assertions, all passing** — 24 in
`01_rls_identity.sql` (role clamping, profile and vendor isolation, the
`is_live` double gate, storage-path ownership) and 28 in
`02_order_lifecycle.sql` (pricing from the database, oversell prevention,
allergen snapshots, webhook idempotency, the state machine) and 10 in
`03_currency_and_timezone.sql` (zone validation, per-kitchen currency, and
wall-clock pickup times resolving through the right offset).

Both suites are scoped to their own fixtures rather than counting whole tables,
so they can be run against a database that already has rows in it. Each file is
wrapped in `begin; … rollback;` and leaves nothing behind.

Unit tests cover the pure logic only: fee arithmetic, money parsing, Stripe
status mapping, validation schemas, and email bodies. `src/lib/fees.ts`
duplicates the fee arithmetic from `create_order()` so checkout can quote a
total before charging one; the two are pinned to the same numbers by
`src/lib/fees.test.ts` and `supabase/tests/02_order_lifecycle.sql`.
