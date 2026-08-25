import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { log } from "@/lib/log";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PickupSlot,
  Vendor,
} from "@/lib/supabase/database.types";

/**
 * Order reads.
 *
 * No authorisation logic lives here — RLS on `orders` and `order_items` already
 * restricts every row to its customer, its vendor and admins. These functions
 * exist to shape the data, not to guard it. Related rows are fetched with
 * explicit follow-up queries rather than PostgREST embedding, which keeps the
 * result types honest instead of leaning on inferred join shapes.
 */

export type OrderWithItems = Order & {
  items: OrderItem[];
  vendor: Pick<
    Vendor,
    | "id"
    | "business_name"
    | "handle"
    | "pickup_address_line"
    | "pickup_city"
    | "pickup_postal_code"
    | "timezone"
  > | null;
};

const VENDOR_FIELDS =
  "id, business_name, handle, pickup_address_line, pickup_city, pickup_postal_code, timezone";

async function decorate(orders: Order[]): Promise<OrderWithItems[]> {
  if (orders.length === 0) return [];

  const supabase = await createClient();
  const orderIds = orders.map((order) => order.id);
  const vendorIds = [...new Set(orders.map((order) => order.vendor_id))];

  const [itemsResult, vendorsResult] = await Promise.all([
    supabase.from("order_items").select("*").in("order_id", orderIds),
    supabase.from("vendors").select(VENDOR_FIELDS).in("id", vendorIds),
  ]);

  if (itemsResult.error) {
    log.error("Could not load order items.", { error: itemsResult.error.message });
  }
  if (vendorsResult.error) {
    log.error("Could not load order vendors.", { error: vendorsResult.error.message });
  }

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of itemsResult.data ?? []) {
    const bucket = itemsByOrder.get(item.order_id);
    if (bucket) bucket.push(item);
    else itemsByOrder.set(item.order_id, [item]);
  }

  const vendorsById = new Map(
    (vendorsResult.data ?? []).map((vendor) => [vendor.id, vendor]),
  );

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
    vendor: vendorsById.get(order.vendor_id) ?? null,
  }));
}

/** The signed-in customer's order history, newest first. */
export const getMyOrders = cache(async (): Promise<OrderWithItems[]> => {
  const viewer = await getViewer();
  if (!viewer) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", viewer.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    log.error("Could not load orders.", { error: error.message });
    return [];
  }

  return decorate(data ?? []);
});

/**
 * One order, if the viewer is allowed to see it.
 *
 * Returns null for "not found" and "not yours" alike — RLS makes them the same
 * query result, and telling the two apart would confirm an order id exists.
 */
export async function getOrder(orderId: string): Promise<OrderWithItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    log.error("Could not load order.", { error: error.message, orderId });
    return null;
  }
  if (!data) return null;

  const [decorated] = await decorate([data]);
  return decorated ?? null;
}

/** Orders against a vendor, optionally narrowed to a set of statuses. */
export async function getVendorOrders(
  vendorId: string,
  statuses?: readonly OrderStatus[],
): Promise<OrderWithItems[]> {
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("pickup_at", { ascending: true })
    .limit(200);

  if (statuses?.length) query = query.in("status", statuses as OrderStatus[]);

  const { data, error } = await query;
  if (error) {
    log.error("Could not load vendor orders.", { error: error.message, vendorId });
    return [];
  }

  return decorate(data ?? []);
}

/** Bookable slots for a kitchen, already filtered by lead time and horizon. */
export async function getPickupSlots(
  vendorId: string,
  days?: number,
): Promise<PickupSlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vendor_pickup_slots", {
    p_vendor_id: vendorId,
    p_days: days ?? null,
  });

  if (error) {
    log.error("Could not load pickup slots.", { error: error.message, vendorId });
    return [];
  }

  return (data ?? []) as PickupSlot[];
}

/** Whether this order can still be reviewed, mirroring submit_review()'s rules. */
export function canReview(order: Order): boolean {
  if (order.status !== "completed" || !order.completed_at) return false;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(order.completed_at).getTime() < thirtyDays;
}

/** "Tue 26 Aug, 6–8 pm" in the kitchen's own timezone, not the reader's. */
export function formatPickup(order: Order, timezone: string | null): string {
  const zone = timezone ?? "UTC";
  const start = new Date(order.pickup_at);
  const end = new Date(order.pickup_ends_at);

  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: zone,
  }).format(start);

  const time = (value: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: zone,
    })
      .format(value)
      .replace(":00", "");

  return `${day}, ${time(start)}–${time(end)}`;
}
