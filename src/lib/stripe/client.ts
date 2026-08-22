import "server-only";

import Stripe from "stripe";

import { serverEnv } from "@/lib/env";

let cached: Stripe | null = null;

/**
 * Lazily constructed Stripe client. Reading `serverEnv.stripeSecretKey` throws
 * when the key is unset, so callers should check `features.stripeConnect`
 * first and show a degraded state rather than letting the route 500.
 */
export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(serverEnv.stripeSecretKey);
  }
  return cached;
}
