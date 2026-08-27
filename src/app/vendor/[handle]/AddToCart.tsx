"use client";

import { useActionState } from "react";
import { Check, Plus } from "lucide-react";

import { addToCart, type CartFormState } from "@/lib/actions/cart";
import { cn } from "@/lib/cn";

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
  const [state, formAction, pending] = useActionState<CartFormState, FormData>(addToCart, {});

  if (soldOut) {
    return <span className="text-xs font-medium text-destructive">Sold out</span>;
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input type="hidden" name="vendor_id" value={vendorId} />
        <input type="hidden" name="menu_item_id" value={menuItemId} />
        <label htmlFor={`qty-${menuItemId}`} className="sr-only">
          Quantity
        </label>
        <select
          id={`qty-${menuItemId}`}
          name="quantity"
          defaultValue={1}
          className="h-8 px-2 rounded-lg border border-border bg-input-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-primary text-primary-foreground hover:bg-accent disabled:opacity-50",
          )}
        >
          {state.ok ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {pending ? "Adding…" : state.ok ? "Added" : "Add to basket"}
        </button>
      </div>
      {state.error ? <p className="text-xs text-destructive" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-green-700" role="status">{state.ok}</p> : null}
    </form>
  );
}
