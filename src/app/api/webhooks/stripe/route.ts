import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { connectStatusFor } from "@/lib/stripe/connect";
import { membershipStatusFor, planForStatus } from "@/lib/stripe/membership-status";
import { emailsForOrder } from "@/lib/email/recipients";
import { sendEmail } from "@/lib/email/send";
import {
  newOrderForVendorEmail,
  orderReceiptEmail,
  refundIssuedEmail,
  type OrderEmailData,
} from "@/lib/email/templates";
import { formatPickup } from "@/lib/orders";
import { captureException, log } from "@/lib/log";
import { features, publicEnv, serverEnv } from "@/lib/env";
import type { Order } from "@/lib/supabase/database.types";

/**
 * The one webhook endpoint, for all three Stripe products on this account:
 *
 *   - Connect Express (`account.updated`) — vendor payout onboarding
 *   - Billing (`customer.subscription.*`) — the FreshFork Plus membership
 *   - Payments (`checkout.session.*`, `charge.*`) — order payment and refunds
 *
 * This route is the sole writer of `vendors.stripe_*`, all of `memberships`,
 * every order status past `pending_payment`, and the whole payout ledger.
 * Client redirects — the Connect return URL, the Checkout success URL — are
 * never trusted to change state, because a URL is something a customer can
 * simply visit.
 *
 * Two invariants Stripe itself does not give us:
 *
 *   1. **Exactly once.** Stripe retries on any non-2xx and can redeliver a
 *      succeeded event days later. `claim_stripe_event` inserts the event id
 *      and tells us whether we won it; a redelivery is answered 200 and
 *      ignored. On failure the claim is released so the retry can work.
 *
 *   2. **Latest wins.** Deliveries can arrive out of order, so subscription
 *      state is re-fetched from Stripe rather than read out of the (possibly
 *      stale) event payload. A ten-minute-old `updated` event can no longer
 *      overwrite newer state.
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
    // A bad signature is not a retryable condition — 400 so Stripe stops.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bad signature." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: claimed, error: claimError } = await admin.rpc("claim_stripe_event", {
    p_id: event.id,
    p_type: event.type,
    p_event_created: new Date(event.created * 1000).toISOString(),
  });

  if (claimError) {
    // We cannot prove this is a first delivery, so we must not act on it.
    // 500 asks Stripe to try again once the database is healthy.
    captureException(claimError, { where: "claimStripeEvent", eventId: event.id });
    return NextResponse.json({ error: "Could not record the event." }, { status: 500 });
  }

  if (!claimed) {
    log.info("Ignoring a duplicate Stripe delivery.", {
      eventId: event.id,
      type: event.type,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
    await admin.rpc("finish_stripe_event", { p_id: event.id, p_error: null });
    return NextResponse.json({ received: true });
  } catch (error) {
    // Release the claim, or Stripe's retry would be swallowed as a duplicate
    // and the state change lost for good.
    await admin.rpc("release_stripe_event", { p_id: event.id });
    captureException(error, { where: "stripeWebhook", eventId: event.id, type: event.type });
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "account.updated":
      return handleAccountUpdated(event.data.object as Stripe.Account);

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return handleSubscription(event.data.object as Stripe.Subscription);

    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);

    case "checkout.session.expired":
      return handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);

    case "payment_intent.payment_failed":
      return handlePaymentFailed(event.data.object as Stripe.PaymentIntent);

    case "charge.refunded":
      return handleChargeRefunded(event.data.object as Stripe.Charge);

    case "charge.dispute.created":
      return handleDisputeOpened(event.data.object as Stripe.Dispute);

    case "invoice.payment_failed":
      // Membership dunning. The subscription's own `updated` event carries the
      // status change; this is logged so the pattern is visible in one place.
      log.warn("A membership invoice failed.", { eventId: event.id });
      return;

    default:
      log.debug("Unhandled Stripe event.", { type: event.type });
      return;
  }
}

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("vendors")
    .update({
      stripe_charges_enabled: Boolean(account.charges_enabled),
      stripe_payouts_enabled: Boolean(account.payouts_enabled),
      stripe_connect_status: connectStatusFor(account),
    })
    .eq("stripe_account_id", account.id);

  // Throwing gets the claim released and the delivery retried.
  if (error) throw new Error(`vendors update failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

async function handleSubscription(snapshot: Stripe.Subscription): Promise<void> {
  const admin = createAdminClient();

  // Re-fetch rather than trusting the snapshot: this is what makes an
  // out-of-order redelivery harmless.
  let subscription = snapshot;
  try {
    subscription = await getStripe().subscriptions.retrieve(snapshot.id);
  } catch (error) {
    // A deleted subscription can 404 on retrieve; the snapshot is then the
    // only description of it we will ever get, and it is the final state.
    log.warn("Could not re-fetch a subscription; using the event payload.", {
      subscriptionId: snapshot.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const status = membershipStatusFor(subscription.status);
  const periodEndUnix = subscription.items.data[0]?.current_period_end;

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
    log.warn("A subscription could not be attributed to a profile.", {
      subscriptionId: subscription.id,
    });
    return;
  }

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

  if (error) throw new Error(`memberships upsert failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

function orderIdFrom(metadata: Stripe.Metadata | null | undefined): string | null {
  const value = metadata?.order_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // Membership checkouts are subscriptions and are handled by their own
  // events; this branch is only for order payments.
  if (session.mode !== "payment") return;

  const orderId = orderIdFrom(session.metadata) ?? session.client_reference_id;
  if (!orderId) {
    log.warn("A payment checkout completed with no order id.", { sessionId: session.id });
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    throw new Error(`Checkout ${session.id} completed with no PaymentIntent.`);
  }

  // An unpaid session (async payment methods) is not a sale yet.
  if (session.payment_status !== "paid") {
    log.info("Checkout completed but is not paid yet.", {
      sessionId: session.id,
      status: session.payment_status,
    });
    return;
  }

  const admin = createAdminClient();

  // The PaymentIntent id is how every later event (refund, dispute) finds this
  // order, so it has to be attached before the status moves.
  const { error: attachError } = await admin
    .from("orders")
    .update({ stripe_payment_intent_id: paymentIntentId })
    .eq("id", orderId);

  if (attachError) {
    throw new Error(`Could not attach the PaymentIntent: ${attachError.message}`);
  }

  const chargeId = await resolveChargeId(paymentIntentId);

  const { data: order, error } = await admin.rpc("mark_order_paid", {
    p_payment_intent_id: paymentIntentId,
    p_charge_id: chargeId,
  });

  if (error) throw new Error(`mark_order_paid failed: ${error.message}`);
  if (!order) {
    log.warn("Paid a checkout with no matching order.", { orderId, paymentIntentId });
    return;
  }

  await notifyBothSides(order);
}

/** Destination charges settle to a charge we need for refunds and disputes. */
async function resolveChargeId(paymentIntentId: string): Promise<string | null> {
  try {
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    const latest = intent.latest_charge;
    return typeof latest === "string" ? latest : (latest?.id ?? null);
  } catch (error) {
    log.warn("Could not resolve the charge for a PaymentIntent.", {
      paymentIntentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "payment") return;

  const orderId = orderIdFrom(session.metadata) ?? session.client_reference_id;
  if (!orderId) return;

  const admin = createAdminClient();

  // No PaymentIntent to key on, so cancel through the order itself. This is
  // what hands the reserved portions back to the kitchen.
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.status !== "pending_payment") return;

  const { error } = await admin.rpc("fail_order_payment", {
    p_payment_intent_id: order.stripe_payment_intent_id ?? `session:${session.id}`,
    p_reason: "Checkout expired before payment.",
  });

  // No PaymentIntent was ever attached for an expired session, so the RPC
  // matches nothing; `expire_stale_orders` is the backstop that releases it.
  if (error) {
    log.warn("Could not fail an expired checkout; the sweeper will handle it.", {
      orderId,
      error: error.message,
    });
  }
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  if (!orderIdFrom(intent.metadata)) return;

  const admin = createAdminClient();
  const { data: order, error } = await admin.rpc("fail_order_payment", {
    p_payment_intent_id: intent.id,
    p_reason: intent.last_payment_error?.message ?? "The payment was declined.",
  });

  if (error) throw new Error(`fail_order_payment failed: ${error.message}`);
  if (!order) return;

  log.info("An order payment failed; stock has been returned.", { orderId: order.id });
}

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const admin = createAdminClient();

  // Stripe reports the cumulative amount refunded; the RPC derives the delta,
  // so a partial refund followed by another is recorded correctly.
  const { data: order, error } = await admin.rpc("record_order_refund", {
    p_payment_intent_id: paymentIntentId,
    p_refunded_total_cents: charge.amount_refunded,
    p_stripe_object_id: charge.id,
  });

  if (error) throw new Error(`record_order_refund failed: ${error.message}`);
  if (!order) return;

  const context = await orderEmailContext(order);
  if (!context) return;

  await sendEmail(
    context.customerEmail,
    refundIssuedEmail({ ...context.data, refundedCents: charge.amount_refunded }),
    { orderId: order.id },
  );
}

