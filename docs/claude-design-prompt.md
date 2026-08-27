# Prompt for Claude Design — FreshFork visual design pass

Paste everything below the line into Claude Design.

---

I'm building **FreshFork**, a multi-vendor food marketplace where home cooks
across Europe sell dishes for **pickup** to nearby customers. Think
[shef.com](https://shef.com) as the north star — warm, trustworthy,
food-photography-driven, with food-safety trust signals front and center —
but a real European marketplace, not a US one: kitchens in Berlin, London,
Madrid, Paris, Amsterdam, Lisbon, Bucharest, Warsaw, Athens, Dublin,
Stockholm, and Rome, billing in EUR, GBP, PLN, RON, and SEK depending on the
kitchen.

**The backend is fully built and working** — Next.js 16 App Router, React 19,
Supabase (Postgres, Auth, Storage), Stripe (Connect + Checkout), all with
tested RLS policies and server actions. **The frontend has zero visual
design.** Every page today is unstyled semantic HTML — `<div>`, `<ul>`,
`<dl>`, plain `<button>` — wired to real, working data and forms. I need you
to design and build the actual visual layer on top of what already works.
Don't rebuild the data layer or the forms' logic — restyle and, where the
layout genuinely needs it, restructure the markup around them.

## Brand starting point

There's a partial design system already defined (previously synced from a
Figma file, but not yet implemented as real CSS — `globals.css` is
currently empty):

| Token | Hex | Role |
|---|---|---|
| `forest` | `#0e2a22` | Primary ink, nav, CTAs |
| `buttermilk` | `#f7f4ec` | Page background |
| `persimmon` | `#e86a3c` | Accent, verified/live indicator |
| `sage` | `#8fa687` | Dietary tags, secondary accents |
| `straw` | `#d4c4a6` | Hairlines, chip borders |
| `card` | `#fdfaf3` | Card surface |

Type: **Fraunces** (display/headings), **Inter** (body/UI), **IBM Plex Mono**
(prices and scarcity counts — e.g. "3 LEFT").

Treat this palette and type system as the starting point, not a cage — refine
it, extend it with the states it's missing (error, success, disabled, focus,
dark mode if you think it's warranted), and make it actually beautiful in
execution. The bar is "a stranger would believe this is a funded startup's
production app," not "on-brand but flat."

## What "the whole app" covers

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4. Every
page below currently exists and works — I need it designed, not invented.

**Public / discovery**
- Landing page (`/`) — hero, live stats, nearby dishes
- Browse + search (`/browse`) — filters (cuisine, dietary, price, pickup
  window, distance), sort, pagination, a location bar
- Vendor profile (`/vendor/[handle]`) — story, certification/trust signals,
  menu grouped by section, pickup windows, add-to-basket
- Pricing (`/pricing`) — free vs. FreshFork Plus ($10/mo membership,
  waives the customer service fee)

**Auth**
- Sign in / sign up (`/signin`, `/signup`) — role selection (customer vs.
  vendor) happens at signup

**Ordering (customer)**
- Checkout (`/checkout`) — basket review, pickup slot picker, hands off to
  Stripe Checkout
- Order list (`/orders`) — status-driven list
- Order detail (`/orders/[id]`) — full status timeline (pending → paid →
  accepted → ready → completed, or declined/canceled/refunded), pickup
  code, itemized receipt with **allergen info shown per line item**, cancel
  action, post-pickup review form
- Account (`/account`) — profile, membership status/billing portal link,
  account closure flow (explicit confirm-by-typing, not a casual button)

**Vendor dashboard**
- Onboarding wizard (business info → address → certification upload →
  pickup windows → Stripe Connect payouts → review/submit) — six steps,
  currently six separate unstyled pages
- Menu management (`/dashboard/vendor/menu`, new/edit) — CRUD with photo
  upload, dietary tags, allergens, quantity/scarcity
- Orders queue (`/dashboard/vendor/orders`) — accept/decline/ready/complete
  actions, refund issuance, defaults to "needs attention" view
- Reviews — reply to customer reviews

**Admin**
- Vendor verification queue (`/dashboard/admin/vendors`, `[id]`) —
  approve/request-changes/suspend with a note
- Reports/moderation queue (`/dashboard/admin/reports`) — food-safety and
  abuse reports, prioritized by severity
- Marketplace settings (`/dashboard/admin/settings`) — platform fee,
  service fee, checkout timing — a dense settings form, needs to feel safe
  to edit (this changes what every future order gets charged)

## Domain details that should shape the design, not just the copy

- **Multi-currency.** A price is never just a number — it's `€16`, `£12`,
  `165 kr`, `zł 64`. Never hardcode a `$` or `€` glyph in a component; the
  currency comes from the vendor and must render correctly for all five.
- **Multi-timezone.** Pickup times are wall-clock in the *kitchen's* city,
  not the viewer's. If you show a countdown or "today/tomorrow" logic,
  it needs to be timezone-aware, and it's worth being visually explicit
  about *whose* time is being shown when it could be ambiguous.
- **Allergens are a safety feature, not a tag chip.** They're snapshotted
  per order line at purchase time specifically so a later menu edit can't
  rewrite what someone already ate. Give them real visual weight on the
  order detail and menu views — this is closer to a warning label than a
  dietary preference pill.
- **Trust/verification signals matter a lot** (per the shef.com north
  star): certification label, "reviewed by a person," Stripe-verified
  payouts, verified-since date. These should read as credible, not
  decorative badges.
- **Scarcity is part of the product**: "3 LEFT," sold-out states, prep
  notes like "6 PM ONLY." IBM Plex Mono is earmarked for this — lean into
  it as a distinct visual register from the rest of the UI.
- **Order status has nine states** (`pending_payment`, `payment_failed`,
  `paid`, `accepted`, `ready`, `completed`, `rejected`, `canceled`,
  `refunded`) across both the customer and vendor views — needs a status
  system (color + icon + label) that stays legible at that cardinality,
  not just five colors improvised per page.

## What I need from you

1. A cohesive design system: finalize the tokens above (or justify changes),
   define type scale, spacing, radii, shadows, component states.
2. Real components: buttons, inputs, cards, badges/status pills, the basket,
   the multi-step onboarding wizard, empty states, error states, loading
   states — built once, reused everywhere, not restyled ad hoc per page.
3. Apply it across every page listed above, customer and vendor and admin
   surfaces alike — this is a full pass, not a landing-page redesign.
4. Responsive down to mobile — customers are ordering pickup food on their
   phones on the way somewhere.
5. Real photography/imagery direction (or clearly-marked placeholders) —
   food photography is core to the shef.com feel, don't leave it as gray
   boxes if you can help it.
6. Accessible: real focus states, sufficient contrast, semantic structure
   preserved under the new markup.

Build it as actual code in this codebase (Tailwind v4 + the existing
component/page structure), not a mockup to be translated later. Ask me
anything you need about a specific flow before you start if the intent
isn't clear from a page's existing (unstyled) markup — the logic is real and
I'd rather you ask than guess and drift from what the backend actually does.
