import Link from "next/link";
import { ChevronDown, Filter, MapPin, Search, SlidersHorizontal, X } from "lucide-react";

import { requireViewer } from "@/lib/auth";
import { attachPhotoUrls, searchDishes } from "@/lib/discovery";
import {
  parseFilters,
  PAGE_SIZE,
  PRICE_BUCKETS,
  AVAILABILITY_OPTIONS,
  PICKUP_WINDOW_OPTIONS,
  RADIUS_STEPS,
  type DiscoveryFilters,
} from "@/lib/discovery-options";
import { CUISINES, DIETARY_TAGS } from "@/lib/constants/taxonomy";
import { DishCard } from "@/components/dish-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { MultiChipFilter } from "@/components/browse/multi-chip-filter";
import { UseMyLocationButton } from "@/components/browse/use-my-location";
import { LocationSearch } from "@/components/browse/location-search";

export const metadata = { title: "Browse · FreshFork" };

const FORM_ID = "browse-filters";

export default async function BrowsePage(props: PageProps<"/browse">) {
  await requireViewer("/browse");
  const params = await props.searchParams;
  const filters = parseFilters(params);

  const { results, total, failed } = await searchDishes(filters);
  const photos = await attachPhotoUrls(results);

  const priceValue =
    PRICE_BUCKETS.find((b) => b.min === filters.priceMinCents && b.max === filters.priceMaxCents)?.value ?? "";

  const activeFilterCount =
    filters.cuisines.length +
    filters.dietary.length +
    filters.pickupWindows.length +
    (priceValue ? 1 : 0) +
    (filters.availability ? 1 : 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
          {filters.locationLabel ? (
            <>
              <MapPin className="w-5 h-5 text-primary" /> Cooking near {filters.locationLabel}
            </>
          ) : (
            "Cooking near you"
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {failed
            ? "Search isn't responding right now."
            : `${total} ${total === 1 ? "dish" : "dishes"}${filters.lat !== null ? ` within ${filters.radiusMiles} mi` : " from verified cooks"}`}
        </p>
      </div>

      <form id={FORM_ID} method="get" action="/browse" className="space-y-3">
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <LocationSearch formId={FORM_ID} defaultValue={filters.locationLabel} />
          <input type="hidden" name="lat" defaultValue={filters.lat ?? ""} />
          <input type="hidden" name="lng" defaultValue={filters.lng ?? ""} />
          <UseMyLocationButton formId={FORM_ID} />

          <div className="relative shrink-0">
            <select
              name="radius"
              defaultValue={filters.radiusMiles}
              className="h-11 pl-3 pr-8 rounded-xl border border-border bg-card text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer font-medium"
            >
              {RADIUS_STEPS.map((mi) => (
                <option key={mi} value={mi}>
                  {mi} mi
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative shrink-0">
            <select
              name="sort"
              defaultValue={filters.sort}
              className="h-11 pl-3 pr-8 rounded-xl border border-border bg-card text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer font-medium"
            >
              <option value="distance">Closest first</option>
              <option value="price">Cheapest first</option>
              <option value="newest">Newest first</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <button type="submit" className={cn(buttonClasses("outline", "h-11 shrink-0 px-3"))}>
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        <details className="group">
          <summary
            className={cn(
              "list-none h-9 px-3 rounded-xl border inline-flex items-center gap-1.5 text-sm transition-colors cursor-pointer w-fit",
              activeFilterCount > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            ) : null}
          </summary>

          <div className="bg-card rounded-xl border border-border p-4 mt-3 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cuisine</p>
              <MultiChipFilter
                name="cuisine"
                options={CUISINES.map((c) => ({ value: c, label: c }))}
                defaultValue={filters.cuisines}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dietary</p>
              <MultiChipFilter name="dietary" options={DIETARY_TAGS} defaultValue={filters.dietary} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pickup window</p>
              <MultiChipFilter name="pickup" options={PICKUP_WINDOW_OPTIONS} defaultValue={filters.pickupWindows} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</p>
                <PillRadio name="price" value={priceValue} options={[{ value: "", label: "Any price" }, ...PRICE_BUCKETS]} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Availability</p>
                <PillRadio
                  name="availability"
                  value={filters.availability ?? ""}
                  options={[{ value: "", label: "Any time" }, ...AVAILABILITY_OPTIONS]}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" className={buttonClasses("primary", "text-sm")}>
                Apply filters
              </button>
              {activeFilterCount > 0 || filters.locationLabel ? (
                <Link href="/browse" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Clear all
                </Link>
              ) : null}
            </div>
          </div>
        </details>
      </form>

      {failed ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm" role="alert">
          Search isn&apos;t responding right now — this isn&apos;t the full list. Try again in a moment.
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="No dishes match"
          body="Try widening the radius or clearing a filter."
          action={
            <Link href="/browse" className={buttonClasses("outline")}>
              Clear filters
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result) => (
            <DishCard key={result.menu_item_id} result={result} photoUrl={photos.get(result.menu_item_id) ?? null} />
          ))}
        </div>
      )}

      <Pagination filters={filters} total={total} />
    </div>
  );
}

function PillRadio({
  name,
  value,
  options,
}: {
  name: string;
  value: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option.value || "any"} className="cursor-pointer">
          <input type="radio" name={name} value={option.value} defaultChecked={option.value === value} className="peer sr-only" />
          <span className="px-3 py-1 rounded-full text-sm border border-border peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-checked:font-medium hover:bg-secondary transition-colors block">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function Pagination({ filters, total }: { filters: DiscoveryFilters; total: number }) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pageCount <= 1) return null;

  const query = new URLSearchParams();
  if (filters.lat !== null) query.set("lat", String(filters.lat));
  if (filters.lng !== null) query.set("lng", String(filters.lng));
  if (filters.locationLabel) query.set("loc", filters.locationLabel);
  query.set("radius", String(filters.radiusMiles));
  if (filters.cuisines.length) query.set("cuisine", filters.cuisines.join(","));
  if (filters.dietary.length) query.set("dietary", filters.dietary.join(","));

  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => {
        const next = new URLSearchParams(query);
        next.set("page", String(page));
        const active = page === filters.page;
        return (
          <Link
            key={page}
            href={`/browse?${next.toString()}`}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground",
            )}
          >
            {page}
          </Link>
        );
      })}
    </div>
  );
}
