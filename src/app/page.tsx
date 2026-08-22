import Link from "next/link";

import { SiteNav } from "@/components/marketplace/SiteNav";
import { Pill } from "@/components/marketplace/Pill";
import { HeroSearch } from "@/components/marketplace/HeroSearch";
import { attachPhotoUrls, getDiscoveryStats, searchDishes } from "@/lib/discovery";
import { dietaryLabel } from "@/lib/constants/taxonomy";
import { formatDistance, formatPrice } from "@/lib/format";
import { features } from "@/lib/env";

type Stats = { vendors: number; dishes: number; cuisines: number };

export default async function Home(props: PageProps<"/">) {
  const params = await props.searchParams;
  const rawLat = typeof params.lat === "string" ? Number.parseFloat(params.lat) : NaN;
  const rawLng = typeof params.lng === "string" ? Number.parseFloat(params.lng) : NaN;
  const hasLocation = Number.isFinite(rawLat) && Number.isFinite(rawLng);
  const lat = hasLocation ? rawLat : null;
  const lng = hasLocation ? rawLng : null;

  const stats = await getDiscoveryStats(lat, lng);

  return (
    <div className="flex flex-col flex-1">
      <SiteNav />
      <UtilityStrip stats={stats} hasLocation={hasLocation} />
      <Hero stats={stats} />
      <NearYou lat={lat} lng={lng} />
      <TrustStrip />
      <Footer />
    </div>
  );
}

function UtilityStrip({ stats, hasLocation }: { stats: Stats; hasLocation: boolean }) {
  const week = new Date()
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();

  return (
    <div className="flex items-center gap-4 bg-forest px-16 py-3 text-buttermilk">
      <div className="flex flex-1 items-center gap-3">
        <span className="font-mono text-[11px] tracking-[0.12em]">WEEK OF {week}</span>
        <span className="h-3 w-px bg-buttermilk/35" aria-hidden />
        <span className="text-[13px]">
          {stats.vendors === 0
            ? "The first cooks in your neighborhood are being verified now"
            : `${stats.vendors} verified ${stats.vendors === 1 ? "cook" : "cooks"}${
                hasLocation ? " within 3 mi" : " on FreshFork"
              }`}
        </span>
      </div>
      <Link href="/browse" className="text-xs font-medium">
        Pickup only · See what your neighbors are cooking →
      </Link>
    </div>
  );
}

function Hero({ stats }: { stats: Stats }) {
  return (
    <section className="flex items-start gap-16 px-16 py-24">
      <div className="flex flex-1 flex-col gap-7">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
          <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
            A LOCAL FOOD MARKETPLACE
          </span>
        </div>
        <h1 className="font-display text-[80px] font-semibold leading-[1.02] tracking-[-0.02em] text-forest">
          Dinner from the house
          <br />
          three doors down.
        </h1>
        <p className="max-w-xl text-[17px] leading-[1.55] text-ink-70">
          FreshFork connects you with verified home cooks in your neighborhood.
          Order for pickup, meet the person who made it, eat something honest.
        </p>

        <HeroSearch mapboxReady={features.mapbox} />

        <div className="flex items-center gap-10 pt-2">
          <Stat num={String(stats.vendors)} label="Verified cooks" />
          <Stat num={String(stats.dishes)} label="Dishes listed" />
          <Stat num={String(stats.cuisines)} label="Cuisines" />
        </div>
      </div>
      <div className="flex flex-col items-end -space-y-12">
        <FeatureCard size="lg" />
        <FeatureCard size="sm" />
      </div>
    </section>
  );
}

