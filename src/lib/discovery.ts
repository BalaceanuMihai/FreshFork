import "server-only";

import { createClient } from "@/lib/supabase/server";
import { milesToMetres } from "@/lib/format";
import { log } from "@/lib/log";
import { PAGE_SIZE, type DiscoveryFilters, type DishResult } from "@/lib/discovery-options";

/**
 * `failed` separates "nothing matched" from "the search broke".
 *
 * These used to collapse into the same empty array, which meant a database
 * outage rendered as a polite "no dishes near you" — indistinguishable from a
 * quiet Tuesday, and invisible in monitoring.
 */
export type DishSearch = {
  results: DishResult[];
  total: number;
  failed: boolean;
};

export async function searchDishes(
  filters: DiscoveryFilters,
  limit = PAGE_SIZE,
): Promise<DishSearch> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_menu_items", {
    p_lat: filters.lat,
    p_lng: filters.lng,
    p_radius_m: milesToMetres(filters.radiusMiles),
    p_cuisines: filters.cuisines.length ? filters.cuisines : null,
    p_dietary: filters.dietary.length ? filters.dietary : null,
    p_price_min_cents: filters.priceMinCents,
    p_price_max_cents: filters.priceMaxCents,
    p_availability: filters.availability,
    p_pickup_windows: filters.pickupWindows.length ? filters.pickupWindows : null,
    p_sort: filters.sort,
    p_limit: limit,
    p_offset: (filters.page - 1) * limit,
  });

  if (error) {
    log.error("Dish search failed.", { error: error.message });
    return { results: [], total: 0, failed: true };
  }

  const results = (data ?? []) as unknown as DishResult[];
  return { results, total: Number(results[0]?.total_count ?? 0), failed: false };
}

export async function getDiscoveryStats(
  lat: number | null,
  lng: number | null,
  radiusMiles = 3,
): Promise<{ vendors: number; dishes: number; cuisines: number; failed: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("discovery_stats", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: milesToMetres(radiusMiles),
  });

  if (error) {
    log.error("Discovery stats failed.", { error: error.message });
    return { vendors: 0, dishes: 0, cuisines: 0, failed: true };
  }

  const row = (
    data as unknown as
      | { live_vendors: number; live_dishes: number; cuisines: number }[]
      | null
  )?.[0];

  return {
    vendors: Number(row?.live_vendors ?? 0),
    dishes: Number(row?.live_dishes ?? 0),
    cuisines: Number(row?.cuisines ?? 0),
    failed: false,
  };
}

/** Distinct cities with at least one live kitchen, for trust-building copy. */
export async function getLiveCities(limit = 8): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendors")
    .select("pickup_city")
    .eq("is_live", true)
    .not("pickup_city", "is", null);

  if (error) {
    log.error("Live city lookup failed.", { error: error.message });
    return [];
  }

  const cities = [...new Set((data ?? []).map((row) => row.pickup_city).filter((c): c is string => Boolean(c)))];
  return cities.slice(0, limit);
}

/** Public URLs for a page of results, resolved in one pass. */
export async function attachPhotoUrls(
  results: DishResult[],
): Promise<Map<string, string | null>> {
  const supabase = await createClient();
  const map = new Map<string, string | null>();

  for (const result of results) {
    map.set(
      result.menu_item_id,
      result.photo_path
        ? supabase.storage.from("dish-photos").getPublicUrl(result.photo_path).data
            .publicUrl
        : null,
    );
  }

  return map;
}
