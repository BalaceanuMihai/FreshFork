import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, ChefHat } from "lucide-react";

import { requireViewer } from "@/lib/auth";
import { canReview, formatPickup, getOrder } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { allergenLabel } from "@/lib/constants/taxonomy";
import { CancelOrderForm, ReviewForm } from "./OrderForms";
import { AllergenTag } from "@/components/ui/badge";
import { Stars } from "@/components/ui/stars";
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

  const address = [order.vendor?.pickup_address_line, order.vendor?.pickup_city].filter(Boolean).join(", ");

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {query.placed === "1" ? (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2" role="status">
          <CheckCircle className="w-4 h-4 shrink-0" /> Payment received — the kitchen has your order.
        </div>
      ) : null}
      {query.canceled === "1" ? (
        <div className="bg-secondary rounded-xl px-4 py-3 text-sm" role="status">
          You left checkout, so nothing was charged. The order will release itself shortly.
        </div>
      ) : null}

      <div>
        <h1 className="font-display text-xl font-semibold">Order {order.code}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{STATUS_COPY[order.status]}</p>
      </div>

      {order.status === "ready" ? (
        <div className="bg-primary rounded-2xl p-6 text-center text-primary-foreground space-y-2">
          <p className="text-sm opacity-80 uppercase tracking-wider font-medium">Pickup code</p>
          <p className="font-display text-4xl font-semibold tracking-widest">{order.code}</p>
          <p className="text-xs opacity-70">Show this code when you collect.</p>
        </div>
      ) : null}

      {order.cancel_reason ? (
        <div className="bg-secondary rounded-xl px-4 py-3 text-sm">{order.cancel_reason}</div>
      ) : null}
      {order.vendor_note ? (
        <div className="bg-secondary rounded-xl px-4 py-3 text-sm">From the kitchen: {order.vendor_note}</div>
      ) : null}

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-medium text-sm">
          {order.vendor ? (
            <Link href={`/vendor/${order.vendor.handle}`} className="hover:text-primary transition-colors">
              {order.vendor.business_name}
            </Link>
          ) : (
            "A kitchen"
          )}
        </h2>
        <p className="text-sm text-muted-foreground">{formatPickup(order, order.vendor?.timezone ?? null)}</p>
        {address ? <p className="text-xs text-muted-foreground">{address}</p> : null}

        <div className="space-y-2 border-t border-border pt-3">
          {order.items.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>
                  {item.quantity}× {item.name_snapshot}
                </span>
                <span className="text-muted-foreground">{formatPrice(item.line_total_cents, order.currency)}</span>
              </div>
              {/* Snapshotted at purchase time: a later menu edit must never
                  rewrite the allergen record for an order already eaten. */}
              {item.allergens_snapshot.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {item.allergens_snapshot.map((a) => (
                    <AllergenTag key={a} label={allergenLabel(a)} />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal_cents, order.currency)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service fee</span>
            <span>{order.service_fee_cents === 0 ? "Waived with Plus" : formatPrice(order.service_fee_cents, order.currency)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.total_cents, order.currency)}</span>
          </div>
          {order.refunded_cents > 0 ? (
            <div className="flex justify-between text-green-700">
              <span>Refunded</span>
              <span>{formatPrice(order.refunded_cents, order.currency)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {isCustomer && CANCELLABLE.includes(order.status) ? <CancelOrderForm orderId={order.id} /> : null}

      {isCustomer && canReview(order) && !review ? <ReviewForm orderId={order.id} /> : null}

      {review ? (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <h2 className="font-display text-lg font-semibold">Your review</h2>
          <Stars rating={review.rating} />
          {review.body ? <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p> : null}
          {review.vendor_reply ? (
            <div className="bg-secondary rounded-lg p-3 mt-2 border-l-2 border-primary">
              <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                <ChefHat className="w-3 h-3" /> Reply from the kitchen
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{review.vendor_reply}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
