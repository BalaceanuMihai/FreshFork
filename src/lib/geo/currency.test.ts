import { describe, expect, it } from "vitest";

import { currencyForCountry, DEFAULT_CURRENCY } from "@/lib/geo/currency";

/**
 * Written after discovering `saveAddress()` derived `vendors.timezone` from
 * the geocoded coordinate but never derived `currency` from anything — every
 * vendor onboarding through the UI got the column default (`eur`) regardless
 * of country, and `startStripeOnboarding()` never passed a `country` to
 * Stripe either, so every Connect Express account silently inherited the
 * *platform* account's country instead of the vendor's own.
 */
describe("currencyForCountry", () => {
  it("resolves the eurozone", () => {
    expect(currencyForCountry("DE")).toBe("eur");
    expect(currencyForCountry("FR")).toBe("eur");
    expect(currencyForCountry("IE")).toBe("eur");
  });

  it("resolves the non-euro European markets this app actually seeds", () => {
    expect(currencyForCountry("GB")).toBe("gbp");
    expect(currencyForCountry("SE")).toBe("sek");
    expect(currencyForCountry("PL")).toBe("pln");
    expect(currencyForCountry("RO")).toBe("ron");
  });

  it("is case-insensitive", () => {
    expect(currencyForCountry("de")).toBe("eur");
    expect(currencyForCountry("gb")).toBe("gbp");
  });

  it("falls back rather than throwing on a missing or unknown country", () => {
    // Onboarding must not dead-end on an address Mapbox couldn't attach a
    // country to — the same reasoning as timezoneForCoordinates' fallback.
    expect(currencyForCountry(null)).toBe(DEFAULT_CURRENCY);
    expect(currencyForCountry(undefined)).toBe(DEFAULT_CURRENCY);
    expect(currencyForCountry("")).toBe(DEFAULT_CURRENCY);
    expect(currencyForCountry("XX")).toBe(DEFAULT_CURRENCY);
  });

  it("returns something the vendors.currency check constraint accepts", () => {
    // currency ~ '^[a-z]{3}$'
    for (const code of ["DE", "GB", "SE", "PL", "RO", "XX"]) {
      expect(currencyForCountry(code)).toMatch(/^[a-z]{3}$/);
    }
  });
});
