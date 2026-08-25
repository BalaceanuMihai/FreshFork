import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getOwnVendor } from "@/lib/vendors-data";
import { formatPickup, getVendorOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { OrderActions } from "./OrderActions";
import {
  VENDOR_ACTIONABLE_STATUSES,
  type OrderStatus,
} from "@/lib/supabase/database.types";

export const metadata = { title: "Orders · FreshFork" };

/** What the kitchen is expected to do next, per status. */
const NEXT_STEP: Partial<Record<OrderStatus, string>> = {
  paid: "Accept or decline",
  accepted: "Cooking — mark ready when it's done",
  ready: "Waiting for pickup",
};

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("vendor", "/dashboard/vendor/orders");
  const query = await searchParams;
  const vendor = await getOwnVendor();

  if (!vendor) {
    return (
      <div>
        <h1>Orders</h1>
        <p>Finish setting up your kitchen first.</p>
        <Link href="/dashboard/vendor/onboarding/business">Start onboarding</Link>
      </div>
    );
  }

  const showAll = query.all === "1";

  // The queue defaults to what needs attention. Everything else is history and
  // would only bury the two orders that are actually waiting on the cook.
  const orders = await getVendorOrders(
    vendor.id,
    showAll ? undefined : VENDOR_ACTIONABLE_STATUSES,
  );

  return (
    <div>
      <h1>Orders</h1>
      <p>
        {showAll ? (
          <Link href="/dashboard/vendor/orders">Show only what needs attention</Link>
        ) : (
          <Link href="/dashboard/vendor/orders?all=1">Show every order</Link>
        )}
      </p>

      {orders.length === 0 ? (
        <p>
          {showAll ? "No orders yet." : "Nothing waiting on you right now."}
        </p>
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order.id}>
              <h2>
                {order.code} · {formatPrice(order.total_cents, order.currency)}
              </h2>
              <p>Pickup {formatPickup(order, vendor.timezone)}</p>
              <p>{NEXT_STEP[order.status] ?? order.status.replace("_", " ")}</p>

              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.name_snapshot} × {item.quantity}
                    {item.prep_note_snapshot ? ` (${item.prep_note_snapshot})` : null}
                  </li>
                ))}
              </ul>

              {order.customer_note ? (
                <p>
                  <strong>Note:</strong> {order.customer_note}
                </p>
              ) : null}

              <OrderActions
                orderId={order.id}
                status={order.status}
                refundable={Boolean(order.paid_at) && order.refunded_cents < order.total_cents}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
