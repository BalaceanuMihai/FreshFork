"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole, requireViewer } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { cartToRpcItems, readCartCookie, writeCartCookie } from "@/lib/cart";
import { getPlatformSettings } from "@/lib/settings";
import { formatPickup } from "@/lib/orders";
import {
  closeOrderCheckout,
  createOrderCheckoutSession,
  refundOrder,
} from "@/lib/stripe/orders";
import { emailForProfile } from "@/lib/email/recipients";
import { sendEmailInBackground } from "@/lib/email/send";
import {
  orderAcceptedEmail,
  orderCanceledEmail,
  orderReadyEmail,
  type OrderEmailData,
} from "@/lib/email/templates";
import { consume } from "@/lib/rate-limit";
import { captureException, log } from "@/lib/log";
import { features, publicEnv } from "@/lib/env";
import {
  cancelOrderSchema,
  checkoutSchema,
  refundOrderSchema,
  vendorTransitionSchema,
} from "@/lib/validation/order";
import type { Order, Vendor } from "@/lib/supabase/database.types";

export type OrderFormState = { error?: string; ok?: string };

/**
 * Every write here is a thin wrapper over a database function.
 *
 * The RPCs own the rules — who may act, which transitions exist, whether stock
 * comes back — because a server action is only one of the ways to reach
 * PostgREST. What lives in this file is the part SQL cannot do: talking to
 * Stripe, sending mail, and turning a Postgres exception into a sentence.
 */

/** Postgres raises these with a message written for the customer. */
function rpcMessage(error: { message: string }, fallback: string): string {
  const message = error.message?.trim();
  if (!message) return fallback;
  // PostgREST prefixes some errors; strip the noise but keep the sentence.
  const cleaned = message.replace(/^(.*?)(?:error|exception):\s*/i, "").trim();
  return cleaned.length > 0 && cleaned.length < 300 ? cleaned : fallback;
}

