import Link from "next/link";

import { attachPhotoUrls, searchDishes } from "@/lib/discovery";
import {
  parseFilters,
  PAGE_SIZE,
  PRICE_BUCKETS,
  AVAILABILITY_OPTIONS,
  type DiscoveryFilters,
  type DishResult,
} from "@/lib/discovery-options";
import { CUISINES, dietaryLabel } from "@/lib/constants/taxonomy";
import { formatDistance, formatPrice } from "@/lib/format";

export const metadata = { title: "Browse · FreshFork" };

export default async function BrowsePage(props: PageProps<"/browse">) {
  const params = await props.searchParams;
  const filters = parseFilters(params);

  const { results, total, failed } = await searchDishes(filters);
  const photos = await attachPhotoUrls(results);

  return (
    <div>
      <h1>Cooking near {filters.locationLabel ?? "your area"}</h1>
      <p>
        {total} {total === 1 ? "dish" : "dishes"}
        {filters.lat !== null ? ` within ${filters.radiusMiles} mi` : " from verified cooks"}
      </p>

      <FilterForm filters={filters} />

      {/* A broken search and an empty one used to render identically, so an
          outage looked like a quiet Tuesday. */}
      {failed ? (
        <p role="alert">
          Search isn&apos;t responding right now — this isn&apos;t the full list.
          Try again in a moment.
        </p>
      ) : total === 0 ? (
        <p>No dishes match — try widening the radius or clearing a filter.</p>
      ) : (
        <ul>
          {results.map((result) => (
            <DishRow key={result.menu_item_id} result={result} photoUrl={photos.get(result.menu_item_id) ?? null} />
          ))}
        </ul>
      )}

      <Pagination filters={filters} total={total} />
    </div>
  );
}

function FilterForm({ filters }: { filters: DiscoveryFilters }) {
  const priceValue = PRICE_BUCKETS.find(
    (b) => b.min === filters.priceMinCents && b.max === filters.priceMaxCents,
  )?.value ?? "";

  return (
    <form method="get" action="/browse">
      <fieldset>
        <legend>Location</legend>
        <label>
          Label <input type="text" name="loc" defaultValue={filters.locationLabel ?? ""} />
        </label>
        <label>
          Latitude <input type="number" step="any" name="lat" defaultValue={filters.lat ?? ""} />
        </label>
        <label>
          Longitude <input type="number" step="any" name="lng" defaultValue={filters.lng ?? ""} />
        </label>
        <label>
          Radius (mi)
          <input type="number" step="0.5" min="0.5" max="25" name="radius" defaultValue={filters.radiusMiles} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Cuisine (comma-separated)</legend>
        <input type="text" name="cuisine" defaultValue={filters.cuisines.join(",")} list="cuisine-options" />
        <datalist id="cuisine-options">
          {CUISINES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </fieldset>

      <fieldset>
        <legend>Dietary (comma-separated)</legend>
        <input type="text" name="dietary" defaultValue={filters.dietary.join(",")} />
      </fieldset>

      <fieldset>
        <legend>Availability</legend>
        <select name="availability" defaultValue={filters.availability ?? ""}>
          <option value="">Any</option>
          {AVAILABILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend>Price</legend>
        <select name="price" defaultValue={priceValue}>
          <option value="">Any</option>
          {PRICE_BUCKETS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend>Pickup window (comma-separated: lunch, dinner, late)</legend>
        <input type="text" name="pickup" defaultValue={filters.pickupWindows.join(",")} />
      </fieldset>

      <fieldset>
        <legend>Sort</legend>
        <select name="sort" defaultValue={filters.sort}>
          <option value="distance">Closest first</option>
          <option value="price">Cheapest first</option>
          <option value="newest">Newest first</option>
        </select>
      </fieldset>

      <button type="submit">Apply filters</button>
      <Link href="/browse">Clear all</Link>
    </form>
  );
}

function DishRow({ result, photoUrl }: { result: DishResult; photoUrl: string | null }) {
  const prep =
    result.prep_note ??
    (result.quantity_available !== null ? `${result.quantity_available} left` : "Made to order");

  return (
    <li>
      <Link href={`/vendor/${result.vendor_handle}`}>
        {result.dish_name} — {result.vendor_name}
      </Link>{" "}
      · {formatPrice(result.price_cents, result.currency)} · {prep}
      {result.distance_m !== null ? ` · ${formatDistance(result.distance_m)}` : ""}
      {result.dietary_tags.length > 0 ? ` · ${result.dietary_tags.map(dietaryLabel).join(", ")}` : ""}
      {photoUrl ? (
        <>
          {" "}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" width={48} height={48} />
        </>
      ) : null}
    </li>
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
    <p>
      Pages:{" "}
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => {
        const next = new URLSearchParams(query);
        next.set("page", String(page));
        return (
          <Link key={page} href={`/browse?${next.toString()}`}>
            {" "}
            {page === filters.page ? `[${page}]` : page}{" "}
          </Link>
        );
      })}
    </p>
  );
}
