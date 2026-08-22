import Link from "next/link";

import { SiteNav } from "@/components/marketplace/SiteNav";
import { Pill } from "@/components/marketplace/Pill";
import { FilterRail } from "@/components/marketplace/FilterRail";
import { ResultsMap, type MapPin } from "@/components/marketplace/ResultsMap";
import { attachPhotoUrls, searchDishes } from "@/lib/discovery";
import {
  parseFilters,
  PAGE_SIZE,
  PRICE_BUCKETS,
  AVAILABILITY_OPTIONS,
  PICKUP_WINDOW_OPTIONS,
  type DiscoveryFilters,
  type DishResult,
} from "@/lib/discovery-options";
import { dietaryLabel } from "@/lib/constants/taxonomy";
import { formatDistance, formatPrice } from "@/lib/format";
import { publicEnv } from "@/lib/env";

export const metadata = { title: "Browse · FreshFork" };

export default async function BrowsePage(props: PageProps<"/browse">) {
  const params = await props.searchParams;
  const filters = parseFilters(params);

  const { results, total } = await searchDishes(filters);
  const photos = await attachPhotoUrls(results);

  const query = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]],
    ),
  );

  return (
    <div className="flex flex-col flex-1">
      <SiteNav />
      <PageHead filters={filters} total={total} shown={results.length} query={query} />
      <div className="border-b border-line" />
      <div className="flex items-start gap-12 px-16 py-8 pb-24">
        <FilterRail radiusMiles={filters.radiusMiles} />
        <Results
          filters={filters}
          results={results}
          photos={photos}
          total={total}
          query={query}
        />
      </div>
    </div>
  );
}

/** Human-readable chips for whatever is currently narrowing the search. */
function activeFilterChips(filters: DiscoveryFilters): { label: string; key: string }[] {
  const chips: { label: string; key: string }[] = [];

  if (filters.lat !== null) {
    chips.push({ label: `${filters.radiusMiles} mi radius`, key: "radius" });
  }
  const availability = AVAILABILITY_OPTIONS.find(
    (option) => option.value === filters.availability,
  );
  if (availability) chips.push({ label: availability.label, key: "availability" });

  for (const cuisine of filters.cuisines) chips.push({ label: cuisine, key: "cuisine" });
  for (const tag of filters.dietary) {
    chips.push({ label: dietaryLabel(tag), key: "dietary" });
  }

  const bucket = PRICE_BUCKETS.find(
    (b) => b.min === filters.priceMinCents && b.max === filters.priceMaxCents,
  );
  if (bucket) chips.push({ label: bucket.label, key: "price" });

  for (const window of filters.pickupWindows) {
    const option = PICKUP_WINDOW_OPTIONS.find((o) => o.value === window);
    if (option) chips.push({ label: option.label, key: "pickup" });
  }

  return chips;
}

function withParam(query: URLSearchParams, key: string, value: string | null): string {
  const next = new URLSearchParams(query.toString());
  if (value === null) next.delete(key);
  else next.set(key, value);
  next.delete("page");
  return `/browse?${next.toString()}`;
}

function PageHead({
  filters,
  total,
  shown,
  query,
}: {
  filters: DiscoveryFilters;
  total: number;
  shown: number;
  query: URLSearchParams;
}) {
  const chips = activeFilterChips(filters);
  const locationLabel = filters.locationLabel ?? "your area";

  const sortLabels: Record<DiscoveryFilters["sort"], string> = {
    distance: "Closest first",
    price: "Cheapest first",
    newest: "Newest first",
  };
  const nextSort =
    filters.sort === "distance" ? "price" : filters.sort === "price" ? "newest" : "distance";

  return (
    <div className="flex flex-col gap-6 px-16 pt-12 pb-6">
      <div className="flex items-center gap-2 text-xs">
        <Link href="/" className="text-ink-50">
          Discover
        </Link>
        <span className="text-ink-50">/</span>
        <span className="font-medium text-forest">Browse near {locationLabel}</span>
      </div>

      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[44px] font-semibold tracking-[-0.03em] text-forest">
            Cooking near you
          </h1>
          <p className="text-sm text-ink-70">
            {total} {total === 1 ? "dish" : "dishes"}
            {filters.lat !== null ? ` within ${filters.radiusMiles} mi` : " from verified cooks"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={withParam(query, "sort", nextSort)}
            scroll={false}
            className="flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2.5"
          >
            <span className="text-xs text-ink-50">Sort</span>
            <span className="text-sm font-medium text-forest">
              {sortLabels[filters.sort]} ⌄
            </span>
          </Link>
          <div className="flex items-center gap-0 rounded-full border border-line bg-card p-1">
            <Link href={withParam(query, "view", null)} scroll={false}>
              <Pill tone={filters.view === "grid" ? "solid" : "outline"}>Grid</Pill>
            </Link>
            <Link href={withParam(query, "view", "map")} scroll={false}>
              <Pill tone={filters.view === "map" ? "solid" : "outline"}>Map</Pill>
            </Link>
          </div>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2.5">
          {chips.map((chip) => (
            <Link
              key={`${chip.key}-${chip.label}`}
              href={withParam(query, chip.key, null)}
              scroll={false}
            >
              <Pill tone="solid">{chip.label} ×</Pill>
            </Link>
          ))}
          <Link
            href={
              filters.lat !== null
                ? `/browse?lat=${filters.lat}&lng=${filters.lng}&loc=${encodeURIComponent(
                    filters.locationLabel ?? "",
                  )}`
                : "/browse"
            }
            scroll={false}
            className="text-xs font-medium text-persimmon"
          >
            Clear all
          </Link>
        </div>
      ) : null}

      {shown === 0 && total === 0 ? null : null}
    </div>
  );
}

