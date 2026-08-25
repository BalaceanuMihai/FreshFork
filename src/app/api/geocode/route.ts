import { NextResponse, type NextRequest } from "next/server";

import { forwardGeocode } from "@/lib/mapbox/geocode";
import { features } from "@/lib/env";
import { getViewer } from "@/lib/auth";
import { callerIp, consume } from "@/lib/rate-limit";

/**
 * Address autocomplete proxy.
 *
 * Geocoding goes through the server so validation lives in one place and the
 * token isn't pinned to a per-component fetch — the same endpoint serves the
 * vendor address step and the customer location bar.
 *
 * It stays reachable signed out, because the location bar on the landing page
 * needs it before anybody has an account. That makes it an unmetered proxy to
 * a metered third party, so it is rate limited on two windows: a burst budget
 * that keeps typing responsive, and a daily ceiling that caps what a
 * determined script can spend. Signed-in callers are keyed on their user id;
 * everyone else on their address.
 */
export async function GET(request: NextRequest) {
  if (!features.mapbox) {
    return NextResponse.json(
      { results: [], error: "Address search is unavailable — Mapbox is not configured." },
      { status: 200 },
    );
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const sessionToken = request.nextUrl.searchParams.get("session_token") ?? undefined;

  // Cheap rejections first — a too-short query must not spend budget.
  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }
  if (query.length > 200) {
    return NextResponse.json({ results: [], error: "Query too long." }, { status: 400 });
  }

  const viewer = await getViewer();
  const subject = viewer ? `user:${viewer.user.id}` : `ip:${await callerIp()}`;

  const [burst, daily] = await Promise.all([
    consume("geocode", subject),
    consume("geocodeDaily", subject),
  ]);

  const blocked = !burst.allowed ? burst : !daily.allowed ? daily : null;
  if (blocked) {
    return NextResponse.json(
      { results: [], error: "Too many address lookups. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(blocked.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const results = await forwardGeocode(query, sessionToken);

  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(Math.min(burst.remaining, daily.remaining)),
      },
    },
  );
}
