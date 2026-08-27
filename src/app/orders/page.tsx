import Link from "next/link";
import { Package } from "lucide-react";

import { requireViewer } from "@/lib/auth";
import { formatPickup, getMyOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type StatusTone } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
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

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  pending_payment: "neutral",
  payment_failed: "danger",
  paid: "info",
  accepted: "info",
  ready: "success",
  completed: "neutral",
  rejected: "danger",
  canceled: "neutral",
  refunded: "neutral",
};

export default async function OrdersPage() {
  await requireViewer("/orders");
  const orders = await getMyOrders();

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <h1 className="font-display text-2xl font-semibold">My orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          body="Your order history will appear here once you've placed your first order."
          action={
            <Link href="/browse" className={buttonClasses("primary")}>
              Find something to eat
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-card rounded-xl border border-border p-4 space-y-3 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{order.vendor?.business_name ?? "A kitchen"}</p>
                  <p className="text-xs text-muted-foreground">{formatPickup(order, order.vendor?.timezone ?? null)}</p>
                </div>
                <StatusPill label={STATUS_COPY[order.status]} tone={STATUS_TONE[order.status]} />
              </div>

              <div className="text-xs text-muted-foreground flex flex-col gap-0.5 border-t border-border pt-3">
                {order.items.map((item) => (
                  <span key={item.id} className="truncate">
                    {item.quantity}× {item.name_snapshot}
                  </span>
                ))}
                <div className="flex justify-between gap-3 font-semibold text-foreground pt-1 border-t border-border mt-1">
                  <span>Total</span>
                  <span>{formatPrice(order.total_cents, order.currency)}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-mono">{order.code}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
