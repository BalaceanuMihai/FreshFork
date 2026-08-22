"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AddressAutocomplete,
  type GeocodeSelection,
} from "@/components/geocode/AddressAutocomplete";

/** Hero address box. Geocodes, then hands off to /browse with the coordinates. */
export function HeroSearch({ mapboxReady }: { mapboxReady: boolean }) {
  const router = useRouter();
  const [selection, setSelection] = useState<GeocodeSelection | null>(null);

  function findCooks() {
    if (!selection) return;
    const params = new URLSearchParams({
      lat: String(selection.lat),
      lng: String(selection.lng),
      loc: selection.label || selection.addressLine,
    });
    router.push(`/browse?${params.toString()}`);
  }

  if (!mapboxReady) {
    return (
      <div className="flex flex-col gap-3 self-start">
        <a
          href="/browse"
          className="inline-flex self-start rounded-full bg-forest px-7 py-3.5 text-sm font-semibold text-buttermilk"
        >
          Find cooks
        </a>
        <span className="text-xs text-ink-50">
          Address search needs a Mapbox token — browsing still works.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 self-start rounded-full border border-line bg-card p-1.5">
      <div className="w-[380px] px-3">
        <AddressAutocomplete
          placeholder="215 DeKalb Ave, Brooklyn"
          onSelect={setSelection}
        />
      </div>
      <button
        type="button"
        onClick={findCooks}
        disabled={!selection}
        className="shrink-0 rounded-full bg-forest px-7 py-3.5 text-sm font-semibold text-buttermilk disabled:opacity-50"
      >
        Find cooks
      </button>
    </div>
  );
}
