import type Stripe from "stripe";

import type { MembershipStatus } from "@/lib/supabase/database.types";

/** Stripe's subscription statuses collapsed onto our narrower enum. */
export function membershipStatusFor(status: Stripe.Subscription.Status): MembershipStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    case "incomplete":
      return "incomplete";
    case "canceled":
    case "incomplete_expired":
    case "paused":
    default:
      return "canceled";
  }
}

/** Whether a subscription in this status should carry the Plus plan. */
export function planForStatus(status: MembershipStatus): "free" | "plus" {
  return status === "active" || status === "trialing" || status === "past_due"
    ? "plus"
    : "free";
}
