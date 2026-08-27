"use client";

import { useActionState, useState } from "react";
import { Clock } from "lucide-react";

import { startCheckout, type OrderFormState } from "@/lib/actions/orders";
import { Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { PickupSlot } from "@/lib/supabase/database.types";

/**
 * Slot picker plus the button that hands off to Stripe.
 *
 * The slot list comes from `vendor_pickup_slots()`, which applies the same
 * lead time and horizon `create_order()` enforces — so the form cannot offer a
 * time the server will then refuse.
 *
 * The chosen slot is mirrored into two hidden fields rather than submitted as
 * one composite value, so the action receives a plain uuid and a plain date
 * and `checkoutSchema` has something simple to validate.
 */
export function CheckoutForm({
  slots,
  disabled,
  timezone,
}: {
  slots: PickupSlot[];
  disabled: boolean;
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(startCheckout, {});
  const [selected, setSelected] = useState(0);

  const chosen = slots[selected] ?? slots[0];

  const label = (slot: PickupSlot) =>
    new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      // The kitchen's timezone, not the reader's: 6 pm means 6 pm where the
      // food is, even if the customer is checking out from another country.
      timeZone: timezone,
    }).format(new Date(slot.starts_at));

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <fieldset disabled={pending || disabled} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" /> Choose pickup slot
          </label>
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot, index) => (
              <label key={`${slot.pickup_window_id}-${slot.pickup_date}`} className="cursor-pointer">
                <input
                  type="radio"
                  name="slot"
                  checked={index === selected}
                  onChange={() => setSelected(index)}
                  required
                  className="sr-only"
                />
                <span
                  className={cn(
                    "block text-center px-3 py-2 text-sm rounded-xl border transition-colors",
                    index === selected
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  {label(slot)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <input type="hidden" name="pickup_window_id" value={chosen?.pickup_window_id ?? ""} />
        <input type="hidden" name="pickup_date" value={chosen?.pickup_date ?? ""} />

        <div className="space-y-1.5">
          <label htmlFor="note" className="text-sm font-medium">
            Anything the cook should know? <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea id="note" name="note" maxLength={500} rows={3} placeholder="Allergies, preferences, or anything else…" />
        </div>

        <Button type="submit" className="w-full text-base py-3">
          {pending ? "Taking you to payment…" : "Pay and place order"}
        </Button>
      </fieldset>
    </form>
  );
}
