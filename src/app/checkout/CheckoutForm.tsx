"use client";

import { useActionState, useState } from "react";

import { startCheckout, type OrderFormState } from "@/lib/actions/orders";
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
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(
    startCheckout,
    {},
  );
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
    <form action={formAction}>
      {state.error ? <p role="alert">{state.error}</p> : null}

      <fieldset disabled={pending || disabled}>
        <legend>Pick up at</legend>

        {slots.map((slot, index) => (
          <label key={`${slot.pickup_window_id}-${slot.pickup_date}`}>
            <input
              type="radio"
              name="slot"
              checked={index === selected}
              onChange={() => setSelected(index)}
              required
            />
            {label(slot)}
          </label>
        ))}

        <input
          type="hidden"
          name="pickup_window_id"
          value={chosen?.pickup_window_id ?? ""}
        />
        <input type="hidden" name="pickup_date" value={chosen?.pickup_date ?? ""} />

        <label htmlFor="note">Anything the cook should know?</label>
        <textarea id="note" name="note" maxLength={500} rows={3} />

        <button type="submit">
          {pending ? "Taking you to payment…" : "Pay and place order"}
        </button>
      </fieldset>

      <p>You&apos;ll be taken to Stripe to pay. Nothing is charged until you confirm.</p>
    </form>
  );
}
