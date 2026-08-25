import { describe, expect, it } from "vitest";

import {
  DEFAULT_TIMEZONE,
  isValidTimezone,
  timezoneForCoordinates,
} from "@/lib/geo/timezone";

/**
 * Written after discovering every seeded vendor sat in Brooklyn while the
 * column said `Europe/London` — a five-hour error on every pickup time, which
 * nothing in the system would have complained about.
 */
describe("timezoneForCoordinates", () => {
  it("resolves the seeded vendors' actual city", () => {
    // Brooklyn, where all eight live vendors are.
    expect(timezoneForCoordinates(40.6899, -73.9738)).toBe("America/New_York");
    expect(timezoneForCoordinates(40.725, -73.95)).toBe("America/New_York");
  });

  it("resolves zones across the map", () => {
    expect(timezoneForCoordinates(51.5072, -0.1276)).toBe("Europe/London");
    expect(timezoneForCoordinates(44.4268, 26.1025)).toBe("Europe/Bucharest");
    expect(timezoneForCoordinates(-33.8688, 151.2093)).toBe("Australia/Sydney");
  });

  it("handles a half-hour offset zone", () => {
    // Whole-hour arithmetic would quietly break these.
    expect(timezoneForCoordinates(22.5726, 88.3639)).toBe("Asia/Kolkata");
  });

  it("distinguishes neighbours that share a border", () => {
    // Same country, different zones — the case a longitude-based
    // approximation gets wrong.
    expect(timezoneForCoordinates(40.7128, -74.006)).toBe("America/New_York");
    expect(timezoneForCoordinates(34.0522, -118.2437)).toBe("America/Los_Angeles");
  });

  it("falls back rather than throwing on a missing coordinate", () => {
    // Onboarding must not dead-end: a vendor who cannot finish the address
    // step is lost, whereas a wrong zone can be corrected.
    expect(timezoneForCoordinates(null, null)).toBe(DEFAULT_TIMEZONE);
    expect(timezoneForCoordinates(undefined, undefined)).toBe(DEFAULT_TIMEZONE);
  });

  it("falls back on out-of-range and non-finite input", () => {
    expect(timezoneForCoordinates(91, 0)).toBe(DEFAULT_TIMEZONE);
    expect(timezoneForCoordinates(0, 181)).toBe(DEFAULT_TIMEZONE);
    expect(timezoneForCoordinates(Number.NaN, 0)).toBe(DEFAULT_TIMEZONE);
    expect(timezoneForCoordinates(Number.POSITIVE_INFINITY, 0)).toBe(DEFAULT_TIMEZONE);
  });

  it("returns something Postgres and Intl will both accept", () => {
    for (const [lat, lng] of [
      [40.6899, -73.9738],
      [51.5072, -0.1276],
      [-33.8688, 151.2093],
      [64.1466, -21.9426],
      [0, 0],
    ] as const) {
      expect(isValidTimezone(timezoneForCoordinates(lat, lng))).toBe(true);
    }
  });

  it("defaults to a neutral zone, not a plausible-looking city", () => {
    // The original default was Europe/London, which read as correct and was
    // not. UTC is wrong in an obvious way instead of a subtle one.
    expect(DEFAULT_TIMEZONE).toBe("UTC");
  });
});

describe("isValidTimezone", () => {
  it("accepts real IANA names", () => {
    expect(isValidTimezone("Europe/Bucharest")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
  });

  it("rejects nonsense, blanks and offsets", () => {
    expect(isValidTimezone("Middle/Earth")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone("GMT+2")).toBe(false);
  });
});
