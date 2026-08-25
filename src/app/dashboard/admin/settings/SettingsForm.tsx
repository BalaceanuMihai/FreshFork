"use client";

import { useActionState } from "react";

import { updatePlatformSettings, type AccountFormState } from "@/lib/actions/account";
import type { PlatformSettings } from "@/lib/supabase/database.types";

/**
 * Every field is validated again by `platformSettingsSchema` and constrained a
 * third time by CHECK constraints on the table, so a bad number here fails
 * loudly rather than quietly repricing the marketplace.
 */
const FIELDS: {
  name: keyof PlatformSettings;
  label: string;
  hint: string;
  min: number;
  max: number;
}[] = [
  {
    name: "platform_fee_bps",
    label: "Platform commission (basis points)",
    hint: "Taken from the cook's side. 1200 = 12%.",
    min: 0,
    max: 10_000,
  },
  {
    name: "service_fee_bps",
    label: "Customer service fee (basis points)",
    hint: "Added to the customer's total. Waived for Plus members.",
    min: 0,
    max: 10_000,
  },
  {
    name: "service_fee_min_cents",
    label: "Service fee floor (cents)",
    hint: "Never applied to an empty basket.",
    min: 0,
    max: 10_000,
  },
  {
    name: "service_fee_max_cents",
    label: "Service fee cap (cents)",
    hint: "Must be at or above the floor.",
    min: 0,
    max: 10_000,
  },
  {
    name: "order_lead_minutes",
    label: "Minimum notice (minutes)",
    hint: "How far ahead a customer must order.",
    min: 0,
    max: 10_080,
  },
  {
    name: "max_pickup_days_ahead",
    label: "Booking horizon (days)",
    hint: "How far ahead pickup slots are offered.",
    min: 1,
    max: 90,
  },
  {
    name: "pending_payment_ttl_minutes",
    label: "Checkout expiry (minutes)",
    hint: "Stripe's floor is 30. Abandoned checkouts return their stock after this.",
    min: 5,
    max: 1440,
  },
  {
    name: "customer_cancel_cutoff_minutes",
    label: "Cancel cutoff (minutes)",
    hint: "How close to pickup a customer may still cancel an accepted order.",
    min: 0,
    max: 10_080,
  },
  {
    name: "max_open_checkouts",
    label: "Concurrent checkouts per customer",
    hint: "Unfinished checkouts hold stock, so this caps how many one person can hold.",
    min: 1,
    max: 50,
  },
];

export function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    updatePlatformSettings,
    {},
  );

  return (
    <form action={formAction}>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.ok ? <p role="status">{state.ok}</p> : null}

      <fieldset disabled={pending}>
        {FIELDS.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              name={field.name}
              type="number"
              min={field.min}
              max={field.max}
              defaultValue={String(settings[field.name])}
              required
            />
            <p>{field.hint}</p>
          </div>
        ))}

        <button type="submit">{pending ? "Saving…" : "Save settings"}</button>
      </fieldset>
    </form>
  );
}