/** A live strip of what is actually cookable right now. */
async function NearYou({ lat, lng }: { lat: number | null; lng: number | null }) {
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

  // Nothing live yet — the landing page reads better without an empty shelf.
  if (results.length === 0) return null;

  const photos = await attachPhotoUrls(results);

  return (
    <section className="flex flex-col gap-8 border-t border-line px-16 py-20">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
            <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
              {lat === null ? "NEWLY LISTED" : "COOKING NEAR YOU"}
            </span>
          </div>
          <h2 className="font-display text-[36px] font-semibold tracking-[-0.02em] text-forest">
            On the stove right now
          </h2>
        </div>
        <Link href="/browse" className="text-sm font-medium text-forest underline">
          See everything →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {results.map((result) => {
          const photoUrl = photos.get(result.menu_item_id) ?? null;
          return (
            <Link key={result.menu_item_id} href={`/vendor/${result.vendor_handle}`}>
              <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-card p-4.5">
                <div
                  className="h-[200px] w-full overflow-hidden rounded-xl bg-straw-soft"
                  style={
                    photoUrl
                      ? {
                          backgroundImage: `url(${photoUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background:
                            "linear-gradient(180deg, #d97148 0%, #6b2c1e 100%)",
                        }
                  }
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-display text-[18px] font-semibold tracking-[-0.01em] text-forest">
                      {result.dish_name}
                    </span>
                    <span className="text-xs text-ink-70">
                      {result.vendor_name}
                      {result.distance_m !== null
                        ? ` · ${formatDistance(result.distance_m)}`
                        : ""}
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
        })}
      </div>
    </section>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[28px] tracking-tight text-forest">{num}</span>
      <span className="text-xs text-ink-50">{label}</span>
    </div>
  );
}

function FeatureCard({ size }: { size: "lg" | "sm" }) {
  if (size === "lg") {
    return (
      <div
        className="relative h-[600px] w-[500px] overflow-hidden rounded-2xl border border-line"
        style={{
          background: "linear-gradient(180deg, #dba073 0%, #593323 100%)",
        }}
      >
        <div className="absolute inset-x-6 bottom-5 flex items-center gap-3.5 rounded-xl bg-card/95 px-5 py-4">
          <div className="h-11 w-11 rounded-full bg-persimmon" aria-hidden />
          <div className="flex flex-1 flex-col">
            <span className="font-display text-[17px] font-semibold text-forest">
              Every dish has a face
            </span>
            <span className="text-xs text-ink-50">
              Verified cooks · pickup only · no couriers
            </span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="h-[300px] w-[240px] rounded-2xl border border-line"
      style={{
        background: "linear-gradient(135deg, #efd88c 0%, #8ea56b 100%)",
      }}
    />
  );
}

function TrustStrip() {
  return (
    <section className="flex items-start gap-12 bg-forest px-16 py-24 text-buttermilk">
      <div className="flex flex-1 flex-col gap-3">
        <h2 className="font-display text-[40px] italic leading-[1.1] tracking-tight">
          Every cook is real.
          <br />
          Every kitchen is checked.
        </h2>
        <p className="text-[15px] leading-[1.5]">
          Verification is manual. We look at the permit, the certification, and
          the kitchen photos before a cook can list a single dish.
        </p>
      </div>
      <div className="flex flex-1 gap-8">
        <TrustCol
          num="01"
          title="Food-handler cert"
          body="Uploaded, checked, and displayed on every profile."
        />
        <TrustCol
          num="02"
          title="Allergens labeled"
          body="Structured — never buried in the description."
        />
        <TrustCol
          num="03"
          title="Verified badge"
          body="Only after our team reviews the paperwork."
        />
      </div>
    </section>
  );
}

function TrustCol({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col gap-3.5">
      <span className="font-mono text-[11px] tracking-[0.2em] text-persimmon">{num}</span>
      <h3 className="font-display text-[20px] font-semibold tracking-tight">{title}</h3>
      <p className="text-[13px] leading-[1.55]">{body}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="flex items-center justify-between gap-6 bg-buttermilk px-16 py-8 text-xs text-ink-70">
      <span className="font-medium">FreshFork · Brooklyn, NY</span>
      <span>For cooks · Food safety · Terms · Privacy · Get the app</span>
    </footer>
  );
}
