"use server";

import { revalidatePath } from "next/cache";

import { readCartCookie, writeCartCookie, CART_LIMITS } from "@/lib/cart";
import { addToCartSchema, updateCartLineSchema } from "@/lib/validation/order";

export type CartFormState = { error?: string; ok?: string };

/**
 * Basket mutations.
 *
 * These only ever move ids and quantities around a cookie — no pricing, no
 * stock reservation, no authorisation. Nothing is committed until
 * `create_order()` runs, which re-checks all three. That is deliberate: a
 * basket should not hold a scarce portion hostage while somebody browses.
 */

export async function addToCart(
  _prev: CartFormState,
  formData: FormData,
): Promise<CartFormState> {
  const parsed = addToCartSchema.safeParse({
    vendor_id: formData.get("vendor_id"),
    menu_item_id: formData.get("menu_item_id"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Could not add that dish." };
  }

  const current = await readCartCookie();

  // Pickup is physical, so a basket cannot span two kitchens. Switching
  // kitchens replaces the basket rather than quietly splitting the order at
  // checkout, where it would be a much less welcome surprise.
  const items =
    current && current.vendorId === parsed.data.vendor_id ? [...current.items] : [];

  const existing = items.find((item) => item.id === parsed.data.menu_item_id);
  if (existing) {
    existing.qty = Math.min(existing.qty + parsed.data.quantity, CART_LIMITS.maxQuantity);
  } else {
    if (items.length >= CART_LIMITS.maxLines) {
      return { error: `A basket holds up to ${CART_LIMITS.maxLines} different dishes.` };
    }
    items.push({ id: parsed.data.menu_item_id, qty: parsed.data.quantity });
  }

  await writeCartCookie({ vendorId: parsed.data.vendor_id, items });

  revalidatePath("/", "layout");
  return { ok: "Added to your basket." };
}

export async function updateCartLine(
  _prev: CartFormState,
  formData: FormData,
): Promise<CartFormState> {
  const parsed = updateCartLineSchema.safeParse({
    menu_item_id: formData.get("menu_item_id"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Could not update your basket." };
  }

  const current = await readCartCookie();
  if (!current) return { error: "Your basket is empty." };

  const items = current.items
    .map((item) =>
      item.id === parsed.data.menu_item_id
        ? { ...item, qty: parsed.data.quantity }
        : item,
    )
    .filter((item) => item.qty > 0);

  await writeCartCookie(items.length ? { vendorId: current.vendorId, items } : null);

  revalidatePath("/", "layout");
  return {};
}

export async function clearCart(): Promise<void> {
  await writeCartCookie(null);
  revalidatePath("/", "layout");
}
