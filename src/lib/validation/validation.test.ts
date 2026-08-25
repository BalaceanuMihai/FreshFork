import { describe, expect, it } from "vitest";

import { menuItemSchema } from "@/lib/validation/menu";
import { slugify } from "@/lib/validation/vendor";
import { checkoutSchema, refundOrderSchema } from "@/lib/validation/order";
import { submitReviewSchema } from "@/lib/validation/community";

/**
 * The parsers that turn a form post into typed data. Money and handles get the
 * most attention here — both are places where a quiet coercion bug produces a
 * wrong number rather than an error.
 */

describe("menuItemSchema price parsing", () => {
  const parse = (price: string) =>
    menuItemSchema.safeParse({
      name: "Jollof rice",
      price_cents: price,
      allergens: [],
      dietary_tags: [],
    });

  it("reads plain, decimal and prefixed prices as cents", () => {
    expect(parse("16").success && parse("16").data?.price_cents).toBe(1600);
    expect(parse("16.50").success && parse("16.50").data?.price_cents).toBe(1650);
    expect(parse("$16.50").success && parse("$16.50").data?.price_cents).toBe(1650);
  });

  it("rejects sub-cent precision rather than rounding it away", () => {
    // Silently turning 16.999 into $17.00 would list the dish at a price the
    // cook did not type. Better to ask them what they meant.
    expect(parse("16.999").success).toBe(false);
  });

  it("rejects a free dish, a negative price, and gibberish", () => {
    expect(parse("").success).toBe(false);
    expect(parse("-5").success).toBe(false);
    expect(parse("free").success).toBe(false);
  });

  it("rejects an implausibly large price", () => {
    expect(parse("2000").success).toBe(false);
  });

  it("refuses an allergen that is not in the vocabulary", () => {
    const result = menuItemSchema.safeParse({
      name: "Jollof rice",
      price_cents: "16",
      allergens: ["moon-dust"],
      dietary_tags: [],
    });
    // Allergens are a safety field; an unrecognised value must fail loudly
    // rather than be stored and rendered as if it meant something.
    expect(result.success).toBe(false);
  });
});

describe("slugify", () => {
  it("makes a readable, url-safe handle", () => {
    expect(slugify("Auntie Bee's Kitchen")).toBe("auntie-bee-s-kitchen");
  });

  it("strips accents rather than dropping the letters", () => {
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("never leaves leading or trailing separators", () => {
    expect(slugify("!!! Hot Pot !!!")).toBe("hot-pot");
  });

  it("returns empty for input with nothing usable, so the caller can fall back", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("bounds the length", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(48);
  });
});

describe("checkoutSchema", () => {
  it("accepts a uuid window and an ISO date", () => {
    const result = checkoutSchema.safeParse({
      pickup_window_id: "0f1d4d3a-4a0e-4f0e-9b0a-2a5b6c7d8e9f",
      pickup_date: "2026-09-01",
      note: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a date that is not a date", () => {
    expect(
      checkoutSchema.safeParse({
        pickup_window_id: "0f1d4d3a-4a0e-4f0e-9b0a-2a5b6c7d8e9f",
        pickup_date: "2026-13-45",
      }).success,
    ).toBe(false);
  });

  it("rejects a non-uuid window id", () => {
    expect(
      checkoutSchema.safeParse({
        pickup_window_id: "tomorrow-please",
        pickup_date: "2026-09-01",
      }).success,
    ).toBe(false);
  });
});

describe("refundOrderSchema", () => {
  const order = "0f1d4d3a-4a0e-4f0e-9b0a-2a5b6c7d8e9f";

  it("reads a blank amount as a full refund", () => {
    const result = refundOrderSchema.safeParse({ order_id: order, amount: "" });
    expect(result.success && result.data.amount).toBeNull();
  });

  it("reads a partial amount as cents", () => {
    const result = refundOrderSchema.safeParse({ order_id: order, amount: "12.50" });
    expect(result.success && result.data.amount).toBe(1250);
  });

  it("rejects a zero or negative refund", () => {
    expect(refundOrderSchema.safeParse({ order_id: order, amount: "0" }).success).toBe(
      false,
    );
    expect(refundOrderSchema.safeParse({ order_id: order, amount: "-5" }).success).toBe(
      false,
    );
  });
});

describe("submitReviewSchema", () => {
  const order = "0f1d4d3a-4a0e-4f0e-9b0a-2a5b6c7d8e9f";

  it("accepts ratings 1 through 5", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(submitReviewSchema.safeParse({ order_id: order, rating }).success).toBe(
        true,
      );
    }
  });

  it("rejects ratings outside the scale", () => {
    expect(submitReviewSchema.safeParse({ order_id: order, rating: 0 }).success).toBe(
      false,
    );
    expect(submitReviewSchema.safeParse({ order_id: order, rating: 6 }).success).toBe(
      false,
    );
  });
});
