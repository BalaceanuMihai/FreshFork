-- FreshFork — customer membership (Free / Plus $10-mo). Separate from the
-- vendor-side Stripe Connect Express payouts: this is Stripe Billing on the
-- platform's own account, not a connected account.

create type public.membership_plan as enum ('free', 'plus');
create type public.membership_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid'
);

create table public.memberships (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  plan public.membership_plan not null default 'free',
  status public.membership_status not null default 'active',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.memberships is
  'One row per customer. plan/status/stripe_* are written only by the Stripe webhook via the service role — never trust a client-set value here.';

create index memberships_stripe_customer_idx on public.memberships (stripe_customer_id);

alter table public.memberships enable row level security;

create policy "memberships_select_own_or_admin"
  on public.memberships for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- No insert/update/delete policies for authenticated: rows are created and
-- maintained only by the webhook (service role bypasses RLS entirely), same
-- posture as vendors.stripe_* columns in Phase 2.

grant select on public.memberships to authenticated;

-- Every profile starts on the free plan, same lazy-row idea as vendors: the
-- membership row is created by the webhook on first checkout, not at signup,
-- so free users carry no Stripe state. A helper view lets the app treat
-- "no row yet" and "free" identically.
create or replace view public.my_membership as
select
  p.id as profile_id,
  coalesce(m.plan, 'free'::public.membership_plan) as plan,
  coalesce(m.status, 'active'::public.membership_status) as status,
  m.current_period_end,
  m.cancel_at_period_end
from public.profiles p
left join public.memberships m on m.profile_id = p.id
where p.id = auth.uid();

grant select on public.my_membership to authenticated;
