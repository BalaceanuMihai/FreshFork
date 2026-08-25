import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { log } from "@/lib/log";
import type { FeeSettings } from "@/lib/fees";
import type { PlatformSettings } from "@/lib/supabase/database.types";

/**
 * Marketplace configuration.
 *
 * Fees live in the database rather than in environment variables because
 * `create_order()` has to apply them server-side — it is reachable over
 * PostgREST, so anything the request supplies is something the customer could
 * choose for themselves. `FRESHFORK_PLATFORM_FEE_BPS` remains the deployment's
 * intended value: it seeds a fresh environment and is what the admin settings
 * form offers as the default.
 */

const FALLBACK: PlatformSettings = {
  id: true,
  platform_fee_bps: 1200,
  service_fee_bps: 500,
  service_fee_min_cents: 99,
  service_fee_max_cents: 500,
  order_lead_minutes: 60,
  max_pickup_days_ahead: 14,
  pending_payment_ttl_minutes: 30,
  customer_cancel_cutoff_minutes: 120,
  max_open_checkouts: 3,
  updated_at: new Date(0).toISOString(),
};

export const getPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .maybeSingle();

  if (error) {
    log.error("Could not read platform_settings; using deployment defaults.", {
      error: error.message,
    });
  }

  if (data) return data;

  // No row yet (a freshly restored database, or the migration hasn't run).
  // Fall back to the deployment's configured fee rather than a hard-coded one.
  return { ...FALLBACK, platform_fee_bps: envPlatformFeeBps() };
});

/** The deployment's intended platform fee, or the default if it is unset. */
export function envPlatformFeeBps(): number {
  try {
    return serverEnv.platformFeeBps;
  } catch {
    return FALLBACK.platform_fee_bps;
  }
}

export function feeSettingsFrom(settings: PlatformSettings): FeeSettings {
  return {
    platformFeeBps: settings.platform_fee_bps,
    serviceFeeBps: settings.service_fee_bps,
    serviceFeeMinCents: settings.service_fee_min_cents,
    serviceFeeMaxCents: settings.service_fee_max_cents,
  };
}
