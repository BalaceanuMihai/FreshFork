import "server-only";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

/**
 * Fixed-window rate limiting, counted in Postgres.
 *
 * Serverless instances share no memory, so an in-process counter would reset
 * on every cold start and be trivially bypassed by parallel requests. The
 * counter lives in `public.rate_limits` and is incremented atomically by
 * `consume_rate_limit`, which only the service role may call — otherwise a
 * client could spend somebody else's budget for them.
 */

export type RateLimitVerdict = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const ALLOWED: RateLimitVerdict = {
  allowed: true,
  remaining: Number.MAX_SAFE_INTEGER,
  retryAfterSeconds: 0,
};

export type RateLimitRule = { limit: number; windowSeconds: number };

/**
 * Named budgets, so the numbers live in one place instead of being scattered
 * as literals across routes.
 */
export const RATE_LIMITS = {
  /** Mapbox bills per request; this endpoint is reachable signed out. */
  geocode: { limit: 30, windowSeconds: 60 },
  geocodeDaily: { limit: 500, windowSeconds: 86_400 },
  /** Password guessing, per identifier and per address. */
  signIn: { limit: 8, windowSeconds: 300 },
  signUp: { limit: 5, windowSeconds: 3_600 },
  /** Each checkout reserves stock and creates a Stripe object. */
  checkout: { limit: 10, windowSeconds: 600 },
  /** Each of these hits the Stripe API on our account. */
  stripeOnboarding: { limit: 10, windowSeconds: 3_600 },
  refreshStripeStatus: { limit: 20, windowSeconds: 3_600 },
  /** Abuse reports are free to file, which is exactly why they need a cap. */
  report: { limit: 10, windowSeconds: 3_600 },
  review: { limit: 20, windowSeconds: 3_600 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * The client's IP as far as the proxy is concerned.
 *
 * `x-forwarded-for` is client-controllable when nothing trustworthy sits in
 * front of the app, so this is a speed bump for casual abuse rather than an
 * identity. Anything that must not be spoofable is keyed on a user id instead.
 */
export async function callerIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

/**
 * Spend one unit from `<action>:<subject>`.
 *
 * Fails **open** when Supabase is unreachable or the service-role key is
 * unset: an unavailable limiter should not take down sign-in. The failure is
 * logged loudly so it cannot go unnoticed.
 */
export async function consume(
  action: keyof typeof RATE_LIMITS,
  subject: string,
): Promise<RateLimitVerdict> {
  const rule = RATE_LIMITS[action];

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    log.warn("Rate limiting is disabled — SUPABASE_SERVICE_ROLE_KEY is unset.", {
      action,
    });
    return ALLOWED;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_bucket: `${action}:${subject}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });

    if (error) {
      log.error("Rate limit check failed; allowing the request.", {
        action,
        error: error.message,
      });
      return ALLOWED;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return ALLOWED;

    return {
      allowed: row.allowed,
      remaining: row.remaining,
      retryAfterSeconds: row.retry_after_seconds,
    };
  } catch (error) {
    log.error("Rate limit check threw; allowing the request.", {
      action,
      error: error instanceof Error ? error.message : String(error),
    });
    return ALLOWED;
  }
}

/** Convenience for actions that just need a yes/no against the caller's IP. */
export async function consumeForIp(
  action: keyof typeof RATE_LIMITS,
): Promise<RateLimitVerdict> {
  return consume(action, await callerIp());
}
