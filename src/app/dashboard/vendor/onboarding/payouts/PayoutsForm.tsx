"use client";

import Link from "next/link";
import { useActionState } from "react";

import { startStripeOnboarding } from "@/lib/actions/vendor-onboarding";
import type { ConnectStatus, Vendor } from "@/lib/supabase/database.types";

const STATUS_COPY: Record<ConnectStatus, { label: string; blurb: string }> = {
  not_started: { label: "Not connected", blurb: "Stripe handles your identity check and bank details directly." },
  onboarding: { label: "In progress", blurb: "Stripe still needs a few details from you." },
  restricted: { label: "Needs attention", blurb: "Stripe has flagged something on your account." },
  complete: { label: "Connected", blurb: "Payouts are ready." },
};

export function PayoutsForm({
  vendor,
  stripeReady,
  justReturned,
}: {
  vendor: Vendor;
  stripeReady: boolean;
  justReturned: boolean;
}) {
  const [state, formAction] = useActionState(startStripeOnboarding, {});
  const status = STATUS_COPY[vendor.stripe_connect_status];
  const isComplete = vendor.stripe_connect_status === "complete";

  return (
    <div>
      <p>
        {status.label}
        {vendor.stripe_payouts_enabled ? " · Payouts on" : ""}
      </p>
      <p>{status.blurb}</p>

      {justReturned && !isComplete ? <p>Thanks — Stripe is still finishing its checks.</p> : null}
      {!stripeReady ? <p>Payouts setup is unavailable — Stripe has not been configured yet.</p> : null}
      {state.error ? <p role="alert">{state.error}</p> : null}

      {stripeReady && !isComplete ? (
        <form action={formAction}>
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <button type="submit">{vendor.stripe_account_id ? "Continue with Stripe" : "Connect with Stripe"}</button>
        </form>
      ) : null}

      <p>
        <Link href="/dashboard/vendor/onboarding/review">{isComplete ? "Continue" : "Skip for now"}</Link>
      </p>
    </div>
  );
}
