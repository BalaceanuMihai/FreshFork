/**
 * Which currency does a kitchen in this country price in?
 *
 * `vendors.currency` is copied onto every order at checkout and frozen there
 * — see `phase6_create_order_uses_vendor_currency` — so it has to be right
 * from the moment a vendor sets their pickup address, the same way
 * `timezoneForCoordinates` resolves `vendors.timezone`. Nothing upstream of
 * this used to set it outside of seed data: a vendor onboarding through the
 * UI always got the column default (`eur`), correct only by coincidence for
 * anyone outside the eurozone.
 *
 * ISO 4217, lowercase, matching the `currency ~ '^[a-z]{3}$'` column check.
 * Scoped to the countries `forwardGeocode`'s bounding box can actually
 * return (Iceland to the Urals) rather than the whole ISO 3166 list.
 */

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  // Eurozone
  AD: "eur",
  AT: "eur",
  BE: "eur",
  CY: "eur",
  DE: "eur",
  EE: "eur",
  ES: "eur",
  FI: "eur",
  FR: "eur",
  GR: "eur",
  HR: "eur",
  IE: "eur",
  IT: "eur",
  LT: "eur",
  LU: "eur",
  LV: "eur",
  MC: "eur",
  MT: "eur",
  NL: "eur",
  PT: "eur",
  SI: "eur",
  SK: "eur",
  SM: "eur",
  VA: "eur",
  // Non-euro Europe
  BG: "bgn",
  CH: "chf",
  CZ: "czk",
  DK: "dkk",
  GB: "gbp",
  HU: "huf",
  IS: "isk",
  NO: "nok",
  PL: "pln",
  RO: "ron",
  SE: "sek",
};

/** Column default — also the fallback for a country this map doesn't know. */
export const DEFAULT_CURRENCY = "eur";

/**
 * Resolve an ISO 3166-1 alpha-2 country to the currency a kitchen there
 * prices in, falling back rather than throwing — the same "must not dead-end
 * onboarding" reasoning as `timezoneForCoordinates`.
 */
export function currencyForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return DEFAULT_CURRENCY;
  return CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] ?? DEFAULT_CURRENCY;
}
