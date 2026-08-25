import "server-only";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { CART_LIMITS } from "@/lib/cart-limits";
import { quoteFees, type FeeBreakdown } from "@/lib/fees";
import { feeSettingsFrom, getPlatformSettings } from "@/lib/settings";
import { isPlusMember } from "@/lib/membership";
import type { MenuItem, Vendor } from "@/lib/supabase/database.types";

/**
 * The basket, kept in a cookie.
 *
 * It holds dish ids and quantities and nothing else — no prices, no totals. A
 * customer editing the cookie can therefore change *what* they are buying but
 * never *what it costs*: every figure below is re-derived from the database,
 * and `create_order()` re-derives them again before charging anything. That is
 * why the cookie needs no signature.
 *
 * One vendor per basket, because pickup is physical. Adding a dish from a
 * different kitchen replaces the basket rather than silently splitting the
 * order at checkout.
 */

const COOKIE = "ff_cart";
const MAX_LINES = CART_LIMITS.maxLines;
const MAX_QTY = CART_LIMITS.maxQuantity;

export type CartCookie = { vendorId: string; items: { id: string; qty: number }[] };

export type CartLine = {
  menuItem: MenuItem;
  quantity: number;
  lineTotalCents: number;
  /** Set when the dish can no longer be bought as requested. */
  problem: string | null;
};

export type Cart = {
  vendor: Vendor | null;
  lines: CartLine[];
  fees: FeeBreakdown;
  itemCount: number;
  /** True when any line has a problem — checkout must not proceed. */
  hasProblems: boolean;
};

const EMPTY_FEES: FeeBreakdown = {
  subtotalCents: 0,
  serviceFeeCents: 0,
  platformFeeCents: 0,
  totalCents: 0,
  vendorPayoutCents: 0,
  applicationFeeCents: 0,
};

export const EMPTY_CART: Cart = {
  vendor: null,
  lines: [],
  fees: EMPTY_FEES,
  itemCount: 0,
  hasProblems: false,
};

function parse(raw: string | undefined): CartCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as CartCookie).vendorId !== "string" ||
      !Array.isArray((parsed as CartCookie).items)
    ) {
      return null;
    }

    const cookie = parsed as CartCookie;
    const items = cookie.items
      .filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          Number.isInteger(item.qty) &&
          item.qty > 0,
      )
      .slice(0, MAX_LINES)
      .map((item) => ({ id: item.id, qty: Math.min(item.qty, MAX_QTY) }));

    return items.length ? { vendorId: cookie.vendorId, items } : null;
  } catch {
    // A malformed cookie is indistinguishable from no cookie.
    return null;
  }
}

export async function readCartCookie(): Promise<CartCookie | null> {
  const store = await cookies();
  return parse(store.get(COOKIE)?.value);
}

/** Server actions and route handlers only — server components cannot set cookies. */
export async function writeCartCookie(cart: CartCookie | null): Promise<void> {
  const store = await cookies();

  if (!cart || cart.items.length === 0) {
    store.delete(COOKIE);
    return;
  }

  store.set(COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 3,
  });
}

/**
 * Hydrate the cookie into a priced basket.
 *
 * Also the place where a stale basket surfaces: a dish that sold out, went off
 * the menu, or belongs to a kitchen that is no longer live comes back with a
 * `problem` rather than being silently dropped, so the customer finds out here
 * instead of at the payment step.
 */
export async function getCart(): Promise<Cart> {
  const cookie = await readCartCookie();
  if (!cookie) return EMPTY_CART;

  const supabase = await createClient();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", cookie.vendorId)
    .maybeSingle();

  if (!vendor) return EMPTY_CART;

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .eq("vendor_id", cookie.vendorId)
    .in("id", cookie.items.map((item) => item.id));

  const byId = new Map((menuItems ?? []).map((item) => [item.id, item]));

  const lines: CartLine[] = [];
  for (const entry of cookie.items) {
    const menuItem = byId.get(entry.id);
    if (!menuItem) continue; // Deleted outright — nothing left to show.

    let problem: string | null = null;
    if (!vendor.is_live) {
      problem = "This kitchen is not taking orders right now.";
    } else if (!menuItem.is_available) {
      problem = "Sold out.";
    } else if (
      menuItem.quantity_available !== null &&
      menuItem.quantity_available < entry.qty
    ) {
      problem =
        menuItem.quantity_available === 0
          ? "Sold out."
          : `Only ${menuItem.quantity_available} left.`;
    }

    lines.push({
      menuItem,
      quantity: entry.qty,
      lineTotalCents: menuItem.price_cents * entry.qty,
      problem,
    });
  }

  const subtotal = lines
    .filter((line) => !line.problem)
    .reduce((sum, line) => sum + line.lineTotalCents, 0);

  const [settings, hasPlus] = await Promise.all([
    getPlatformSettings(),
    isPlusMember(),
  ]);

  return {
    vendor,
    lines,
    fees: quoteFees(subtotal, feeSettingsFrom(settings), hasPlus),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    hasProblems: lines.some((line) => line.problem !== null),
  };
}

/** The `p_items` payload `create_order()` expects. */
export function cartToRpcItems(cart: CartCookie): { menu_item_id: string; quantity: number }[] {
  return cart.items.map((item) => ({ menu_item_id: item.id, quantity: item.qty }));
}

export { CART_LIMITS } from "@/lib/cart-limits";
