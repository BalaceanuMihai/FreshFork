import { NextResponse, type NextRequest } from "next/server";

import { forwardGeocode } from "@/lib/mapbox/geocode";
import { features } from "@/lib/env";
import { getViewer } from "@/lib/auth";

/**
 * Address autocomplete proxy.
 *
 * Geocoding goes through the server so validation lives in one place and the
 * token isn't pinned to a per-component fetch — the same endpoint serves the
 * vendor address step and the customer location bar.
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

  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }
  if (query.length > 200) {
    return NextResponse.json({ results: [], error: "Query too long." }, { status: 400 });
  }

  // Cheap abuse brake: signed-out visitors still need this for the location
  // bar, so it stays open, but the upstream call is capped and uncached.
  await getViewer();

  const results = await forwardGeocode(query, sessionToken);
  return NextResponse.json({ results });
}
