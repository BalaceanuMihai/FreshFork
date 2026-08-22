# FreshFork

A local food marketplace connecting home cooks and small food producers ("vendors") with nearby customers who order dishes for **pickup**.

North star: [shef.com](https://shef.com) — warm, trustworthy, food-photography-driven, with food-safety trust signals front and center.

## Stack

- **Framework** — Next.js 16 (App Router) + React 19 + TypeScript
- **Styling** — Tailwind CSS v4, custom design tokens (see `src/app/globals.css`)
- **Backend** — Supabase (Postgres, Auth, Storage, Realtime) — _wired in Phase 1+_
- **Payments** — Stripe Connect Express — _wired in Phase 4_
- **Maps** — Mapbox (geocoding + tiles) — _wired in Phase 3_
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

Phase 0 — scaffold + tokens · **← you are here**
Phase 1 — Supabase Auth + roles
Phase 2 — Vendor onboarding + menu CRUD + admin verification
Phase 3 — Customer discovery + Mapbox
Phase 4 — Ordering + Stripe Connect + email receipts
Phase 5 — Reviews + reports
Phase 6 — Polish + launch prep

Full detail in the build plan linked above.
