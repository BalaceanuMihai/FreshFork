import "server-only";

import { createClient } from "@/lib/supabase/server";
import { milesToMetres } from "@/lib/format";
import { PAGE_SIZE, type DiscoveryFilters, type DishResult } from "@/lib/discovery-options";

export async function searchDishes(
  filters: DiscoveryFilters,
  limit = PAGE_SIZE,
): Promise<{ results: DishResult[]; total: number }> {
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

  if (error || !data) return { results: [], total: 0 };

  const results = data as unknown as DishResult[];
  return { results, total: Number(results[0]?.total_count ?? 0) };
}

export async function getDiscoveryStats(
  lat: number | null,
  lng: number | null,
  radiusMiles = 3,
): Promise<{ vendors: number; dishes: number; cuisines: number }> {
  const supabase = await createClient();

  const { data } = await supabase.rpc("discovery_stats", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: milesToMetres(radiusMiles),
  });

  const row = (
    data as unknown as
      | { live_vendors: number; live_dishes: number; cuisines: number }[]
      | null
  )?.[0];

  return {
    vendors: Number(row?.live_vendors ?? 0),
    dishes: Number(row?.live_dishes ?? 0),
    cuisines: Number(row?.cuisines ?? 0),
  };
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
