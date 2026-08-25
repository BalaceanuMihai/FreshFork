import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { features } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Liveness and readiness in one endpoint.
 *
 * Returns 200 only when the app can actually serve a request that touches the
 * database — a process that is running but cannot reach Postgres is not
 * healthy, and a load balancer should know that.
 *
 * Deliberately says nothing about *why* something is down beyond a boolean per
 * dependency: this is reachable without authentication, and a health check is
 * not a place to advertise which secrets are missing.
 */
export async function GET() {
  const checks: Record<string, boolean> = {
    supabase_configured: isSupabaseConfigured(),
    stripe: features.stripeConnect,
    ordering: features.ordering,
    email: features.email,
    mapbox: features.mapbox,
    database: false,
  };

  if (checks.supabase_configured) {
    try {
      const supabase = await createClient();
      // Cheapest possible round trip that still proves RLS and PostgREST are
      // answering: a single row from a table anyone may read.
      const { error } = await supabase
        .from("platform_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      checks.database = !error;
    } catch {
      checks.database = false;
    }
  }

  const healthy = checks.supabase_configured && checks.database;

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks, time: new Date().toISOString() },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
