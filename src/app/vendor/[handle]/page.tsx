import { notFound } from "next/navigation";

import { SiteNav } from "@/components/marketplace/SiteNav";
import { Pill } from "@/components/marketplace/Pill";
import { getVendorByHandle, publicPhotoUrl, type VendorWithMenu } from "@/lib/vendors-data";
import { formatPrice, formatTime } from "@/lib/format";
import { allergenLabel, dietaryLabel, WEEKDAYS } from "@/lib/constants/taxonomy";
import type { MenuItem } from "@/lib/supabase/database.types";

const DAY_LABELS = new Map(WEEKDAYS.map((d) => [d.value as number, d.label]));

// Vendors are created and approved at runtime, so this page can't be
// enumerated at build time the way the seeded mock data was.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/vendor/[handle]">) {
  const { handle } = await props.params;
  const vendor = await getVendorByHandle(handle);
  return {
    title: vendor ? `${vendor.business_name} · FreshFork` : "Cook not found · FreshFork",
  };
}

export default async function VendorProfilePage(props: PageProps<"/vendor/[handle]">) {
  const { handle } = await props.params;
  const vendor = await getVendorByHandle(handle);
  if (!vendor) notFound();

  const dishes = vendor.menu_items.filter((item) => item.is_available);
  const sections = [...new Set(dishes.map((d) => d.section))];
  const heroUrl = await publicPhotoUrl(vendor.hero_image_path);

  const photos = new Map<string, string | null>();
  await Promise.all(
    dishes.map(async (dish) => {
      photos.set(dish.id, await publicPhotoUrl(dish.photo_path));
    }),
  );

  return (
    <div className="flex flex-col flex-1">
      <SiteNav />
      <VendorHero vendor={vendor} dishCount={dishes.length} heroUrl={heroUrl} />
      <SubNav dishCount={dishes.length} />
      <div className="flex items-start gap-12 px-16 py-12 pb-24">
        <Menu vendor={vendor} sections={sections} dishes={dishes} photos={photos} />
        <SidePanel vendor={vendor} />
      </div>
    </div>
  );
}

