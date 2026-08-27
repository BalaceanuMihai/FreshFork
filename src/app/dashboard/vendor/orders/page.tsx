import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { getOwnVendor } from "@/lib/vendors-data";
import { formatPickup, getVendorOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { OrderActions } from "./OrderActions";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <EmptyState
          icon={ClipboardList}
          title="Finish setting up your kitchen first"
          body="Orders will appear here once your listing is live."
          action={
            <Link href="/dashboard/vendor/onboarding/business" className={buttonClasses("primary")}>
              Start onboarding
            </Link>
          }
        />
      </div>
    );
  }

  const showAll = query.all === "1";
  const orders = await getVendorOrders(vendor.id, showAll ? undefined : VENDOR_ACTIONABLE_STATUSES);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Orders</h1>
        <Link
          href={showAll ? "/dashboard/vendor/orders" : "/dashboard/vendor/orders?all=1"}
          className="text-sm text-primary font-medium hover:underline"
        >
          {showAll ? "Only what needs attention" : "Show every order"}
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={showAll ? "No orders yet" : "Queue is clear"}
          body={showAll ? "Orders will appear here once customers start ordering." : "Nothing waiting on you right now."}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{order.code}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pickup {formatPickup(order, vendor.timezone)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-display font-semibold text-base">{formatPrice(order.total_cents, order.currency)}</span>
                  <StatusPill label={NEXT_STEP[order.status] ?? order.status.replace("_", " ")} tone="info" />
                </div>
              </div>

              <ul className="flex flex-col gap-1 border-t border-border pt-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 text-sm text-muted-foreground">
                    <span className="truncate">
                      {item.quantity}× {item.name_snapshot}
                      {item.prep_note_snapshot ? ` (${item.prep_note_snapshot})` : null}
                    </span>
                  </li>
                ))}
              </ul>

              {order.customer_note ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  <strong>Note:</strong> {order.customer_note}
                </div>
              ) : null}

              <OrderActions
                orderId={order.id}
                status={order.status}
                refundable={Boolean(order.paid_at) && order.refunded_cents < order.total_cents}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
