"use client";

import { useActionState } from "react";

import { saveAddress } from "@/lib/actions/vendor-onboarding";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/lib/supabase/database.types";

export function AddressStepForm({ vendor }: { vendor: Vendor | null }) {
  const [state, formAction, pending] = useActionState(saveAddress, {});

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Customers see the street and city you pick here — never your exact unit.
      </p>

      <AddressAutocomplete
        defaultAddressLine={vendor?.pickup_address_line ?? undefined}
        defaultCity={vendor?.pickup_city ?? undefined}
        defaultState={vendor?.pickup_state ?? undefined}
        defaultPostalCode={vendor?.pickup_postal_code ?? undefined}
      />

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
