import { describe, expect, it } from "vitest";

import { formatPrice, formatDistance, formatTime, milesToMetres } from "@/lib/format";

/**
 * FreshFork sells across Europe, so "money" is not one currency. A kitchen in
 * Warsaw prices in złoty and one in Stockholm in kronor; rendering either as
 * euros produces a number that is both wrong and completely believable.
 */
describe("formatPrice", () => {
  it("defaults to euro", () => {
    expect(formatPrice(1600)).toBe("€16");
    expect(formatPrice(1650)).toBe("€16.50");
  });

  it("renders each currency in its own symbol", () => {
    expect(formatPrice(1600, "gbp")).toBe("£16");
    expect(formatPrice(1600, "eur")).toBe("€16");
    // Non-symbol currencies fall back to their code, which is correct.
    expect(formatPrice(16500, "sek")).toMatch(/SEK|kr/);
    expect(formatPrice(1600, "pln")).toMatch(/PLN|zł/);
    expect(formatPrice(1600, "ron")).toMatch(/RON|lei/);
  });

  it("accepts the lowercase codes the database stores", () => {
    // vendors.currency is lowercase, as Stripe expects it.
    expect(formatPrice(1600, "gbp")).toBe(formatPrice(1600, "GBP"));
  });

  it("drops the decimals on whole amounts", () => {
    // Menu prices are usually round, and ".00" everywhere is noise.
    expect(formatPrice(1200)).toBe("€12");
    expect(formatPrice(1200, "gbp")).toBe("£12");
  });

  it("keeps both decimals on part amounts", () => {
    expect(formatPrice(1205)).toBe("€12.05");
    expect(formatPrice(99)).toBe("€0.99");
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("€0");
  });

  it("does not blank out a price for an unknown currency code", () => {
    // Better a plain number with a code than an empty span where a price
    // should be.
    const result = formatPrice(1600, "zzz");
    expect(result).toContain("16");
    expect(result).toContain("ZZZ");
  });
});

describe("formatDistance", () => {
  it("gives one decimal under ten miles and rounds above", () => {
    expect(formatDistance(1609.344)).toBe("1.0 mi");
    expect(formatDistance(4828)).toBe("3.0 mi");
    expect(formatDistance(32186.9)).toBe("20 mi");
  });
});

describe("milesToMetres", () => {
  it("round-trips against formatDistance", () => {
    expect(formatDistance(milesToMetres(2.5))).toBe("2.5 mi");
  });
});

describe("formatTime", () => {
  it("drops :00 and uses am/pm", () => {
    expect(formatTime("18:00:00")).toBe("6 pm");
    expect(formatTime("11:30:00")).toBe("11:30 am");
  });

  it("handles midnight and noon", () => {
    expect(formatTime("00:00:00")).toBe("12 am");
    expect(formatTime("12:00:00")).toBe("12 pm");
  });
});