async function emailDataFor(
  order: Order,
  vendor: Pick<Vendor, "business_name" | "pickup_address_line" | "pickup_city" | "timezone">,
  customerName: string,
): Promise<OrderEmailData> {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  const address = [vendor.pickup_address_line, vendor.pickup_city]
    .filter(Boolean)
    .join(", ");

  return {
    code: order.code,
    vendorName: vendor.business_name,
    customerName,
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
  };
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/**
 * Turn the basket into an order and send the customer to Stripe.
 *
 * Order first, payment second. `create_order()` is what reserves the stock, so
 * it has to succeed before we ask anyone for money — the reverse order would
 * happily charge for the last portion twice.
 */
export async function startCheckout(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  if (!features.ordering) {
    return { error: "Ordering is unavailable — payments are not configured yet." };
  }

  const viewer = await requireViewer("/checkout");

  const limit = await consume("checkout", viewer.user.id);
  if (!limit.allowed) {
    return {
      error: `That's a lot of checkouts. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const parsed = checkoutSchema.safeParse({
    pickup_window_id: formData.get("pickup_window_id"),
    pickup_date: formData.get("pickup_date"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const cart = await readCartCookie();
  if (!cart) return { error: "Your basket is empty." };

  const supabase = await createClient();

  // Reserves stock. Everything after this point must either complete or put
  // the order back, which is why the Stripe failure path cancels it.
  const { data: order, error } = await supabase.rpc("create_order", {
    p_vendor_id: cart.vendorId,
    p_items: cartToRpcItems(cart),
    p_pickup_window_id: parsed.data.pickup_window_id,
    p_pickup_date: parsed.data.pickup_date,
    p_note: parsed.data.note || null,
  });

  if (error || !order) {
    return {
      error: error
        ? rpcMessage(error, "We couldn't place that order.")
        : "We couldn't place that order.",
    };
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", order.vendor_id)
    .maybeSingle();

  if (!vendor) {
    await supabase.rpc("cancel_order", {
      p_order_id: order.id,
      p_reason: "The kitchen became unavailable.",
    });
    return { error: "That kitchen is no longer available." };
  }

  const settings = await getPlatformSettings();
  let checkoutUrl: string;

  try {
    const session = await createOrderCheckoutSession(
      order,
      vendor,
      {
        successUrl: `${publicEnv.appUrl}/orders/${order.id}?placed=1`,
        cancelUrl: `${publicEnv.appUrl}/orders/${order.id}?canceled=1`,
      },
      {
        customerEmail: viewer.user.email,
        ttlMinutes: settings.pending_payment_ttl_minutes,
      },
    );

    if (!session.url) throw new Error("Stripe returned a session with no URL.");

    // stripe_* columns are service-role-only by trigger, so this one write goes
    // through the admin client — after create_order established ownership.
    const admin = createAdminClient();
    await admin
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);

    checkoutUrl = session.url;
  } catch (checkoutError) {
    captureException(checkoutError, { where: "startCheckout", orderId: order.id });

    // Hand the portions straight back rather than making the customer wait for
    // the expiry sweep.
    await supabase.rpc("cancel_order", {
      p_order_id: order.id,
      p_reason: "We couldn't start checkout.",
    });

    return { error: "We couldn't reach Stripe. Nothing has been charged — try again." };
  }

  // The order now owns the basket; a stale cookie would let them re-order it.
  await writeCartCookie(null);
  revalidatePath("/orders");

  redirect(checkoutUrl);
}

// ---------------------------------------------------------------------------
// Customer actions
// ---------------------------------------------------------------------------

export async function cancelMyOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const viewer = await requireViewer("/orders");

  const parsed = cancelOrderSchema.safeParse({
    order_id: formData.get("order_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Unknown order." };

  const supabase = await createClient();

  // Read before cancelling: the RPC returns the updated row, but we need to
  // know whether money had already moved.
  const { data: before } = await supabase
    .from("orders")
    .select("*")
    .eq("id", parsed.data.order_id)
    .maybeSingle();

  if (!before) return { error: "Order not found." };

  const { data: order, error } = await supabase.rpc("cancel_order", {
    p_order_id: parsed.data.order_id,
    p_reason: parsed.data.reason || null,
  });

  if (error || !order) {
    return { error: error ? rpcMessage(error, "We couldn't cancel that order.") : "We couldn't cancel that order." };
  }

  // Stock is already back. Now settle the money side.
  try {
    if (before.status === "pending_payment") {
      await closeOrderCheckout(order);
    } else if (before.paid_at && order.refunded_cents < order.total_cents) {
      await refundOrder(order, { reason: "requested_by_customer" });
    }
  } catch (refundError) {
    // The order is cancelled either way; a stuck refund is a support problem,
    // not a reason to tell the customer their cancellation failed.
    captureException(refundError, { where: "cancelMyOrder", orderId: order.id });
    log.error("Cancellation succeeded but the refund did not.", { orderId: order.id });
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("business_name, pickup_address_line, pickup_city, timezone, profile_id")
    .eq("id", order.vendor_id)
    .maybeSingle();

  if (vendor) {
    const vendorEmail = await emailForProfile(vendor.profile_id);
    const data = await emailDataFor(order, vendor, viewer.user.email ?? "A customer");
    sendEmailInBackground(
      vendorEmail,
      orderCanceledEmail({
        ...data,
        reason: order.cancel_reason ?? "The customer cancelled.",
        refunded: Boolean(before.paid_at),
      }),
      { orderId: order.id },
    );
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  return { ok: "Your order has been cancelled." };
}

// ---------------------------------------------------------------------------
// Vendor actions
// ---------------------------------------------------------------------------

export async function advanceOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  await requireRole(["vendor", "admin"], "/dashboard/vendor/orders");

  const parsed = vendorTransitionSchema.safeParse({
    order_id: formData.get("order_id"),
    next: formData.get("next"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unknown action." };
  }

  const supabase = await createClient();

  const { data: before } = await supabase
    .from("orders")
    .select("*")
    .eq("id", parsed.data.order_id)
    .maybeSingle();

  const { data: order, error } = await supabase.rpc("advance_order_status", {
    p_order_id: parsed.data.order_id,
    p_next: parsed.data.next,
    p_note: parsed.data.note || null,
  });

  if (error || !order) {
    return {
      error: error
        ? rpcMessage(error, "We couldn't update that order.")
        : "We couldn't update that order.",
    };
  }

  // Declining a paid order refunds it in full — the customer never gets food.
  if (parsed.data.next === "rejected" && before?.paid_at) {
    try {
      await refundOrder(order, { reason: "requested_by_customer" });
    } catch (refundError) {
      captureException(refundError, { where: "advanceOrder.reject", orderId: order.id });
    }
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("business_name, pickup_address_line, pickup_city, timezone")
    .eq("id", order.vendor_id)
    .maybeSingle();

  if (vendor) {
    const customerEmail = await emailForProfile(order.customer_id);
    const data = await emailDataFor(order, vendor, "");

    if (parsed.data.next === "accepted") {
      sendEmailInBackground(customerEmail, orderAcceptedEmail(data), { orderId: order.id });
    } else if (parsed.data.next === "ready") {
      sendEmailInBackground(customerEmail, orderReadyEmail(data), { orderId: order.id });
    } else if (parsed.data.next === "rejected") {
      sendEmailInBackground(
        customerEmail,
        orderCanceledEmail({
          ...data,
          reason: order.cancel_reason ?? "The kitchen could not take this order.",
          refunded: Boolean(before?.paid_at),
        }),
        { orderId: order.id },
      );
    }
  }

  revalidatePath("/dashboard/vendor/orders");
  revalidatePath(`/orders/${order.id}`);

  const said = {
    accepted: "Order accepted.",
    ready: "Marked ready for pickup.",
    completed: "Marked as handed over.",
    rejected: "Order declined and refunded.",
  }[parsed.data.next];

  return { ok: said };
}

/**
 * Refund all or part of an order after the fact.
 *
 * Available to the kitchen (making something right) and to admins (resolving a
 * dispute). The ledger entry is written by the resulting `charge.refunded`
 * webhook, not here — Stripe is the authority on what actually moved.
 */
export async function refundOrderAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const viewer = await requireRole(["vendor", "admin"], "/dashboard/vendor/orders");

  const parsed = refundOrderSchema.safeParse({
    order_id: formData.get("order_id"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Could not issue that refund." };
  }

  const supabase = await createClient();

  // RLS restricts this select to the order's own vendor or an admin, so a
  // successful read is the authorisation check.
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", parsed.data.order_id)
    .maybeSingle();

  if (!order) return { error: "Order not found." };
  if (!order.paid_at) return { error: "That order was never charged." };

  const outstanding = order.total_cents - order.refunded_cents;
  if (outstanding <= 0) return { error: "That order has already been fully refunded." };

  const amount = parsed.data.amount ?? outstanding;
  if (amount > outstanding) {
    return { error: `You can refund at most ${(outstanding / 100).toFixed(2)}.` };
  }

  try {
    await refundOrder(order, { amountCents: amount });
  } catch (refundError) {
    captureException(refundError, { where: "refundOrderAction", orderId: order.id });
    return {
      error:
        refundError instanceof Error
          ? refundError.message
          : "Stripe refused that refund.",
    };
  }

  const admin = createAdminClient();
  await admin.from("admin_actions").insert({
    actor_id: viewer.user.id,
    action: "order.refunded",
    subject_type: "order",
    subject_id: order.id,
    note: parsed.data.reason || null,
    metadata: { amount_cents: amount },
  });

  revalidatePath("/dashboard/vendor/orders");
  revalidatePath(`/orders/${order.id}`);
  return { ok: "Refund sent." };
}
