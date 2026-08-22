/**
 * Filter vocabulary and URL parsing for discovery.
 *
 * Deliberately free of server-only imports: the filter rail is a client
 * component and needs the same option lists the server query uses.
 */

export type DishResult = {
  menu_item_id: string;
  vendor_id: string;
  vendor_handle: string;
  vendor_name: string;
  cuisine: string | null;
  dish_name: string;
  description: string | null;
  price_cents: number;
  photo_path: string | null;
  prep_note: string | null;
  dietary_tags: string[];
  allergens: string[];
  quantity_available: number | null;
  lat: number | null;
  lng: number | null;
  distance_m: number | null;
  total_count: number;
};

export type DiscoveryFilters = {
  lat: number | null;
  lng: number | null;
  locationLabel: string | null;
  radiusMiles: number;
  cuisines: string[];
  dietary: string[];
  priceMinCents: number | null;
  priceMaxCents: number | null;
  availability: string | null;
  pickupWindows: string[];
  sort: "distance" | "price" | "newest";
  view: "grid" | "map";
  page: number;
};

export const PAGE_SIZE = 24;

/** Price buckets shown in the rail, in cents. A null bound is open-ended. */
export const PRICE_BUCKETS = [
  { value: "under10", label: "Under $10", min: null, max: 999 },
  { value: "10to15", label: "$10–$15", min: 1000, max: 1500 },
  { value: "15to25", label: "$15–$25", min: 1500, max: 2500 },
  { value: "over25", label: "$25+", min: 2500, max: null },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "today", label: "Ready today" },
  { value: "week", label: "Ready this week" },
] as const;

export const PICKUP_WINDOW_OPTIONS = [
  { value: "lunch", label: "Lunch (11–2)" },
  { value: "dinner", label: "Dinner (5–8)" },
  { value: "late", label: "Late (8–10)" },
] as const;

export const RADIUS_STEPS = [0.5, 1, 2, 3, 5, 10] as const;

type RawParams = Record<string, string | string[] | undefined>;

function one(params: RawParams, key: string): string | null {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function list(params: RawParams, key: string): string[] {
  const value = one(params, key);
  return value ? value.split(",").filter(Boolean) : [];
}

function num(params: RawParams, key: string): number | null {
  const value = one(params, key);
  if (value === null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Read the URL into a filter object. The URL is the only filter state. */
export function parseFilters(params: RawParams): DiscoveryFilters {
  const bucket = PRICE_BUCKETS.find((b) => b.value === one(params, "price"));
  const sort = one(params, "sort");
  const rawRadius = num(params, "radius");
  const rawPage = num(params, "page");

  return {
    lat: num(params, "lat"),
    lng: num(params, "lng"),
    locationLabel: one(params, "loc"),
    radiusMiles: rawRadius && rawRadius > 0 ? Math.min(rawRadius, 25) : 3,
    cuisines: list(params, "cuisine"),
    dietary: list(params, "dietary"),
    priceMinCents: bucket?.min ?? null,
    priceMaxCents: bucket?.max ?? null,
    availability: one(params, "availability"),
    pickupWindows: list(params, "pickup"),
    sort: sort === "price" || sort === "newest" ? sort : "distance",
    view: one(params, "view") === "map" ? "map" : "grid",
    page: rawPage && rawPage > 0 ? Math.floor(rawPage) : 1,
  };
}
