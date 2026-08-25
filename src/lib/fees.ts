/**
 * Fee arithmetic, in one pure place.
 *
 * This mirrors what `create_order()` computes in SQL. The database is
 * authoritative — it is the copy that cannot be skipped by calling PostgREST
 * directly — but checkout has to quote a total before it charges one, and a
 * customer being shown a different number than they are charged is the kind of
 * bug that turns into a chargeback. The unit tests pin the two together.
 */

export type FeeSettings = {
  platformFeeBps: number;
  serviceFeeBps: number;
  serviceFeeMinCents: number;
  serviceFeeMaxCents: number;
};

export type FeeBreakdown = {
  subtotalCents: number;
  serviceFeeCents: number;
  platformFeeCents: number;
  totalCents: number;
  vendorPayoutCents: number;
  /** What Stripe should hold back from the connected account. */
  applicationFeeCents: number;
};

/** Basis points of an amount, rounded half-up, to match Postgres `round()`. */
export function applyBps(amountCents: number, bps: number): number {
  return Math.round((amountCents * bps) / 10_000);
}

/**
 * Plus waives the customer-side service fee entirely — that is the membership's
 * whole proposition. The platform's cut of the vendor's food is unaffected.
 */
export function quoteFees(
  subtotalCents: number,
  settings: FeeSettings,
  hasPlus: boolean,
): FeeBreakdown {
  const subtotal = Math.max(0, Math.round(subtotalCents));

  const serviceFeeCents =
    hasPlus || subtotal === 0
      ? 0
      : Math.min(
          Math.max(
            applyBps(subtotal, settings.serviceFeeBps),
            settings.serviceFeeMinCents,
          ),
          settings.serviceFeeMaxCents,
        );

  const platformFeeCents = applyBps(subtotal, settings.platformFeeBps);

  return {
    subtotalCents: subtotal,
    serviceFeeCents,
    platformFeeCents,
    totalCents: subtotal + serviceFeeCents,
    vendorPayoutCents: subtotal - platformFeeCents,
    // FreshFork keeps both its cut of the food and the customer-side fee; the
    // remainder settles to the connected account.
    applicationFeeCents: platformFeeCents + serviceFeeCents,
  };
}
