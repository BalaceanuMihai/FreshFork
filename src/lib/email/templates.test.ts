import { describe, expect, it } from "vitest";

import {
  orderCanceledEmail,
  orderReceiptEmail,
  vendorDecisionEmail,
  type OrderEmailData,
} from "@/lib/email/templates";

/**
 * Email is the one output nobody sees before a stranger does. These tests
 * cover the two ways it goes wrong in practice: an unescaped name breaking the
 * markup, and a missing text part making the message unreadable in clients
 * that prefer it.
 */

const ORDER: OrderEmailData = {
  code: "FF-B7K2QX",
  vendorName: "Auntie Bee's Kitchen",
  customerName: "Sam",
  pickupAt: "Tue 26 Aug, 6–8 pm",
  pickupAddress: "215 DeKalb Ave, Brooklyn",
  lines: [
    { name: "Jollof rice", quantity: 2, lineTotalCents: 3200 },
    { name: "Puff puff", quantity: 1, lineTotalCents: 600 },
  ],
  subtotalCents: 3800,
  serviceFeeCents: 190,
  totalCents: 3990,
  orderUrl: "https://freshfork.test/orders/abc",
  note: null,
};

describe("orderReceiptEmail", () => {
  it("names the kitchen and the pickup code in the subject and body", () => {
    const email = orderReceiptEmail(ORDER);

    expect(email.subject).toContain("FF-B7K2QX");
    expect(email.html).toContain("Auntie Bee&#039;s Kitchen");
    expect(email.text).toContain("FF-B7K2QX");
  });

  it("itemises the order in both parts", () => {
    const email = orderReceiptEmail(ORDER);

    expect(email.html).toContain("Jollof rice");
    expect(email.text).toContain("Jollof rice × 2");
  });

  it("formats money as currency, never as raw cents", () => {
    const email = orderReceiptEmail(ORDER);

    // Euro by default — FreshFork sells across Europe.
    expect(email.text).toContain("€39.90");
    expect(email.text).not.toContain("3990");
  });

  it("prices in the kitchen's own currency, not a platform default", () => {
    // A London kitchen charges pounds. Rendering that as euros would show a
    // number that is wrong and entirely plausible.
    const pounds = orderReceiptEmail({ ...ORDER, currency: "gbp" });
    expect(pounds.text).toContain("£39.90");
    expect(pounds.text).not.toContain("€");

    const kronor = orderReceiptEmail({ ...ORDER, currency: "sek" });
    expect(kronor.text).toMatch(/SEK|kr/);
  });

  it("renders a waived fee in the right currency rather than a hardcoded zero", () => {
    const email = orderReceiptEmail({
      ...ORDER,
      currency: "gbp",
      serviceFeeCents: 0,
      totalCents: 3800,
    });
    expect(email.html).toContain("waived with Plus");
    expect(email.html).not.toContain("$0");
  });

  it("says the fee was waived rather than showing a bare zero", () => {
    const email = orderReceiptEmail({ ...ORDER, serviceFeeCents: 0, totalCents: 3800 });
    expect(email.html).toContain("waived with Plus");
  });

  it("always ships a text part", () => {
    expect(orderReceiptEmail(ORDER).text.trim().length).toBeGreaterThan(0);
  });

  it("escapes anything a customer or cook typed", () => {
    const email = orderReceiptEmail({
      ...ORDER,
      vendorName: '<script>alert("xss")</script>',
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("orderCanceledEmail", () => {
  it("tells a paid customer their money is coming back", () => {
    const email = orderCanceledEmail({
      ...ORDER,
      reason: "The kitchen had a power cut.",
      refunded: true,
    });

    expect(email.text).toContain("refunded");
    expect(email.text).toContain("The kitchen had a power cut.");
  });

  it("tells an unpaid customer nothing was taken", () => {
    const email = orderCanceledEmail({
      ...ORDER,
      reason: "Checkout expired.",
      refunded: false,
    });

    expect(email.text).toContain("Nothing was charged");
  });
});

describe("vendorDecisionEmail", () => {
  const base = {
    vendorName: "Auntie Bee's Kitchen",
    note: "Your certification photo is unreadable.",
    dashboardUrl: "https://freshfork.test/dashboard/vendor",
  };

  it("carries the reviewer's note when changes are requested", () => {
    // This is the whole point of the message: previously a cook was sent back
    // for changes and never told which ones.
    const email = vendorDecisionEmail({ ...base, decision: "changes_requested" });

    expect(email.text).toContain("Your certification photo is unreadable.");
    expect(email.subject).toContain("changes needed");
  });

  it("congratulates on approval", () => {
    const email = vendorDecisionEmail({ ...base, decision: "approved", note: null });
    expect(email.subject).toContain("approved");
  });

  it("explains a suspension", () => {
    const email = vendorDecisionEmail({ ...base, decision: "suspended" });
    expect(email.subject).toContain("suspended");
    expect(email.text).toContain("Your certification photo is unreadable.");
  });
});
