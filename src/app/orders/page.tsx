import Link from "next/link";

import { requireViewer } from "@/lib/auth";
import { formatPickup, getMyOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/supabase/database.types";

export const metadata = { title: "Your orders · FreshFork" };

/** What each status means to the person who bought the food. */
const STATUS_COPY: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  payment_failed: "Payment failed",
  paid: "Sent to the kitchen",
  accepted: "Being cooked",
  ready: "Ready for pickup",
  completed: "Picked up",
  rejected: "Declined by the kitchen",
  canceled: "Cancelled",
  refunded: "Refunded",
};

export default async function OrdersPage() {
  await requireViewer("/orders");
  const orders = await getMyOrders();

  if (orders.length === 0) {
    return (
      <div>
        <h1>Your orders</h1>
        <p>Nothing here yet.</p>
        <Link href="/browse">Find something to eat</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Your orders</h1>

      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            <h2>
              <Link href={`/orders/${order.id}`}>
                {order.vendor?.business_name ?? "A kitchen"}
              </Link>
            </h2>
            <p>
              {order.code} · {STATUS_COPY[order.status]} ·{" "}
              {formatPrice(order.total_cents, order.currency)}
            </p>
            <p>Pickup {formatPickup(order, order.vendor?.timezone ?? null)}</p>
            <p>
              {order.items
                .map((item) => `${item.name_snapshot} × ${item.quantity}`)
                .join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
