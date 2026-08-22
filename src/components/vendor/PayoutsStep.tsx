"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  startStripeOnboarding,
  type VendorFormState,
} from "@/lib/actions/vendor-onboarding";
import { FormError, FormNotice, SubmitButton } from "@/components/ui/Form";
import { Pill } from "@/components/marketplace/Pill";
import type { ConnectStatus, Vendor } from "@/lib/supabase/database.types";

const STATUS_COPY: Record<ConnectStatus, { label: string; blurb: string }> = {
  not_started: {
    label: "Not connected",
    blurb:
      "Stripe handles your identity check and bank details directly — we never see them.",
  },
  onboarding: {
    label: "In progress",
    blurb: "Stripe still needs a few details from you. Pick up where you left off.",
  },
  restricted: {
    label: "Needs attention",
    blurb: "Stripe has flagged something on your account. Open Stripe to resolve it.",
  },
  complete: {
    label: "Connected",
    blurb: "Payouts are ready. Nothing else to do here.",
  },
};

export function PayoutsStep({
  vendor,
  stripeReady,
  justReturned,
}: {
  vendor: Vendor;
  stripeReady: boolean;
  justReturned: boolean;
}) {
  const [state, formAction] = useActionState<VendorFormState, FormData>(
    startStripeOnboarding,
    {},
  );

  const status = STATUS_COPY[vendor.stripe_connect_status];
  const isComplete = vendor.stripe_connect_status === "complete";

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center gap-3">
        <Pill tone={isComplete ? "solid" : "outline"}>{status.label}</Pill>
        {vendor.stripe_payouts_enabled ? <Pill tone="ghost">Payouts on</Pill> : null}
      </div>

      <p className="text-[15px] leading-[1.55] text-ink-70">{status.blurb}</p>

      {justReturned && !isComplete ? (
        <FormNotice message="Thanks — Stripe is still finishing its checks. This page updates itself once they confirm." />
      ) : null}

      {!stripeReady ? (
        <p className="rounded-xl border border-line bg-buttermilk px-4 py-3 text-sm text-ink-70">
          Payouts setup is unavailable — Stripe has not been configured yet. Add{" "}
          <code className="font-mono text-xs">STRIPE_SECRET_KEY</code> to{" "}
          <code className="font-mono text-xs">.env.local</code> to enable it. You can
          still finish the rest of your listing.
        </p>
      ) : null}

      {state.error ? <FormError message={state.error} /> : null}

      <div className="flex items-center gap-4 border-t border-line pt-7">
        {stripeReady && !isComplete ? (
          <form action={formAction}>
            <input type="hidden" name="vendor_id" value={vendor.id} />
            <SubmitButton
              label={
                vendor.stripe_account_id ? "Continue with Stripe" : "Connect with Stripe"
              }
              pendingLabel="Opening Stripe…"
            />
          </form>
        ) : null}

        <Link
          href="/dashboard/vendor/onboarding/review"
          className="rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-forest"
        >
          {isComplete ? "Continue" : "Skip for now"}
        </Link>
      </div>

      <p className="text-xs text-ink-50">
        Payouts are one of two gates. Your listing goes live once Stripe is connected
        and our team has approved your paperwork — in either order.
      </p>
    </div>
  );
}