async function handleDisputeOpened(dispute: Stripe.Dispute): Promise<void> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;

  const admin = createAdminClient();
  const { data: order, error } = await admin.rpc("record_order_dispute", {
    p_charge_id: chargeId,
    p_amount_cents: dispute.amount,
    p_stripe_object_id: dispute.id,
  });

  if (error) throw new Error(`record_order_dispute failed: ${error.message}`);

  // Worth a loud line either way: a dispute is a human problem, and one
  // against an unknown charge is a reconciliation problem.
  log.warn("A charge was disputed.", {
    disputeId: dispute.id,
    chargeId,
    orderId: order?.id ?? null,
    reason: dispute.reason,
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

type EmailContext = {
  data: OrderEmailData;
  customerEmail: string | null;
  vendorEmail: string | null;
};

async function orderEmailContext(order: Order): Promise<EmailContext | null> {
  const admin = createAdminClient();

  const [{ data: vendor }, { data: items }, { data: profile }] = await Promise.all([
    admin
      .from("vendors")
      .select("business_name, pickup_address_line, pickup_city, timezone, profile_id")
      .eq("id", order.vendor_id)
      .maybeSingle(),
    admin.from("order_items").select("*").eq("order_id", order.id),
    admin.from("profiles").select("full_name").eq("id", order.customer_id).maybeSingle(),
  ]);

  if (!vendor) return null;

  const { customer, vendor: vendorEmail } = await emailsForOrder(
    order.customer_id,
    vendor.profile_id,
  );

  const address = [vendor.pickup_address_line, vendor.pickup_city]
    .filter(Boolean)
    .join(", ");

  return {
    customerEmail: customer,
    vendorEmail,
    data: {
      code: order.code,
      vendorName: vendor.business_name,
      customerName: profile?.full_name ?? "A customer",
      pickupAt: formatPickup(order, vendor.timezone),
      pickupAddress: address || null,
      lines: (items ?? []).map((item) => ({
        name: item.name_snapshot,
        quantity: item.quantity,
        lineTotalCents: item.line_total_cents,
      })),
      subtotalCents: order.subtotal_cents,
      serviceFeeCents: order.service_fee_cents,
      totalCents: order.total_cents,
      orderUrl: `${publicEnv.appUrl}/orders/${order.id}`,
      note: order.customer_note,
      currency: order.currency,
    },
  };
}

/**
 * Receipt to the customer, work order to the kitchen.
 *
 * Awaited rather than fired into the background: this runs inside the webhook,
 * and a serverless function can be frozen the moment it returns a response.
 * Failures are logged inside `sendEmail` and never thrown — a receipt that
 * bounced must not make Stripe retry a payment we already recorded.
 */
async function notifyBothSides(order: Order): Promise<void> {
  const context = await orderEmailContext(order);
  if (!context) return;

  await Promise.all([
    sendEmail(context.customerEmail, orderReceiptEmail(context.data), {
      orderId: order.id,
    }),
    sendEmail(context.vendorEmail, newOrderForVendorEmail(context.data), {
      orderId: order.id,
    }),
  ]);
}

