"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AddressAutocomplete,
  type GeocodeSelection,
} from "@/components/geocode/AddressAutocomplete";

/**
 * The location pill in the nav. Selecting an address writes lat/lng/loc into
 * the browse URL — customer location lives in the URL, not the database, so a
 * filtered search stays shareable.
 */
export function LocationBar({
  label,
  mapboxReady,
}: {
  label: string | null;
  mapboxReady: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  function go(result: GeocodeSelection | null) {
    if (!result) return;
    const params = new URLSearchParams({
      lat: String(result.lat),
      lng: String(result.lng),
      loc: result.label || result.addressLine,
    });
    setEditing(false);
    router.push(`/browse?${params.toString()}`);
  }

  if (!mapboxReady) {
    return (
      <span
        title="Address search needs a Mapbox token"
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-50"
      >
        Set your location
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-forest px-3 py-1.5 text-xs font-medium text-forest"
      >
        {label ?? "Set your location"} ⌄
      </button>
    );
  }

  return (
    <div className="w-[280px]">
      <AddressAutocomplete
        autoFocus
        placeholder="Your address…"
        defaultValue={label ?? ""}
        onSelect={go}
      />
    </div>
  );
}
