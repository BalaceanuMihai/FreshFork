import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/server";
import { captureException, log } from "@/lib/log";
import { features, serverEnv } from "@/lib/env";

/**
 * Scheduled maintenance: the three jobs nothing else can do.
 *
 *   1. **Expire abandoned checkouts.** A customer who opens checkout and walks
 *      away is holding the last portion of something. Stripe's own session
 *      expiry covers the common case; this catches the rest.
 *   2. **Delete orphaned storage objects.** Deleting a row cascades in
 *      Postgres but leaves the file in the bucket. Triggers queue the paths;
 *      only an HTTP call to the Storage API can actually remove the bytes.
 *   3. **Prune rate-limit rows** nobody has revisited.
 *
 * Authenticated with a bearer token rather than a session, because there is no
 * user here. Compared in constant time — a timing oracle on a maintenance
 * endpoint that runs with the service role is not a trade worth making.
 *
 * Run it every 5–15 minutes (Vercel Cron, GitHub Actions, or any scheduler).
 */

const BATCH = 100;

function authorized(request: NextRequest): boolean {
  if (!features.cron) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : header;

  const expected = Buffer.from(serverEnv.cronSecret);
  const actual = Buffer.from(presented);

  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length; compare lengths first and always run the comparison.
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const admin = createAdminClient();
  const result: Record<string, number | string> = {};

  // 1. Abandoned checkouts -> stock returned.
  try {
    const { data, error } = await admin.rpc("expire_stale_orders");
    if (error) throw new Error(error.message);
    result.orders_expired = data ?? 0;
  } catch (error) {
    captureException(error, { where: "cron.expireStaleOrders" });
    result.orders_expired = "failed";
  }

  // 2. Orphaned objects -> actually deleted.
  try {
    const { data: orphans, error } = await admin
      .from("storage_orphans")
      .select("*")
      .is("deleted_at", null)
      .lt("attempts", 5)
      .order("queued_at", { ascending: true })
      .limit(BATCH);

    if (error) throw new Error(error.message);

    let deleted = 0;

    // Grouped per bucket: the Storage API takes a list of paths per call, and
    // one round trip per file would make a large backlog take all day.
    const byBucket = new Map<string, typeof orphans>();
    for (const orphan of orphans ?? []) {
      const bucket = byBucket.get(orphan.bucket);
      if (bucket) bucket.push(orphan);
      else byBucket.set(orphan.bucket, [orphan]);
    }

    for (const [bucket, rows] of byBucket) {
      const paths = rows.map((row) => row.object_path);
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);

      if (removeError) {
        log.warn("Storage sweep failed for a bucket.", {
          bucket,
          count: paths.length,
          error: removeError.message,
        });
        for (const row of rows) {
          await admin
            .from("storage_orphans")
            .update({
              attempts: row.attempts + 1,
              last_error: removeError.message.slice(0, 300),
            })
            .eq("id", row.id);
        }
        continue;
      }

      const ids = rows.map((row) => row.id);
      await admin
        .from("storage_orphans")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);

      deleted += ids.length;
    }

    result.objects_deleted = deleted;
  } catch (error) {
    captureException(error, { where: "cron.storageSweep" });
    result.objects_deleted = "failed";
  }

  // 3. Stale rate-limit buckets.
  try {
    const { data, error } = await admin.rpc("prune_rate_limits", {
      p_older_than_seconds: 86_400,
    });
    if (error) throw new Error(error.message);
    result.rate_limits_pruned = data ?? 0;
  } catch (error) {
    captureException(error, { where: "cron.pruneRateLimits" });
    result.rate_limits_pruned = "failed";
  }

  log.info("Maintenance run complete.", result);
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
