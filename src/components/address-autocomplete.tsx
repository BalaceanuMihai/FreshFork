"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type GeocodeResult = {
  label: string;
  addressLine: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string | null;
  lat: number;
  lng: number;
};

/**
 * Address search backed by the existing `/api/geocode` proxy.
 *
 * Picking a suggestion fills the real form fields the server action expects
 * (`pickup_address_line`, `pickup_city`, `pickup_state`, `pickup_postal_code`,
 * `lat`, `lng`) — this is a UX layer over data the backend already validates,
 * not a new source of truth.
 */
export function AddressAutocomplete({
  defaultAddressLine,
  defaultCity,
  defaultState,
  defaultPostalCode,
}: {
  defaultAddressLine?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultPostalCode?: string;
}) {
  const initialLabel = [defaultAddressLine, defaultCity].filter(Boolean).join(", ");
  const [query, setQuery] = useState(initialLabel);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<GeocodeResult | null>(null);
  const sessionToken = useRef(crypto.randomUUID());

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 3 || (chosen && chosen.label === query)) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(query)}&session_token=${sessionToken.current}`,
        );
        const body = (await res.json()) as { results: GeocodeResult[]; error?: string };
        setResults(body.results);
        setError(body.error ?? null);
        setOpen(true);
      } catch {
        setError("Address search is unavailable right now.");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, chosen]);

  function pick(result: GeocodeResult) {
    setChosen(result);
    setQuery(result.label);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <Field label="Address" hint={error ?? "Start typing and choose your address from the list."}>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setChosen(null);
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Street, city…"
            className="pl-9"
            autoComplete="off"
          />
          {open && results.length > 0 ? (
            <ul className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-md overflow-hidden">
              {results.map((result) => (
                <li key={`${result.lat}-${result.lng}`}>
                  <button
                    type="button"
                    onClick={() => pick(result)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors",
                    )}
                  >
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Field>

      <input type="hidden" name="pickup_address_line" value={chosen?.addressLine ?? defaultAddressLine ?? ""} />
      <input type="hidden" name="pickup_city" value={chosen?.city ?? defaultCity ?? ""} />
      <input type="hidden" name="pickup_state" value={chosen?.state ?? defaultState ?? ""} />
      <input type="hidden" name="pickup_postal_code" value={chosen?.postalCode ?? defaultPostalCode ?? ""} />
      <input type="hidden" name="country_code" value={chosen?.countryCode ?? ""} />
      <input type="hidden" name="lat" value={chosen?.lat ?? ""} />
      <input type="hidden" name="lng" value={chosen?.lng ?? ""} />

      {chosen ? (
        <p className="text-xs text-green-700 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {chosen.city ?? "Mapped"}
          {chosen.state ? `, ${chosen.state}` : ""} {chosen.postalCode ?? ""}
        </p>
      ) : null}
    </div>
  );
}
