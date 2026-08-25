import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { connectStatusFor } from "@/lib/stripe/connect";
import { assertOwnVendor } from "@/lib/vendor-access";
import { consume } from "@/lib/rate-limit";
import { features } from "@/lib/env";
import { log } from "@/lib/log";
import type { Vendor } from "@/lib/supabase/database.types";

/**
 * Pull the latest Connect account state from Stripe for the "I'm back from
 * Stripe" page, and return the refreshed row.
 *
 * This used to be exported from a `"use server"` module, which made it a
 * callable action endpoint accepting an arbitrary vendor id. Ownership was
 * checked, so it was never a data leak — but it did let any signed-in vendor
 * drive unlimited `accounts.retrieve` calls against our Stripe account. It now
 * lives in a plain module and is rate limited besides.
 *
 * Returns rather than revalidates: this runs during the render of the payouts
 * page, where cache revalidation is not allowed and `getOwnVendor` would hand
 * back its request-cached (stale) copy.
 */
export async function refreshStripeStatus(vendorId: string): Promise<Vendor | null> {
  if (!features.stripeConnect) return null;

  const vendor = await assertOwnVendor(vendorId);
  if (!vendor.stripe_account_id) return vendor;

  const limit = await consume("refreshStripeStatus", vendor.id);
  if (!limit.allowed) {
    log.warn("Skipping a Stripe status refresh; rate limited.", { vendorId: vendor.id });
    return vendor;
  }

  const account = await getStripe().accounts.retrieve(vendor.stripe_account_id);
  const admin = createAdminClient();

  const { data } = await admin
    .from("vendors")
    .update({
      stripe_charges_enabled: Boolean(account.charges_enabled),
      stripe_payouts_enabled: Boolean(account.payouts_enabled),
      stripe_connect_status: connectStatusFor(account),
    })
    .eq("id", vendor.id)
    .select("*")
    .single();

  return data ?? vendor;
}
