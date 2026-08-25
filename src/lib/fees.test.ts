import { describe, expect, it } from "vitest";

import { applyBps, quoteFees, type FeeSettings } from "@/lib/fees";

/**
 * The arithmetic in here is duplicated in SQL, inside `create_order()`. These
 * tests pin the TypeScript copy; `supabase/tests/03_fees.sql` pins the SQL one
 * against the same numbers, which is what keeps the quote a customer is shown
 * equal to the amount they are charged.
 */

const SETTINGS: FeeSettings = {
  platformFeeBps: 1200, // 12%
  serviceFeeBps: 500, // 5%
  serviceFeeMinCents: 99,
  serviceFeeMaxCents: 500,
};

describe("applyBps", () => {
  it("takes basis points of an amount", () => {
    expect(applyBps(10_000, 1200)).toBe(1200);
    expect(applyBps(2_500, 500)).toBe(125);
  });

  it("rounds half away from zero, matching Postgres round()", () => {
    // 1050 * 5% = 52.5 -> 53, not 52. JavaScript's Math.round and Postgres's
    // round() agree here; a banker's-rounding implementation would not.
    expect(applyBps(1_050, 500)).toBe(53);
    expect(applyBps(1_250, 100)).toBe(13);
  });

  it("handles the zero cases", () => {
    expect(applyBps(0, 1200)).toBe(0);
    expect(applyBps(5_000, 0)).toBe(0);
  });
});

describe("quoteFees", () => {
  it("charges a percentage service fee between the floor and the cap", () => {
    const quote = quoteFees(4_000, SETTINGS, false);

    expect(quote.serviceFeeCents).toBe(200); // 5% of $40
    expect(quote.totalCents).toBe(4_200);
  });

  it("lifts a small service fee to the floor", () => {
    // 5% of $8 is 40c, below the 99c floor.
    expect(quoteFees(800, SETTINGS, false).serviceFeeCents).toBe(99);
  });

  it("caps a large service fee", () => {
    // 5% of $200 is $10, above the $5 cap.
    expect(quoteFees(20_000, SETTINGS, false).serviceFeeCents).toBe(500);
  });

  it("waives the service fee for Plus members", () => {
    const free = quoteFees(4_000, SETTINGS, false);
    const plus = quoteFees(4_000, SETTINGS, true);

    expect(plus.serviceFeeCents).toBe(0);
    expect(plus.totalCents).toBe(4_000);
    // The waiver is the customer's benefit only — the cook is paid the same.
    expect(plus.vendorPayoutCents).toBe(free.vendorPayoutCents);
  });

  it("charges nothing at all on an empty basket", () => {
    const quote = quoteFees(0, SETTINGS, false);

    // The floor must not conjure a 99c fee out of an empty basket.
    expect(quote.serviceFeeCents).toBe(0);
    expect(quote.totalCents).toBe(0);
  });

  it("splits the money so nothing is lost or invented", () => {
    const quote = quoteFees(4_000, SETTINGS, false);

    expect(quote.platformFeeCents).toBe(480); // 12% of $40
    expect(quote.vendorPayoutCents).toBe(3_520);
    // What Stripe holds back plus what the cook receives is the whole charge.
    expect(quote.applicationFeeCents + quote.vendorPayoutCents).toBe(quote.totalCents);
  });

  it("keeps the platform fee out of the customer's total", () => {
    const quote = quoteFees(4_000, SETTINGS, false);

    // The commission comes out of the cook's side, not added to the bill.
    expect(quote.totalCents).toBe(quote.subtotalCents + quote.serviceFeeCents);
  });

  it("normalises a nonsense subtotal instead of producing negative money", () => {
    const quote = quoteFees(-500, SETTINGS, false);

    expect(quote.subtotalCents).toBe(0);
    expect(quote.totalCents).toBe(0);
    expect(quote.vendorPayoutCents).toBe(0);
  });

  it("never pays out more than the food was worth", () => {
    for (const subtotal of [1, 99, 100, 999, 1_000, 12_345, 100_000]) {
      const quote = quoteFees(subtotal, SETTINGS, false);
      expect(quote.vendorPayoutCents).toBeLessThanOrEqual(quote.subtotalCents);
      expect(quote.vendorPayoutCents).toBeGreaterThanOrEqual(0);
    }
  });
});
