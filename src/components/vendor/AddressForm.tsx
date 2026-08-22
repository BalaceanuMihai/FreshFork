"use client";

import { useActionState, useState } from "react";

import { saveAddress, type VendorFormState } from "@/lib/actions/vendor-onboarding";
import { Field, FormError, SubmitButton } from "@/components/ui/Form";
import {
  AddressAutocomplete,
  type GeocodeSelection,
} from "@/components/geocode/AddressAutocomplete";
import type { Vendor } from "@/lib/supabase/database.types";

export function AddressForm({
  vendor,
  mapboxReady,
}: {
  vendor: Vendor | null;
  mapboxReady: boolean;
}) {
  const [state, formAction] = useActionState<VendorFormState, FormData>(saveAddress, {});
  const [selection, setSelection] = useState<GeocodeSelection | null>(null);

  // An already-saved address counts as valid until the vendor edits it.
  const hasSavedAddress = Boolean(vendor?.pickup_address_line);
  const canSubmit = selection !== null || hasSavedAddress;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field
        label="Pickup address"
        hint="Pick a suggestion so we can place you on the map. Customers see the street, never your unit."
      >
        {mapboxReady ? (
          <AddressAutocomplete
            defaultValue={vendor?.pickup_address_line ?? ""}
            onSelect={setSelection}
          />
        ) : (
          <p className="rounded-xl border border-line bg-buttermilk px-4 py-3 text-sm text-ink-70">
            Address search is unavailable — a Mapbox token has not been configured
            yet. Add <code className="font-mono text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
            to <code className="font-mono text-xs">.env.local</code> to enable it.
          </p>
        )}
      </Field>

      <input
        type="hidden"
        name="pickup_address_line"
        value={selection?.addressLine ?? vendor?.pickup_address_line ?? ""}
      />
      <input
        type="hidden"
        name="pickup_city"
        value={selection?.city ?? vendor?.pickup_city ?? ""}
      />
      <input
        type="hidden"
        name="pickup_state"
        value={selection?.state ?? vendor?.pickup_state ?? ""}
      />
      <input
        type="hidden"
        name="pickup_postal_code"
        value={selection?.postalCode ?? vendor?.pickup_postal_code ?? ""}
      />
      <input type="hidden" name="lat" value={selection?.lat ?? ""} />
      <input type="hidden" name="lng" value={selection?.lng ?? ""} />

      {selection ? (
        <p className="rounded-xl border border-sage bg-sage/15 px-4 py-3 text-sm text-forest">
          Mapped to <span className="font-medium">{selection.label}</span>
        </p>
      ) : hasSavedAddress ? (
        <p className="text-sm text-ink-50">
          Saved: {vendor?.pickup_address_line}
          {vendor?.pickup_city ? `, ${vendor.pickup_city}` : ""}. Search again to
          change it.
        </p>
      ) : null}

      {state.error ? <FormError message={state.error} /> : null}

      <div className="flex justify-end">
        <SubmitButton
          label="Continue"
          pendingLabel="Saving…"
          disabled={!canSubmit || !mapboxReady}
        />
      </div>
    </form>
  );
}
