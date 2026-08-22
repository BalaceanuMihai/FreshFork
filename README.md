# FreshFork

A local food marketplace connecting home cooks and small food producers ("vendors") with nearby customers who order dishes for **pickup**.

North star: [shef.com](https://shef.com) — warm, trustworthy, food-photography-driven, with food-safety trust signals front and center.

## Stack

- **Framework** — Next.js 16 (App Router) + React 19 + TypeScript
- **Styling** — Tailwind CSS v4, custom design tokens (see `src/app/globals.css`)
- **Backend** — Supabase (Postgres + PostGIS, Auth, Storage) — _wired_
- **Payments** — Stripe Connect Express — _onboarding wired; charges in Phase 4_
- **Maps** — Mapbox (geocoding + tiles) — _wired_
- **Email** — Resend — _wired in Phase 4_
- **Errors** — Sentry — _wired at Phase 6_
- **Hosting** — Vercel

See [`.claude/plans/i-want-to-build-soft-sonnet.md`](.claude/plans/i-want-to-build-soft-sonnet.md) for the full build plan.

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

### Demo data

`supabase/seed.sql` creates two live cooks with menus and pickup windows, for
clicking through discovery without completing onboarding by hand. Paste it into
the SQL editor; the header comment says how to remove it again.

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
Phase 4 — Ordering + Stripe charges + email receipts · **← you are here**
Phase 5 — Reviews + reports
Phase 6 — Polish + launch prep

Full detail in the build plan linked above.
