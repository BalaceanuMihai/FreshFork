import "server-only";

import { publicEnv } from "@/lib/env";

export type GeocodeResult = {
  /** Full display string, e.g. "215 DeKalb Ave, Brooklyn, New York 11205". */
  label: string;
  /** Short form for the address line, e.g. "215 DeKalb Ave". */
  addressLine: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  /** ISO 3166-1 alpha-2, e.g. "DE". Feeds `currencyForCountry` and the Stripe Connect account country. */
  countryCode: string | null;
  lat: number;
  lng: number;
};

type MapboxContext = {
  [key: string]: ({ name?: string; country_code?: string } | undefined);
};

type MapboxFeature = {
  properties?: {
    full_address?: string;
    place_formatted?: string;
    name?: string;
    coordinates?: { latitude?: number; longitude?: number };
    context?: MapboxContext;
  };
};

/**
 * Forward-geocode a free-text address via Mapbox Geocoding v6.
 *
 * Called only from the server (the `/api/geocode` route), so validation and
 * any future rate-limiting live in one place and the token is not tied to a
 * per-component fetch. Returns an empty list rather than throwing when the
 * token is unset, so the UI can show "search unavailable" inline.
 */
export async function forwardGeocode(
  query: string,
  sessionToken?: string,
): Promise<GeocodeResult[]> {
  const token = publicEnv.mapboxToken;
  if (!token || query.trim().length < 3) return [];

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "5");
  url.searchParams.set("types", "address,street,place,postcode,neighborhood");
  // Scoped to Europe (west of Iceland to the Urals, Crete/Cyprus up to
  // Svalbard) rather than a country allow-list — cheaper to maintain than
  // enumerating ~45 ISO country codes and doesn't need updating as the app
  // expands to new European markets.
  url.searchParams.set("bbox", "-25,34,45,71");
  if (sessionToken) url.searchParams.set("session_token", sessionToken);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];

  const body = (await response.json()) as { features?: MapboxFeature[] };

  return (body.features ?? []).flatMap((feature) => {
    const props = feature.properties;
    const lat = props?.coordinates?.latitude;
    const lng = props?.coordinates?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return [];

    const context = props?.context ?? {};

    return [
      {
        label: props?.full_address ?? props?.name ?? "",
        addressLine: props?.name ?? props?.full_address ?? "",
        city: context.place?.name ?? null,
        state: context.region?.name ?? null,
        postalCode: context.postcode?.name ?? null,
        countryCode: context.country?.country_code?.toUpperCase() ?? null,
        lat,
        lng,
      },
    ];
  });
}
