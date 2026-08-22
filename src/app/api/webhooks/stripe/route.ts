import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { connectStatusFor } from "@/lib/stripe/connect";
import { features, serverEnv } from "@/lib/env";

/**
 * Stripe Connect webhook — the only writer of the `stripe_*` columns.
 *
 * The onboarding return redirect is not trusted: a vendor could land back on
 * the app before Stripe has finished verifying, or never land back at all.
 * `account.updated` is authoritative, and flipping `stripe_connect_status` to
 * `complete` here is what lets the DB trigger derive `is_live`.
 */
export async function POST(request: NextRequest) {
  if (!features.stripeConnect) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      serverEnv.stripeWebhookSecret,
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bad signature." },
      { status: 400 },
    );
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const admin = createAdminClient();

    const { error } = await admin
      .from("vendors")
      .update({
        stripe_charges_enabled: Boolean(account.charges_enabled),
        stripe_payouts_enabled: Boolean(account.payouts_enabled),
        stripe_connect_status: connectStatusFor(account),
      })
      .eq("stripe_account_id", account.id);

    if (error) {
      // 500 so Stripe retries rather than dropping the state change.
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
