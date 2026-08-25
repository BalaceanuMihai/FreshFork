import { describe, expect, it } from "vitest";

import { parseMoneyToCents } from "@/lib/money";

/**
 * Written after the original strip-then-parseFloat version was caught turning
 * "-5" into a positive $5. Every case below that returns null used to return a
 * confident, wrong number.
 */
describe("parseMoneyToCents", () => {
  it("reads plain and decimal amounts", () => {
    expect(parseMoneyToCents("16")).toBe(1600);
    expect(parseMoneyToCents("16.50")).toBe(1650);
    expect(parseMoneyToCents("0.99")).toBe(99);
    expect(parseMoneyToCents("16.5")).toBe(1650);
  });

  it("tolerates the decorations people type", () => {
    expect(parseMoneyToCents("$16.50")).toBe(1650);
    expect(parseMoneyToCents("£16.50")).toBe(1650);
    expect(parseMoneyToCents("€16.50")).toBe(1650);
    expect(parseMoneyToCents(" 1,250.00 ")).toBe(125_000);
  });

  it("rejects negatives instead of silently flipping the sign", () => {
    expect(parseMoneyToCents("-5")).toBeNull();
    expect(parseMoneyToCents("-16.50")).toBeNull();
    expect(parseMoneyToCents("−5")).toBeNull(); // unicode minus
  });

  it("rejects malformed decimals rather than reading a prefix", () => {
    expect(parseMoneyToCents("1.2.3")).toBeNull();
    expect(parseMoneyToCents("16.")).toBeNull();
    expect(parseMoneyToCents(".50")).toBeNull();
  });

  it("rejects sub-cent precision", () => {
    // Accepting it would mean rounding somebody's money without telling them.
    expect(parseMoneyToCents("16.999")).toBeNull();
  });

  it("rejects text, blanks and scientific notation", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("free")).toBeNull();
    expect(parseMoneyToCents("1e3")).toBeNull();
    expect(parseMoneyToCents("NaN")).toBeNull();
    expect(parseMoneyToCents("Infinity")).toBeNull();
  });

  it("computes cents without floating-point drift", () => {
    // 0.29 * 100 is 28.999999999999996 in binary floating point.
    expect(parseMoneyToCents("0.29")).toBe(29);
    expect(parseMoneyToCents("1.10")).toBe(110);
    expect(parseMoneyToCents("70.07")).toBe(7007);
  });

  it("refuses an amount too large to be a safe integer", () => {
    expect(parseMoneyToCents("999999999999999999")).toBeNull();
  });
});
