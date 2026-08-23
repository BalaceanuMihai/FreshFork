"use server";

import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { features, publicEnv, serverEnv } from "@/lib/env";

export type MembershipFormState = { error?: string };

/**
 * Find or create the Stripe Customer for this profile.
 *
 * Membership rows are written only by the webhook (RLS blocks the client from
 * touching plan/status/stripe_* directly), so the customer id read here comes
 * from the admin client rather than the request-scoped one.
 */
async function ensureStripeCustomer(profileId: string, email: string | undefined): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("memberships")
    .select("stripe_customer_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email,
    metadata: { profile_id: profileId },
  });

  // Seed the row so a customer id exists even before any subscription event
  // arrives — upsert because a row may already exist from a prior attempt.
  await admin
    .from("memberships")
    .upsert({ profile_id: profileId, stripe_customer_id: customer.id }, { onConflict: "profile_id" });

  return customer.id;
}

/** Redirects to Stripe Checkout in subscription mode for the Plus plan. */
export async function startPlusCheckout(): Promise<void> {
  if (!features.membership) {
    redirect("/pricing?error=unavailable");
  }

  const viewer = await requireViewer("/pricing");
  const customerId = await ensureStripeCustomer(viewer.user.id, viewer.user.email);

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: serverEnv.stripePlusPriceId, quantity: 1 }],
    success_url: `${publicEnv.appUrl}/account?upgraded=1`,
    cancel_url: `${publicEnv.appUrl}/pricing?canceled=1`,
    client_reference_id: viewer.user.id,
    subscription_data: { metadata: { profile_id: viewer.user.id } },
  });

  if (!session.url) redirect("/pricing?error=checkout_failed");
  redirect(session.url);
}

/** Redirects to the Stripe Billing Portal so a member can manage or cancel. */
export async function openBillingPortal(): Promise<void> {
  if (!features.membership) {
    redirect("/account?error=unavailable");
  }

  const viewer = await requireViewer("/account");
  const supabase = await createClient();

  const { data } = await supabase
    .from("memberships")
    .select("stripe_customer_id")
    .eq("profile_id", viewer.user.id)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    redirect("/pricing?error=no_subscription");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${publicEnv.appUrl}/account`,
  });

  redirect(session.url);
}
