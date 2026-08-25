import tzlookup from "tz-lookup";

/**
 * Which timezone is this pickup address in?
 *
 * `pickup_windows` stores a weekly rhythm ("Sundays, 18:00–20:00"), and
 * `create_order()` resolves that into a real instant with
 * `(date + start_time) at time zone vendors.timezone`. Get the zone wrong and
 * every order for that kitchen is booked at the wrong moment — an hour out
 * across a DST boundary, or hours out for a vendor in another country.
 *
 * Done offline rather than through an API, deliberately:
 *
 *   - **No failure mode.** Address entry already depends on Mapbox; adding a
 *     second network call means onboarding can half-succeed, leaving a vendor
 *     with an address but no zone.
 *   - **No key, no quota, no bill.** The alternatives (Google Time Zone,
 *     GeoNames) all want one or more of those.
 *   - **It's small.** ~150 KB of lookup table, versus ~73 MB for the
 *     shapefile-accurate `geo-tz`. Server-side only, so it never reaches the
 *     browser bundle either way.
 *
 * The tradeoff is precision within a few kilometres of a timezone border. For
 * deciding when a home cook hands over a curry, that is not a real risk — and
 * the vendor can be given a manual override if it ever becomes one.
 */

/**
 * Used when a coordinate is missing or nonsensical, and matches the column
 * default in Postgres.
 *
 * UTC rather than a real city: a wrong-but-plausible zone is worse than an
 * obviously neutral one. `Europe/London` was the original default and it
 * silently mis-scheduled every Brooklyn vendor by five hours.
 */
export const DEFAULT_TIMEZONE = "UTC";

/**
 * True if this runtime recognises the zone.
 *
 * Guards against the lookup table and the platform's tzdata disagreeing —
 * `Intl` throws `RangeError` on a name it does not know, and a zone that
 * Node rejects would very likely be rejected by Postgres too.
 */
export function isValidTimezone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a coordinate to an IANA zone, falling back rather than throwing.
 *
 * Onboarding must not dead-end because a coordinate looked odd: a vendor with
 * a slightly wrong timezone can still be corrected, but a vendor who cannot
 * finish the address step is simply lost.
 */
export function timezoneForCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return DEFAULT_TIMEZONE;
  }

  try {
    const zone = tzlookup(latitude, longitude);
    return isValidTimezone(zone) ? zone : DEFAULT_TIMEZONE;
  } catch {
    // tz-lookup throws "invalid coordinates" rather than returning null.
    return DEFAULT_TIMEZONE;
  }
}
