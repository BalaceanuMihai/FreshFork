import { describe, expect, it } from "vitest";

import { membershipStatusFor, planForStatus } from "@/lib/stripe/membership-status";
import { connectStatusFor } from "@/lib/stripe/connect";
import type Stripe from "stripe";

/**
 * These two mappings decide whether somebody keeps a paid benefit and whether
 * a kitchen is allowed to take money. Both are pure, both are one `switch`
 * away from a costly mistake, and neither had a test.
 */

describe("membershipStatusFor", () => {
  it("maps the healthy statuses through unchanged", () => {
    expect(membershipStatusFor("active")).toBe("active");
    expect(membershipStatusFor("trialing")).toBe("trialing");
  });

  it("keeps failing payments distinguishable from cancellation", () => {
    expect(membershipStatusFor("past_due")).toBe("past_due");
    expect(membershipStatusFor("unpaid")).toBe("unpaid");
    expect(membershipStatusFor("incomplete")).toBe("incomplete");
  });

  it("collapses every terminal status onto canceled", () => {
    expect(membershipStatusFor("canceled")).toBe("canceled");
    expect(membershipStatusFor("incomplete_expired")).toBe("canceled");
    expect(membershipStatusFor("paused")).toBe("canceled");
  });
});

describe("planForStatus", () => {
  it("grants Plus while the subscription is healthy", () => {
    expect(planForStatus("active")).toBe("plus");
    expect(planForStatus("trialing")).toBe("plus");
  });

  it("keeps Plus through a failed payment", () => {
    // A declined card should not yank benefits away mid-cycle. The grace is
    // bounded by the my_membership view, not here.
    expect(planForStatus("past_due")).toBe("plus");
  });

  it("drops Plus once the subscription is over", () => {
    expect(planForStatus("canceled")).toBe("free");
    expect(planForStatus("unpaid")).toBe("free");
    expect(planForStatus("incomplete")).toBe("free");
  });
});

describe("connectStatusFor", () => {
  const account = (over: Partial<Stripe.Account>): Stripe.Account =>
    ({ payouts_enabled: false, requirements: {}, ...over }) as Stripe.Account;

  it("is complete only when payouts work and nothing is outstanding", () => {
    expect(
      connectStatusFor(account({ payouts_enabled: true, requirements: {} as never })),
    ).toBe("complete");
  });

  it("is restricted whenever Stripe has disabled the account", () => {
    expect(
      connectStatusFor(
        account({
          payouts_enabled: true,
          requirements: { disabled_reason: "requirements.past_due" } as never,
        }),
      ),
    ).toBe("restricted");
  });

  it("is still onboarding before payouts are enabled", () => {
    expect(connectStatusFor(account({ payouts_enabled: false }))).toBe("onboarding");
  });

  it("never reports complete for an account that cannot be paid", () => {
    // This is the check that gates is_live, so a false "complete" would put a
    // kitchen on the marketplace that cannot receive its money.
    const restricted = connectStatusFor(
      account({
        payouts_enabled: false,
        requirements: { disabled_reason: "under_review" } as never,
      }),
    );
    expect(restricted).not.toBe("complete");
  });
});
