"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Banknote, CheckCircle } from "lucide-react";

import { startStripeOnboarding } from "@/lib/actions/vendor-onboarding";
import { Button } from "@/components/ui/button";
import { StatusPill, type StatusTone } from "@/components/ui/badge";
import type { ConnectStatus, Vendor } from "@/lib/supabase/database.types";

const STATUS_COPY: Record<ConnectStatus, { label: string; blurb: string; tone: StatusTone }> = {
  not_started: { label: "Not connected", blurb: "Stripe handles your identity check and bank details directly.", tone: "neutral" },
  onboarding: { label: "In progress", blurb: "Stripe still needs a few details from you.", tone: "warning" },
  restricted: { label: "Needs attention", blurb: "Stripe has flagged something on your account.", tone: "danger" },
  complete: { label: "Connected", blurb: "Payouts are ready.", tone: "success" },
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
  const [state, formAction, pending] = useActionState(startStripeOnboarding, {});
  const status = STATUS_COPY[vendor.stripe_connect_status];
  const isComplete = vendor.stripe_connect_status === "complete";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-secondary rounded-xl p-4">
        <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center shrink-0">
          <Banknote className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill label={status.label} tone={status.tone} />
            {vendor.stripe_payouts_enabled ? <StatusPill label="Payouts on" tone="success" /> : null}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{status.blurb}</p>
        </div>
      </div>

      {justReturned && !isComplete ? (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4" /> Thanks — Stripe is still finishing its checks.
        </p>
      ) : null}
      {!stripeReady ? (
        <p className="text-sm text-muted-foreground">Payouts setup is unavailable — Stripe has not been configured yet.</p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      {stripeReady && !isComplete ? (
        <form action={formAction}>
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Redirecting…" : vendor.stripe_account_id ? "Continue with Stripe" : "Connect with Stripe"}
          </Button>
        </form>
      ) : null}

      <Link
        href="/dashboard/vendor/onboarding/review"
        className="block text-center text-sm text-muted-foreground hover:text-foreground py-1"
      >
        {isComplete ? "Continue" : "Skip for now"}
      </Link>
    </div>
  );
}
