import Link from "next/link";

import { getViewer } from "@/lib/auth";
import { getMyMembership } from "@/lib/membership";
import { startPlusCheckout } from "@/lib/actions/membership";
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
    <div>
      <h1>Free to browse. $10 a month to get the good stuff.</h1>
      <p>
        FreshFork Plus unlocks special offers on future orders, early access when a new
        cook goes live nearby, and priority on pickup-window requests. Cancel any time —
        no contracts.
      </p>

      {error ? <p role="alert">{error}</p> : canceled ? <p>Checkout was canceled — nothing was charged.</p> : null}

      <h2>Free {membership?.plan === "free" || !membership ? "(current plan)" : ""}</h2>
      <ul>
        <li>Browse every verified cook nearby</li>
        <li>Full menu, allergen, and dietary detail</li>
        <li>Save your address for faster search</li>
      </ul>
      {!viewer ? <p><Link href="/signup">Create a free account</Link></p> : null}

      <h2>FreshFork Plus — $10/mo {membership?.plan === "plus" ? "(current plan)" : ""}</h2>
      <ul>
        <li>Everything in Free</li>
        <li>Special offers on future orders</li>
        <li>Early access when a new cook goes live nearby</li>
        <li>Priority pickup-window requests</li>
      </ul>
      {membership?.plan === "plus" ? (
        <p>You&apos;re a member.</p>
      ) : !features.membership ? (
        <p>Payments aren&apos;t configured yet — check back soon.</p>
      ) : viewer ? (
        <form action={startPlusCheckout}>
          <button type="submit">Get FreshFork Plus →</button>
        </form>
      ) : (
        <p><Link href="/signin?next=/pricing">Sign in to subscribe</Link></p>
      )}

      <p>
        Prices in USD. FreshFork Plus is a subscription to the platform, not a payment to
        any individual cook — dish prices are set by each cook and unaffected by your plan.
      </p>
    </div>
  );
}