function VendorHero({
  vendor,
  dishCount,
  heroUrl,
}: {
  vendor: VendorWithMenu;
  dishCount: number;
  heroUrl: string | null;
}) {
  const nextWindow = vendor.pickup_windows[0];

  return (
    <section className="flex items-start gap-16 px-16 py-12">
      <div
        className="relative h-[500px] w-[420px] shrink-0 overflow-hidden rounded-2xl border border-line"
        style={
          heroUrl
            ? {
                backgroundImage: `url(${heroUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { background: "linear-gradient(180deg, #dba073 0%, #593323 100%)" }
        }
      >
        {vendor.verified_since ? (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-buttermilk/95 py-2.5 pl-3 pr-4">
            <span className="h-2.5 w-2.5 rounded-full bg-persimmon" aria-hidden />
            <span className="text-[11px] font-semibold text-forest">
              Verified cook · since{" "}
              {new Date(vendor.verified_since).getFullYear()}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
          <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
            {(vendor.cuisine ?? "Home cooking").toUpperCase()}
            {vendor.pickup_city ? ` · ${vendor.pickup_city.toUpperCase()}` : ""}
          </span>
        </div>

        <h1 className="font-display text-[60px] font-semibold tracking-[-0.03em] text-forest">
          {vendor.business_name}
        </h1>

        <div className="flex items-center gap-6 text-[13px] text-ink-70">
          <span>
            {dishCount} {dishCount === 1 ? "dish" : "dishes"} on the menu
          </span>
          {vendor.pickup_windows.length > 0 ? (
            <>
              <span className="h-3.5 w-px bg-line" />
              <span>
                {vendor.pickup_windows.length}{" "}
                {vendor.pickup_windows.length === 1 ? "pickup window" : "pickup windows"} a
                week
              </span>
            </>
          ) : null}
        </div>

        {vendor.story ? (
          <p className="font-display text-[19px] italic leading-[1.5] text-ink-70">
            &ldquo;{vendor.story}&rdquo;
          </p>
        ) : null}

        <div className="flex items-center py-2">
          <Fact
            label="CERTIFICATION"
            value={vendor.certification_label ?? "On file"}
            first
          />
          <Fact label="KITCHEN" value={vendor.kitchen_type ?? "Home kitchen"} />
          <Fact label="PICKUP" value={vendor.pickup_address_line ?? "By arrangement"} />
          <Fact
            label="THIS WEEK"
            value={
              nextWindow
                ? `${DAY_LABELS.get(nextWindow.day_of_week)} ${formatTime(
                    nextWindow.start_time,
                  )}–${formatTime(nextWindow.end_time)}`
                : "Ask the cook"
            }
            last
          />
        </div>
      </div>
    </section>
  );
}

function Fact({
  label,
  value,
  first,
  last,
}: {
  label: string;
  value: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 ${first ? "" : "border-l border-line pl-6"} ${
        last ? "" : "pr-6"
      }`}
    >
      <span className="font-mono text-[10px] tracking-[0.14em] text-ink-50">{label}</span>
      <span className="font-display text-[16px] font-semibold tracking-[-0.01em] text-forest">
        {value}
      </span>
    </div>
  );
}

function SubNav({ dishCount }: { dishCount: number }) {
  return (
    <div className="flex items-center gap-8 border-y border-line bg-buttermilk px-16 py-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-forest">Menu</span>
        <span className="font-mono text-[11px] text-ink-50">{dishCount}</span>
      </div>
      <span className="text-sm font-medium text-ink-50">About</span>
      <span className="text-sm font-medium text-ink-50">Kitchen</span>
    </div>
  );
}

function Menu({
  vendor,
  sections,
  dishes,
  photos,
}: {
  vendor: VendorWithMenu;
  sections: string[];
  dishes: MenuItem[];
  photos: Map<string, string | null>;
}) {
  if (dishes.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center text-[15px] text-ink-70">
          {vendor.business_name} hasn&apos;t posted any dishes yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-12">
      {sections.map((section, i) => (
        <div key={section} className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] tracking-[0.2em] text-persimmon">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="h-px w-6 bg-forest" aria-hidden />
            <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-forest">
              {section}
            </h2>
          </div>
          <div className="border-t border-line">
            {dishes
              .filter((dish) => dish.section === section)
              .map((dish) => (
                <MenuRow key={dish.id} dish={dish} photoUrl={photos.get(dish.id) ?? null} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuRow({ dish, photoUrl }: { dish: MenuItem; photoUrl: string | null }) {
  return (
    <div className="flex items-start gap-6 border-b border-line py-6">
      <div
        className="h-[132px] w-[168px] shrink-0 rounded-xl border border-line bg-straw-soft"
        style={
          photoUrl
            ? {
                backgroundImage: `url(${photoUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-display text-[20px] font-semibold tracking-[-0.01em] text-forest">
              {dish.name}
            </span>
            <span className="font-mono text-[11px] tracking-[0.1em] text-ink-50">
              {dish.prep_note ??
                (dish.quantity_available !== null
                  ? `${dish.quantity_available} LEFT`
                  : "MADE TO ORDER")}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[20px] font-medium text-forest">
              {formatPrice(dish.price_cents)}
            </span>
            <span className="text-[11px] text-ink-50">per serving</span>
          </div>
        </div>

        {dish.description ? (
          <p className="text-sm leading-[1.5] text-ink-70">{dish.description}</p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {dish.dietary_tags.map((tag) => (
              <Pill key={tag} tone="ghost" className="text-[10px] px-2 py-1">
                {dietaryLabel(tag)}
              </Pill>
            ))}
            {dish.allergens.length > 0 ? (
              <Pill tone="outline" className="text-[10px] px-2 py-1">
                Contains {dish.allergens.map(allergenLabel).join(", ").toLowerCase()}
              </Pill>
            ) : null}
          </div>
          <button
            type="button"
            disabled
            title="Ordering arrives in a later phase"
            className="rounded-full bg-forest px-4 py-2.5 text-xs font-semibold text-buttermilk opacity-50"
          >
            + Add to order
          </button>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ vendor }: { vendor: VendorWithMenu }) {
  const firstName = vendor.business_name.split(" ")[0];

  return (
    <aside className="flex w-[340px] shrink-0 flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-6">
        <span className="font-display text-[20px] font-semibold tracking-[-0.01em] text-forest">
          Pickup windows
        </span>
        {vendor.pickup_windows.length === 0 ? (
          <p className="text-[13px] text-ink-70">
            This cook hasn&apos;t published pickup times yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {vendor.pickup_windows.map((window) => (
              <Pill key={window.id} tone="outline" className="text-[11px] px-2.5 py-1.5">
                {DAY_LABELS.get(window.day_of_week)} {formatTime(window.start_time)}–
                {formatTime(window.end_time)}
              </Pill>
            ))}
          </div>
        )}

        <div className="border-t border-line" />

        <p className="text-[13px] leading-[1.5] text-ink-50">
          Ordering and checkout arrive in the next phase. For now, browse the menu
          and see when {firstName} is cooking.
        </p>

        <button
          type="button"
          disabled
          className="mt-1 w-full rounded-full bg-persimmon py-3.5 text-sm font-semibold text-buttermilk opacity-50"
        >
          Continue to checkout →
        </button>
      </div>

      <div className="flex flex-col gap-3.5 rounded-2xl bg-forest p-6 text-buttermilk">
        <span className="font-display text-[17px] font-semibold tracking-[-0.01em]">
          Why {firstName} is verified
        </span>
        <TrustCheck
          label={vendor.certification_label ?? "Food-handler certification"}
          sub={
            vendor.cert_expires_on
              ? `cert on file, expires ${new Date(vendor.cert_expires_on).getFullYear()}`
              : "cert on file, reviewed by our team"
          }
        />
        <TrustCheck
          label="Reviewed by a person"
          sub={
            vendor.reviewed_at
              ? `approved ${new Date(vendor.reviewed_at).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}`
              : "paperwork read before going live"
          }
        />
        <TrustCheck
          label="Payouts verified"
          sub="identity and bank details checked by Stripe"
        />
        <TrustCheck label="12% platform fee" sub="set aside from your total" />
      </div>
    </aside>
  );
}

function TrustCheck({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-persimmon" aria-hidden />
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-xs">{sub}</span>
      </div>
    </div>
  );
}
