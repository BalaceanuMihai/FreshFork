"use client";

import { useActionState } from "react";

import { saveAddress } from "@/lib/actions/vendor-onboarding";
import type { Vendor } from "@/lib/supabase/database.types";

export function AddressStepForm({ vendor }: { vendor: Vendor | null }) {
  const [state, formAction] = useActionState(saveAddress, {});

  return (
    <form action={formAction}>
      <p>Enter the pickup address manually — customers see the street, never your unit.</p>
      <label>
        Address line
        <input name="pickup_address_line" defaultValue={vendor?.pickup_address_line ?? ""} required />
      </label>
      <label>
        City
        <input name="pickup_city" defaultValue={vendor?.pickup_city ?? ""} required />
      </label>
      <label>
        State
        <input name="pickup_state" defaultValue={vendor?.pickup_state ?? ""} required />
      </label>
      <label>
        Postal code
        <input name="pickup_postal_code" defaultValue={vendor?.pickup_postal_code ?? ""} required />
      </label>
      <label>
        Latitude
        <input type="number" step="any" name="lat" required />
      </label>
      <label>
        Longitude
        <input type="number" step="any" name="lng" required />
      </label>

      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit">Continue</button>
    </form>
  );
}
