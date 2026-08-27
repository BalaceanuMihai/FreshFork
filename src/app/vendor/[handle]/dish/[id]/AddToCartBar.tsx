"use client";

import { useActionState } from "react";
import { Check, ShoppingBag } from "lucide-react";

import { addToCart, type CartFormState } from "@/lib/actions/cart";
import { cn } from "@/lib/cn";

/** Sticky full-width add-to-basket bar for the dish detail page. */
export function AddToCartBar({
  vendorId,
  menuItemId,
  soldOut,
  price,
}: {
  vendorId: string;
  menuItemId: string;
  soldOut: boolean;
  price: string;
}) {
  const [state, formAction, pending] = useActionState<CartFormState, FormData>(addToCart, {});

  return (
    <div className="fixed bottom-0 inset-x-0 md:relative bg-background/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t border-border md:border-none px-4 py-3 md:px-1 md:pb-6 z-30">
      <form action={formAction}>
        <input type="hidden" name="vendor_id" value={vendorId} />
        <input type="hidden" name="menu_item_id" value={menuItemId} />
        <input type="hidden" name="quantity" value={1} />
        <button
          type="submit"
          disabled={soldOut || pending}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40",
            soldOut ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-accent",
          )}
        >
          {soldOut ? (
            "Sold out"
          ) : state.ok ? (
            <>
              <Check className="w-4 h-4" /> Added — add another · {price}
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" /> {pending ? "Adding…" : `Add to basket · ${price}`}
            </>
          )}
        </button>
        {state.error ? (
          <p className="text-xs text-destructive text-center mt-2" role="alert">
            {state.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
