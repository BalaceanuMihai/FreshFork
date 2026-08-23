import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { connectStatusFor } from "@/lib/stripe/connect";
import { membershipStatusFor, planForStatus } from "@/lib/stripe/membership-status";
import { features, serverEnv } from "@/lib/env";

/**
 * One webhook endpoint for both Stripe products on this account:
 * - Connect Express (`account.updated`) — vendor payout onboarding.
 * - Billing (`customer.subscription.*`) — the FreshFork Plus membership.
 *
 * Both write columns that RLS blocks the client from touching directly, so
 * this route is the sole writer of `vendors.stripe_*` and all of
 * `memberships`. Client redirects (Connect return URL, Checkout success URL)
 * are never trusted to change status themselves.
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

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    const status = membershipStatusFor(subscription.status);
    const periodEndUnix = subscription.items.data[0]?.current_period_end;
    const admin = createAdminClient();

    // Checkout sets subscription_data.metadata.profile_id, but a subscription
    // created some other way (dashboard, dunning retry) might not carry it —
    // fall back to the row seeded by stripe_customer_id when checkout started.
    let profileId: string | undefined = subscription.metadata.profile_id;
    if (!profileId) {
      const { data: existing } = await admin
        .from("memberships")
        .select("profile_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      profileId = existing?.profile_id;
    }

    if (!profileId) {
      // No way to attribute this subscription to a profile — nothing to do.
      return NextResponse.json({ received: true, skipped: "no profile_id" });
    }

    // The row is seeded (with just stripe_customer_id) when checkout starts,
    // so this is always an update, never a fresh insert — upsert only in case
    // an event arrives out of order relative to that seed write.
    const { error } = await admin.from("memberships").upsert(
      {
        profile_id: profileId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan: planForStatus(status),
        status,
        current_period_end: periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
      { onConflict: "profile_id" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
