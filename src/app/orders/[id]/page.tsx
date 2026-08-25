import Link from "next/link";
import { notFound } from "next/navigation";

import { requireViewer } from "@/lib/auth";
import { canReview, formatPickup, getOrder } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { CancelOrderForm, ReviewForm } from "./OrderForms";
import type { OrderStatus } from "@/lib/supabase/database.types";

export const metadata = { title: "Order · FreshFork" };

const STATUS_COPY: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  payment_failed: "Payment failed — nothing was charged",
  paid: "Sent to the kitchen",
  accepted: "Being cooked",
  ready: "Ready for pickup",
  completed: "Picked up",
  rejected: "Declined by the kitchen",
  canceled: "Cancelled",
  refunded: "Refunded",
};

/** Statuses where a customer may still pull out. Mirrors `cancel_order()`. */
const CANCELLABLE: OrderStatus[] = ["pending_payment", "paid", "accepted"];

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireViewer("/orders");
  const { id } = await params;
  const query = await searchParams;

  // RLS restricts this read to the order's customer, its vendor, or an admin,
  // so a successful load *is* the authorisation check.
  const order = await getOrder(id);
  if (!order) notFound();

  const isCustomer = order.customer_id === viewer.user.id;

  const supabase = await createClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("*")
    .eq("order_id", order.id)
    .maybeSingle();

  const address = [order.vendor?.pickup_address_line, order.vendor?.pickup_city]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      {query.placed === "1" ? (
        <p role="status">Payment received — the kitchen has your order.</p>
      ) : null}
      {query.canceled === "1" ? (
        <p role="status">
          You left checkout, so nothing was charged. The order will release itself
          shortly.
        </p>
      ) : null}

      <h1>Order {order.code}</h1>
      <p>{STATUS_COPY[order.status]}</p>

      {order.status === "ready" ? (
        <p>
          Show the code <strong>{order.code}</strong> when you collect.
        </p>
      ) : null}

      {order.cancel_reason ? <p>{order.cancel_reason}</p> : null}
      {order.vendor_note ? <p>From the kitchen: {order.vendor_note}</p> : null}

      <h2>Pickup</h2>
      <p>
        {order.vendor ? (
          <Link href={`/vendor/${order.vendor.handle}`}>
            {order.vendor.business_name}
          </Link>
        ) : (
          "A kitchen"
        )}
      </p>
      <p>{formatPickup(order, order.vendor?.timezone ?? null)}</p>
      {address ? <p>{address}</p> : null}

      <h2>What you ordered</h2>
      <ul>
        {order.items.map((item) => (
          <li key={item.id}>
            {item.name_snapshot} × {item.quantity} —{" "}
            {formatPrice(item.line_total_cents, order.currency)}
            {/* Snapshotted at purchase time: a later menu edit must never
                rewrite the allergen record for an order already eaten. */}
            {item.allergens_snapshot.length > 0 ? (
              <span> · contains {item.allergens_snapshot.join(", ")}</span>
            ) : null}
          </li>
        ))}
      </ul>

      <dl>
        <dt>Subtotal</dt>
        <dd>{formatPrice(order.subtotal_cents, order.currency)}</dd>
        <dt>Service fee</dt>
        <dd>
          {order.service_fee_cents === 0
            ? "Waived with Plus"
            : formatPrice(order.service_fee_cents, order.currency)}
        </dd>
        <dt>Total</dt>
        <dd>{formatPrice(order.total_cents, order.currency)}</dd>
        {order.refunded_cents > 0 ? (
          <>
            <dt>Refunded</dt>
            <dd>{formatPrice(order.refunded_cents, order.currency)}</dd>
          </>
        ) : null}
      </dl>

      {isCustomer && CANCELLABLE.includes(order.status) ? (
        <CancelOrderForm orderId={order.id} />
      ) : null}

      {isCustomer && canReview(order) && !review ? (
        <ReviewForm orderId={order.id} />
      ) : null}

      {review ? (
        <section>
          <h2>Your review</h2>
          <p>{review.rating} out of 5</p>
          {review.body ? <p>{review.body}</p> : null}
          {review.vendor_reply ? (
            <p>Reply from the kitchen: {review.vendor_reply}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
