"use client";

import { useActionState } from "react";

import { addToCart, type CartFormState } from "@/lib/actions/cart";

/**
 * The one entry point into ordering.
 *
 * Adds ids and a quantity to a cookie and nothing else — no price is sent, no
 * stock is reserved. Both of those happen in `create_order()` at checkout,
 * which is why a basket can sit around without holding a scarce portion
 * hostage.
 */
export function AddToCart({
  vendorId,
  menuItemId,
  soldOut,
  max,
}: {
  vendorId: string;
  menuItemId: string;
  soldOut: boolean;
  max: number;
}) {
  const [state, formAction, pending] = useActionState<CartFormState, FormData>(
    addToCart,
    {},
  );

  if (soldOut) {
    return <p>Sold out</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="vendor_id" value={vendorId} />
      <input type="hidden" name="menu_item_id" value={menuItemId} />

      <label htmlFor={`qty-${menuItemId}`}>Quantity</label>
      <input
        id={`qty-${menuItemId}`}
        name="quantity"
        type="number"
        min={1}
        max={max}
        defaultValue={1}
      />

      <button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add to basket"}
      </button>

      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.ok ? <p role="status">{state.ok}</p> : null}
    </form>
  );
}
