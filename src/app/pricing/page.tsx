import Link from "next/link";
import { Check, X } from "lucide-react";

import { getViewer } from "@/lib/auth";
import { getMyMembership } from "@/lib/membership";
import { startPlusCheckout } from "@/lib/actions/membership";
import { features } from "@/lib/env";
import { buttonClasses, Button } from "@/components/ui/button";

export const metadata = { title: "Pricing · FreshFork" };

const ERROR_COPY: Record<string, string> = {
  unavailable: "Payments aren't configured yet — try again shortly.",
  checkout_failed: "Stripe couldn't start checkout. Try again in a moment.",
  no_subscription: "You don't have an active subscription to manage yet.",
};

const FREE_FEATURES = [
  { yes: true, text: "Browse every verified cook nearby" },
  { yes: true, text: "Full menu, allergen, and dietary detail" },
  { yes: true, text: "Secure Stripe payments" },
  { yes: false, text: "Special offers on future orders" },
];

const PLUS_FEATURES = [
  "Everything in Free",
  "Special offers on future orders",
  "Early access when a new cook goes live nearby",
  "Priority on pickup-window requests",
  "Cancel any time, no penalty",
];

export default async function PricingPage(props: PageProps<"/pricing">) {
  const params = await props.searchParams;
  const [viewer, membership] = await Promise.all([getViewer(), getMyMembership()]);

  const error = typeof params.error === "string" ? ERROR_COPY[params.error] : null;
  const canceled = params.canceled === "1";
  const isPlus = membership?.plan === "plus";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-semibold">Free to browse. $10 a month to get the good stuff.</h1>
        <p className="text-muted-foreground">No hidden fees. Upgrade or cancel any time.</p>
      </div>

      {error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm text-center" role="alert">
          {error}
        </div>
      ) : canceled ? (
        <div className="bg-secondary rounded-xl px-4 py-3 text-sm text-center">Checkout was canceled — nothing was charged.</div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Free */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <div>
            <h2 className="font-display text-xl font-semibold">Free</h2>
            <p className="text-3xl font-display font-semibold mt-1">
              $0 <span className="text-sm text-muted-foreground font-normal">/month</span>
            </p>
          </div>
          <ul className="space-y-2.5 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f.text} className={`flex items-center gap-2 ${f.yes ? "text-foreground" : "text-muted-foreground"}`}>
                {f.yes ? <Check className="w-4 h-4 text-green-600 shrink-0" /> : <X className="w-4 h-4 text-muted shrink-0" />}
                {f.text}
              </li>
            ))}
          </ul>
          {!viewer ? (
            <Link href="/signup" className={buttonClasses("outline", "w-full")}>
              Create a free account
            </Link>
          ) : isPlus ? (
            <p className="text-xs text-center text-muted-foreground">Your current plan after Plus ends</p>
          ) : (
            <p className="text-xs text-center text-muted-foreground">Your current plan</p>
          )}
        </div>

        {/* Plus */}
        <div className="bg-primary rounded-2xl p-6 space-y-5 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary-foreground/10 text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-xl">
            Most popular
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">FreshFork Plus</h2>
            <p className="text-3xl font-display font-semibold mt-1">
              $10 <span className="text-sm opacity-70 font-normal">/month</span>
            </p>
          </div>
          <ul className="space-y-2.5 text-sm">
            {PLUS_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 opacity-90" />
                {f}
              </li>
            ))}
          </ul>

          {isPlus ? (
            <div className="bg-primary-foreground/10 rounded-lg p-3 text-center text-sm">
              <Check className="w-4 h-4 inline mr-1" /> You&apos;re a member
            </div>
          ) : !features.membership ? (
            <p className="text-xs text-center opacity-80">Payments aren&apos;t configured yet — check back soon.</p>
          ) : viewer ? (
            <form action={startPlusCheckout}>
              <Button type="submit" variant="outline" className="w-full bg-primary-foreground text-foreground border-0 hover:bg-primary-foreground/90">
                Get FreshFork Plus →
              </Button>
            </form>
          ) : (
            <Link
              href="/signin?next=/pricing"
              className={buttonClasses("outline", "w-full bg-primary-foreground text-foreground border-0 hover:bg-primary-foreground/90")}
            >
              Sign in to subscribe
            </Link>
          )}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Prices in USD. FreshFork Plus is a subscription to the platform, not a payment to any individual cook — dish
        prices are set by each cook and unaffected by your plan.
      </p>
    </div>
  );
}
