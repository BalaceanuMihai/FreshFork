import Link from "next/link";

import { attachPhotoUrls, getDiscoveryStats, searchDishes } from "@/lib/discovery";
import { dietaryLabel } from "@/lib/constants/taxonomy";
import { formatDistance, formatPrice } from "@/lib/format";

export default async function Home(props: PageProps<"/">) {
  const params = await props.searchParams;
  const rawLat = typeof params.lat === "string" ? Number.parseFloat(params.lat) : NaN;
  const rawLng = typeof params.lng === "string" ? Number.parseFloat(params.lng) : NaN;
  const hasLocation = Number.isFinite(rawLat) && Number.isFinite(rawLng);
  const lat = hasLocation ? rawLat : null;
  const lng = hasLocation ? rawLng : null;

  const stats = await getDiscoveryStats(lat, lng);

  const { results } = await searchDishes(
    {
      lat,
      lng,
      locationLabel: null,
      radiusMiles: 3,
      cuisines: [],
      dietary: [],
      priceMinCents: null,
      priceMaxCents: null,
      availability: null,
      pickupWindows: [],
      sort: lat === null ? "newest" : "distance",
      view: "grid",
      page: 1,
    },
    3,
  );
  const photos = await attachPhotoUrls(results);

  return (
    <div>
      <h1>Dinner from the house three doors down.</h1>
      <p>
        FreshFork connects you with verified home cooks in your neighborhood. Order for
        pickup, meet the person who made it, eat something honest.
      </p>
      <p>
        <Link href="/browse">Find cooks →</Link>
      </p>

      <p>
        {stats.vendors} verified {stats.vendors === 1 ? "cook" : "cooks"} ·{" "}
        {stats.dishes} {stats.dishes === 1 ? "dish" : "dishes"} listed · {stats.cuisines}{" "}
        {stats.cuisines === 1 ? "cuisine" : "cuisines"}
      </p>

      {results.length > 0 ? (
        <>
          <h2>{lat === null ? "Newly listed" : "Cooking near you"}</h2>
          <ul>
            {results.map((result) => (
              <li key={result.menu_item_id}>
                <Link href={`/vendor/${result.vendor_handle}`}>
                  {result.dish_name} — {result.vendor_name}
                </Link>{" "}
                · {formatPrice(result.price_cents, result.currency)}
                {result.distance_m !== null ? ` · ${formatDistance(result.distance_m)}` : ""}
                {result.dietary_tags.length > 0
                  ? ` · ${result.dietary_tags.map(dietaryLabel).join(", ")}`
                  : ""}
                {photos.get(result.menu_item_id) ? (
                  <>
                    {" "}
                    ·{" "}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photos.get(result.menu_item_id)!} alt="" width={40} height={40} />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2>Every cook is real. Every kitchen is checked.</h2>
      <p>
        Verification is manual. We look at the permit, the certification, and the
        kitchen photos before a cook can list a single dish.
      </p>
      <ul>
        <li>Food-handler cert — uploaded, checked, and displayed on every profile.</li>
        <li>Allergens labeled — structured, never buried in the description.</li>
        <li>Verified badge — only after our team reviews the paperwork.</li>
      </ul>

      <hr />
      <p>FreshFork · Brooklyn, NY</p>
    </div>
  );
}
