import type Stripe from "stripe";

import type { ConnectStatus } from "@/lib/supabase/database.types";

/**
 * Map a Stripe account's capability flags onto our `connect_status` enum.
 *
 * Plain module (not a server action) so both the webhook route and the
 * onboarding action can import it.
 */
export function connectStatusFor(account: Stripe.Account): ConnectStatus {
  if (account.payouts_enabled && !account.requirements?.disabled_reason) {
    return "complete";
  }
  if (account.requirements?.disabled_reason) return "restricted";
  return "onboarding";
}
