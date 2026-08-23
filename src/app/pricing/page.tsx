import { SiteNav } from "@/components/marketplace/SiteNav";
import { PlanCards } from "@/components/membership/PlanCards";
import { getViewer } from "@/lib/auth";
import { getMyMembership } from "@/lib/membership";
import { features } from "@/lib/env";

export const metadata = { title: "Pricing · FreshFork" };

const ERROR_COPY: Record<string, string> = {
  unavailable: "Payments aren't configured yet — try again shortly.",
  checkout_failed: "Stripe couldn't start checkout. Try again in a moment.",
  no_subscription: "You don't have an active subscription to manage yet.",
};

export default async function PricingPage(props: PageProps<"/pricing">) {
  const params = await props.searchParams;
  const [viewer, membership] = await Promise.all([getViewer(), getMyMembership()]);

  const error = typeof params.error === "string" ? ERROR_COPY[params.error] : null;
  const canceled = params.canceled === "1";

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <section className="mx-auto w-full max-w-[880px] px-6 py-16">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
          <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
            PRICING
          </span>
        </div>
        <h1 className="mt-5 font-display text-[46px] font-semibold leading-[1.06] tracking-[-0.02em] text-forest">
          Free to browse. $10 a month to get the good stuff.
        </h1>
        <p className="mt-3 max-w-lg text-[16px] leading-[1.55] text-ink-70">
          FreshFork Plus unlocks special offers on future orders, early access
          when a new cook goes live nearby, and priority on pickup-window
          requests. Cancel any time — no contracts.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-persimmon/40 bg-persimmon/10 px-4 py-3 text-sm text-cocoa"
          >
            {error}
          </p>
        ) : canceled ? (
          <p className="mt-8 rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink-70">
            Checkout was canceled — nothing was charged.
          </p>
        ) : null}

        <div className="mt-12">
          <PlanCards
            currentPlan={membership?.plan ?? null}
            signedIn={Boolean(viewer)}
            stripeReady={features.membership}
          />
        </div>

        <p className="mt-10 text-xs text-ink-50">
          Prices in USD. FreshFork Plus is a subscription to the platform, not
          a payment to any individual cook — dish prices are set by each cook
          and unaffected by your plan.
        </p>
      </section>
    </div>
  );
}
