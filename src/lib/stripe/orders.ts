import "server-only";

import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import type { Order, Vendor } from "@/lib/supabase/database.types";

/**
 * Charging for an order.
 *
 * Destination charges: the customer pays FreshFork, Stripe splits off
 * `application_fee_amount` for us, and the remainder settles to the cook's
 * connected account. The alternative — charging on the connected account
 * directly — would put the cook on the hook for disputes and refunds, which is
 * not the deal a home kitchen signed up for.
 *
 * Hosted Checkout rather than Elements, matching how the Plus membership
 * already takes payment: no card data touches this codebase and there is no
 * client-side payment bundle to maintain.
 *
 * Every call carries an idempotency key derived from the order id, so a retried
 * server action cannot open a second checkout for the same basket.
 */

export type CheckoutUrls = { successUrl: string; cancelUrl: string };

export function createOrderCheckoutSession(
  order: Order,
  vendor: Vendor,
  urls: CheckoutUrls,
  options: {
    customerEmail?: string | null;
    ttlMinutes?: number;
    lineDescription?: string;
  } = {},
): Promise<Stripe.Checkout.Session> {
  if (!vendor.stripe_account_id) {
    throw new Error("This kitchen has not finished payouts setup.");
  }

  // Stripe's floor is 30 minutes. Keeping the session's expiry in step with
  // our own pending-payment TTL is what stops a customer paying for an order
  // whose stock we already handed back.
  const ttlMinutes = Math.max(30, options.ttlMinutes ?? 30);

  return getStripe().checkout.sessions.create(
    {
      mode: "payment",
      // One line for the whole basket: the itemised breakdown lives on the
      // order, and Stripe only needs to collect a single amount.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: order.currency,
            unit_amount: order.total_cents,
            product_data: {
              name: `${vendor.business_name} — order ${order.code}`,
              description:
                options.lineDescription ?? "Pickup order placed through FreshFork",
            },
          },
        },
      ],
      payment_intent_data: {
        // The platform keeps its commission plus the customer-side service
        // fee; the cook receives the rest.
        application_fee_amount: order.platform_fee_cents + order.service_fee_cents,
        transfer_data: { destination: vendor.stripe_account_id },
        description: `FreshFork order ${order.code} — ${vendor.business_name}`,
        // Written to the PaymentIntent as well as the session: the webhook
        // resolves the order from either, and so does support.
        metadata: {
          order_id: order.id,
          order_code: order.code,
          vendor_id: order.vendor_id,
          customer_id: order.customer_id,
        },
      },
      customer_email: options.customerEmail ?? undefined,
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_code: order.code },
      expires_at: Math.floor(Date.now() / 1000) + ttlMinutes * 60,
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
    },
    { idempotencyKey: `order-checkout-${order.id}` },
  );
}

/**
 * Refund an order, reversing our fee along with it.
 *
 * `reverse_transfer` claws the money back out of the cook's balance and
 * `refund_application_fee` gives back our commission — we do not keep a cut of
 * food that was never handed over. The resulting `charge.refunded` webhook is
 * what writes the ledger; nothing is recorded here.
 */
export function refundOrder(
  order: Order,
  options: { amountCents?: number; reason?: Stripe.RefundCreateParams.Reason } = {},
): Promise<Stripe.Refund> {
  if (!order.stripe_payment_intent_id) {
    throw new Error("That order was never charged.");
  }

  const amount = options.amountCents ?? order.total_cents - order.refunded_cents;
  if (amount <= 0) {
    throw new Error("That order has already been fully refunded.");
  }

  return getStripe().refunds.create(
    {
      payment_intent: order.stripe_payment_intent_id,
      amount,
      reason: options.reason ?? "requested_by_customer",
      reverse_transfer: true,
      refund_application_fee: true,
      metadata: { order_id: order.id, order_code: order.code },
    },
    // Keyed on the running total so a full refund after a partial one is a
    // different key, but a retry of the same request is not.
    { idempotencyKey: `order-refund-${order.id}-${order.refunded_cents + amount}` },
  );
}

/**
 * Close off an unpaid order's checkout so it cannot be paid after the fact.
 *
 * Called when the customer cancels a checkout they never completed. Sessions
 * expire on their own too, but an expiry we did not ask for can be half an
 * hour away — long enough for somebody to finish paying for stock we have
 * already handed back to the kitchen.
 */
export async function closeOrderCheckout(order: Order): Promise<void> {
  const stripe = getStripe();

  if (order.stripe_checkout_session_id) {
    try {
      await stripe.checkout.sessions.expire(order.stripe_checkout_session_id);
    } catch {
      // Already expired, already completed, or gone.
    }
  }

  if (order.stripe_payment_intent_id) {
    try {
      await stripe.paymentIntents.cancel(order.stripe_payment_intent_id, {
        cancellation_reason: "abandoned",
      });
    } catch {
      // Already captured or already cancelled — the order's own status is
      // authoritative either way.
    }
  }
}