function Results({
  filters,
  results,
  photos,
  total,
  query,
}: {
  filters: DiscoveryFilters;
  results: DishResult[];
  photos: Map<string, string | null>;
  total: number;
  query: URLSearchParams;
}) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pins: MapPin[] = results.flatMap((result) =>
    result.lat === null || result.lng === null
      ? []
      : [
          {
            id: result.menu_item_id,
            handle: result.vendor_handle,
            vendorName: result.vendor_name,
            dishName: result.dish_name,
            priceCents: result.price_cents,
            lat: result.lat,
            lng: result.lng,
          },
        ],
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-forest">
          {total === 0
            ? "No dishes yet"
            : `Showing ${results.length} of ${total}${
                filters.lat !== null ? ` · Within ${filters.radiusMiles} mi` : ""
              }`}
        </span>
      </div>

      {total === 0 ? (
        <EmptyState filters={filters} />
      ) : filters.view === "map" ? (
        <ResultsMap
          pins={pins}
          token={publicEnv.mapboxToken ?? null}
          center={
            filters.lat !== null && filters.lng !== null
              ? { lat: filters.lat, lng: filters.lng }
              : null
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {results.map((result) => (
            <DishCard
              key={result.menu_item_id}
              result={result}
              photoUrl={photos.get(result.menu_item_id) ?? null}
            />
          ))}
        </div>
      )}

      {pageCount > 1 && filters.view === "grid" ? (
        <div className="flex justify-center gap-3 pt-4">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => {
            const next = new URLSearchParams(query.toString());
            next.set("page", String(page));
            return (
              <Link key={page} href={`/browse?${next.toString()}`} scroll={false}>
                <Pill tone={page === filters.page ? "solid" : "outline"}>{page}</Pill>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ filters }: { filters: DiscoveryFilters }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line bg-card px-8 py-20 text-center">
      <p className="font-display text-[22px] font-semibold text-forest">
        {filters.lat === null
          ? "Tell us where you are."
          : "Nothing cooking in range right now."}
      </p>
      <p className="max-w-md text-[15px] leading-[1.55] text-ink-70">
        {filters.lat === null
          ? "Set your address and we'll show the kitchens within walking distance."
          : "Try widening the radius or clearing a filter — this neighborhood is still filling up."}
      </p>
      <Link
        href="/signup"
        className="mt-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-buttermilk"
      >
        Cook with us
      </Link>
    </div>
  );
}

function DishCard({
  result,
  photoUrl,
}: {
  result: DishResult;
  photoUrl: string | null;
}) {
  const prep =
    result.prep_note ??
    (result.quantity_available !== null
      ? `${result.quantity_available} LEFT`
      : "MADE TO ORDER");

  return (
    <Link href={`/vendor/${result.vendor_handle}`}>
      <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-card p-4.5">
        <div
          className="relative h-[200px] w-full overflow-hidden rounded-xl bg-straw-soft"
          style={
            photoUrl
              ? {
                  backgroundImage: `url(${photoUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : { background: "linear-gradient(180deg, #d97148 0%, #6b2c1e 100%)" }
          }
        >
          <div className="absolute left-3 top-[166px] flex items-center gap-1.5 rounded-full bg-forest/90 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
            <span className="font-mono text-[10px] tracking-[0.1em] text-buttermilk">
              {prep}
            </span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-[18px] font-semibold tracking-[-0.01em] text-forest">
              {result.dish_name}
            </span>
            <span className="text-xs text-ink-70">
              {result.vendor_name}
              {result.distance_m !== null ? ` · ${formatDistance(result.distance_m)}` : ""}
            </span>
          </div>
          <span className="font-mono text-[15px] font-medium text-forest">
            {formatPrice(result.price_cents)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {result.dietary_tags.map((tag) => (
            <Pill key={tag} tone="ghost" className="text-[10px] px-2 py-1">
              {dietaryLabel(tag)}
            </Pill>
          ))}
        </div>
      </div>
    </Link>
  );
}
