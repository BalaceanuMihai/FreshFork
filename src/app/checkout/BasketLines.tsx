"use client";

import { useActionState } from "react";
import { Minus, Plus, X } from "lucide-react";

import { updateCartLine, type CartFormState } from "@/lib/actions/cart";
import { formatPrice } from "@/lib/format";
import { AllergenTag } from "@/components/ui/badge";
import { allergenLabel } from "@/lib/constants/taxonomy";
import type { CartLine } from "@/lib/cart";

export function BasketLines({ lines, currency }: { lines: CartLine[]; currency: string }) {
  return (
    <div className="space-y-3">
      {lines.map((line) => (
        <BasketLineRow key={line.menuItem.id} line={line} currency={currency} />
      ))}
    </div>
  );
}

function BasketLineRow({ line, currency }: { line: CartLine; currency: string }) {
  const [, formAction, pending] = useActionState<CartFormState, FormData>(updateCartLine, {});

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex gap-3">
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="font-medium text-sm truncate">{line.menuItem.name}</p>
        <p className="text-xs text-muted-foreground">{formatPrice(line.menuItem.price_cents, currency)} each</p>
        {line.problem ? <p className="text-xs text-destructive font-medium">{line.problem}</p> : null}
        {line.menuItem.allergens.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {line.menuItem.allergens.map((a) => (
              <AllergenTag key={a} label={allergenLabel(a)} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <span className="font-semibold text-sm">{formatPrice(line.lineTotalCents, currency)}</span>
        <div className="flex items-center gap-2">
          <form action={formAction}>
            <input type="hidden" name="menu_item_id" value={line.menuItem.id} />
            <input type="hidden" name="quantity" value={line.quantity - 1} />
            <button
              type="submit"
              disabled={pending}
              aria-label={line.quantity <= 1 ? "Remove" : "Decrease quantity"}
              className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {line.quantity <= 1 ? <X className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            </button>
          </form>
          <span className="text-sm font-medium w-4 text-center">{line.quantity}</span>
          <form action={formAction}>
            <input type="hidden" name="menu_item_id" value={line.menuItem.id} />
            <input type="hidden" name="quantity" value={line.quantity + 1} />
            <button
              type="submit"
              disabled={pending}
              aria-label="Increase quantity"
              className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
