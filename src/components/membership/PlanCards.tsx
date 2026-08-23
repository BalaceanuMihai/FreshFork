import Link from "next/link";

import { Pill } from "@/components/marketplace/Pill";
import { startPlusCheckout } from "@/lib/actions/membership";
import type { MembershipPlan } from "@/lib/supabase/database.types";

const FREE_FEATURES = [
  "Browse every verified cook nearby",
  "Full menu, allergen, and dietary detail",
  "Save your address for faster search",
];

const PLUS_FEATURES = [
  "Everything in Free",
  "Special offers on future orders",
  "Early access when a new cook goes live nearby",
  "Priority pickup-window requests",
];

export function PlanCards({
  currentPlan,
  signedIn,
  stripeReady,
}: {
  currentPlan: MembershipPlan | null;
  signedIn: boolean;
  stripeReady: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <PlanCard
        eyebrow="FOR EVERYONE"
        name="Free"
        price="$0"
        cadence="forever"
        features={FREE_FEATURES}
        current={currentPlan === "free"}
        action={
          signedIn ? (
            <span className="text-sm font-medium text-ink-50">
              {currentPlan === "free" ? "Your current plan" : "Included with any account"}
            </span>
          ) : (
            <Link
              href="/signup"
              className="inline-flex rounded-full border border-forest px-6 py-3 text-sm font-semibold text-forest"
            >
              Create a free account
            </Link>
          )
        }
      />

      <PlanCard
        eyebrow="FOR REGULARS"
        name="FreshFork Plus"
        price="$10"
        cadence="per month"
        features={PLUS_FEATURES}
        highlighted
        current={currentPlan === "plus"}
        action={
          currentPlan === "plus" ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-buttermilk/20 px-6 py-3 text-sm font-semibold text-buttermilk">
              You&apos;re a member
            </span>
          ) : !stripeReady ? (
            <span className="text-sm text-buttermilk/70">
              Payments aren&apos;t configured yet — check back soon.
            </span>
          ) : signedIn ? (
            <form action={startPlusCheckout}>
              <button
                type="submit"
                className="rounded-full bg-persimmon px-6 py-3 text-sm font-semibold text-buttermilk"
              >
                Get FreshFork Plus →
              </button>
            </form>
          ) : (
            <Link
              href="/signin?next=/pricing"
              className="inline-flex rounded-full bg-persimmon px-6 py-3 text-sm font-semibold text-buttermilk"
            >
              Sign in to subscribe
            </Link>
          )
        }
      />
    </div>
  );
}

function PlanCard({
  eyebrow,
  name,
  price,
  cadence,
  features,
  action,
  current,
  highlighted,
}: {
  eyebrow: string;
  name: string;
  price: string;
  cadence: string;
  features: string[];
  action: React.ReactNode;
  current: boolean;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-6 rounded-3xl border p-8 ${
        highlighted
          ? "border-transparent bg-forest text-buttermilk"
          : "border-line bg-card text-forest"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`font-mono text-[11px] tracking-[0.18em] ${
            highlighted ? "text-persimmon" : "text-ink-50"
          }`}
        >
          {eyebrow}
        </span>
        {current ? <Pill tone={highlighted ? "ghost" : "solid"}>Current plan</Pill> : null}
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-display text-[28px] font-semibold tracking-[-0.01em]">
          {name}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[44px] font-semibold tracking-[-0.02em]">
            {price}
          </span>
          <span className={highlighted ? "text-buttermilk/70" : "text-ink-50"}>
            /{cadence === "forever" ? "forever" : "mo"}
          </span>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                highlighted ? "bg-persimmon" : "bg-sage"
              }`}
              aria-hidden
            />
            <span className={highlighted ? "text-buttermilk/90" : "text-ink-70"}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div>{action}</div>
    </div>
  );
}
