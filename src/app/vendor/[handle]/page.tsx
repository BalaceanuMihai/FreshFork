import { notFound } from "next/navigation";
import { Nav } from "@/components/marketplace/Nav";
import { Pill } from "@/components/marketplace/Pill";
import { getVendor, vendors, type Dish } from "@/lib/vendors";

export function generateStaticParams() {
  return Object.keys(vendors).map((handle) => ({ handle }));
}

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const vendor = getVendor(handle);
  if (!vendor) notFound();

  const dishCount = vendor.menu.reduce((n, s) => n + s.dishes.length, 0);

  return (
    <div className="flex flex-col flex-1">
      <Nav />
      <VendorHero vendor={vendor} dishCount={dishCount} />
      <SubNav dishCount={dishCount} reviewCount={vendor.reviewCount} />
      <div className="flex items-start gap-12 px-16 py-12 pb-24">
        <Menu vendor={vendor} />
        <SidePanel vendor={vendor} />
      </div>
    </div>
  );
}

function VendorHero({
  vendor,
  dishCount,
}: {
  vendor: NonNullable<ReturnType<typeof getVendor>>;
  dishCount: number;
}) {
  return (
    <section className="flex items-start gap-16 px-16 py-12">
      <div
        className="relative h-[500px] w-[420px] shrink-0 overflow-hidden rounded-2xl border border-line"
        style={{ background: vendor.gradient }}
      >
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-buttermilk/95 py-2.5 pl-3 pr-4">
          <span className="h-2.5 w-2.5 rounded-full bg-persimmon" aria-hidden />
          <span className="text-[11px] font-semibold text-forest">
            Verified cook · since {vendor.verifiedSince}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
          <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
            {vendor.cuisine.toUpperCase()} · {vendor.neighborhood.toUpperCase()}
          </span>
        </div>

        <h1 className="font-display text-[60px] font-semibold tracking-[-0.03em] text-forest">
          {vendor.name}
        </h1>

        <div className="flex items-center gap-6 text-[13px] text-ink-70">
          <span className="flex items-center gap-2">
            <StarIcon />
            <span className="font-display text-[17px] text-forest">{vendor.rating}</span>
            <span className="text-ink-50">({vendor.reviewCount} reviews)</span>
          </span>
          <span className="h-3.5 w-px bg-line" />
          <span>Cooking since {vendor.cookingSince}</span>
          <span className="h-3.5 w-px bg-line" />
          <span>{vendor.dishesServed} dishes served</span>
        </div>

        <p className="font-display text-[19px] italic leading-[1.5] text-ink-70">
          &ldquo;{vendor.story}&rdquo;
        </p>

        <div className="flex items-center py-2">
          <Fact label="CERTIFICATION" value={vendor.certification} first />
          <Fact label="KITCHEN" value={vendor.kitchen} />
          <Fact label="PICKUP" value={vendor.pickupAddress} />
          <Fact label="THIS WEEK" value={vendor.hours} last />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-buttermilk"
          >
            See menu ({dishCount} dishes)
          </button>
          <button
            type="button"
            className="rounded-full border border-forest px-5 py-3.5 text-sm font-medium text-forest"
          >
            Follow cook
          </button>
          <button
            type="button"
            className="rounded-full border border-forest px-5 py-3.5 text-sm font-medium text-forest"
          >
            Message
          </button>
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

function SubNav({
  dishCount,
  reviewCount,
}: {
  dishCount: number;
  reviewCount: number;
}) {
  const tabs: [string, boolean, number | null][] = [
    ["Menu", true, dishCount],
    ["About", false, null],
    ["Reviews", false, reviewCount],
    ["Kitchen", false, null],
  ];
  return (
    <div className="flex items-center gap-8 border-y border-line bg-buttermilk px-16 py-4">
      {tabs.map(([label, active, count]) => (
        <div key={label} className="flex items-center gap-2">
          <span className={`text-sm ${active ? "font-semibold" : "font-medium"} text-forest`}>
            {label}
          </span>
          {count !== null && (
            <span className="font-mono text-[11px] text-ink-50">{count}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function Menu({ vendor }: { vendor: NonNullable<ReturnType<typeof getVendor>> }) {
  return (
    <div className="flex flex-1 flex-col gap-12">
      {vendor.menu.map((section, i) => (
        <div key={section.section} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] tracking-[0.2em] text-persimmon">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="h-px w-6 bg-forest" aria-hidden />
              <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-forest">
                {section.section}
              </h2>
            </div>
            <p className="text-sm text-ink-70">{section.note}</p>
          </div>
          <div className="border-t border-line">
            {section.dishes.map((dish) => (
              <MenuItem key={dish.slug} dish={dish} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuItem({ dish }: { dish: Dish }) {
  return (
    <div className="flex items-start gap-6 border-b border-line py-6">
      <div
        className="h-[132px] w-[168px] shrink-0 rounded-xl"
        style={{ background: dish.gradient }}
      />
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-display text-[20px] font-semibold tracking-[-0.01em] text-forest">
              {dish.name}
            </span>
            <span className="font-mono text-[11px] tracking-[0.1em] text-ink-50">
              {dish.prep}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[20px] font-medium text-forest">
              {dish.price}
            </span>
            <span className="text-[11px] text-ink-50">per serving</span>
          </div>
        </div>
        <p className="text-sm leading-[1.5] text-ink-70">{dish.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {dish.tags.map((tag) => (
              <Pill key={tag} tone="ghost" className="text-[10px] px-2 py-1">
                {tag}
              </Pill>
            ))}
          </div>
          <button
            type="button"
            className="rounded-full bg-forest px-4 py-2.5 text-xs font-semibold text-buttermilk"
          >
            + Add to order
          </button>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ vendor }: { vendor: NonNullable<ReturnType<typeof getVendor>> }) {
  return (
    <aside className="flex w-[340px] shrink-0 flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-6">
        <span className="font-display text-[20px] font-semibold tracking-[-0.01em] text-forest">
          Your order
        </span>
        <CartRow name="Doro Wat + Injera" qty={1} price="$16" />
        <CartRow name="Yemisir Wot" qty={2} price="$24" />
        <CartRow name="Injera roll x6" qty={1} price="$8" />
        <div className="border-t border-line" />
        <TotalRow label="Subtotal" value="$48" />
        <TotalRow label="FreshFork fee (12%)" value="$5.76" />
        <TotalRow label="Total" value="$53.76" strong />

        <div className="flex flex-col gap-2.5 pt-3">
          <span className="font-mono text-[10px] tracking-[0.16em] text-ink-50">
            PICKUP WINDOW
          </span>
          <div className="flex flex-wrap gap-2">
            <Pill tone="solid" className="text-[11px] px-2.5 py-1.5">
              Tonight 6–7 pm
            </Pill>
            <Pill tone="outline" className="text-[11px] px-2.5 py-1.5">
              7–8 pm
            </Pill>
            <Pill tone="outline" className="text-[11px] px-2.5 py-1.5">
              Tue 6–7
            </Pill>
          </div>
        </div>

        <button
          type="button"
          className="mt-1 w-full rounded-full bg-persimmon py-3.5 text-sm font-semibold text-buttermilk"
        >
          Continue to checkout →
        </button>
      </div>

      <div className="flex flex-col gap-3.5 rounded-2xl bg-forest p-6 text-buttermilk">
        <span className="font-display text-[17px] font-semibold tracking-[-0.01em]">
          Why {vendor.name.split(" ")[0]} is verified
        </span>
        <TrustCheck label="NYC Food Handler" sub="cert on file, expires 2027" />
        <TrustCheck label="Kitchen inspection" sub="photos reviewed Feb 2026" />
        <TrustCheck label="ID confirmed" sub="gov ID matched to profile" />
        <TrustCheck label="12% platform fee" sub="set aside from your total" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-[17px] font-semibold tracking-[-0.01em] text-forest">
            Recent reviews
          </span>
          <span className="text-xs font-medium text-forest">
            See all {vendor.reviewCount} →
          </span>
        </div>
        {vendor.reviews.map((review, i) => (
          <div key={review.name}>
            {i > 0 && <div className="mb-4 border-t border-line" />}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-sage" aria-hidden />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-forest">
                      {review.name}
                    </span>
                    <span className="text-[10px] text-ink-50">{review.when}</span>
                  </div>
                </div>
                <span className="flex items-center gap-1">
                  <StarIcon small />
                  <span className="font-mono text-[11px] text-forest">
                    {review.rating}
                  </span>
                </span>
              </div>
              <p className="text-[13px] leading-[1.5] text-ink-70">
                &ldquo;{review.text}&rdquo;
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function CartRow({ name, qty, price }: { name: string; qty: number; price: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[13px] font-medium text-persimmon">{qty}×</span>
        <span className="text-[13px] font-medium text-forest">{name}</span>
      </div>
      <span className="font-mono text-[13px] text-forest">{price}</span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${strong ? "font-semibold text-forest" : "text-ink-70"}`}>
        {label}
      </span>
      <span
        className={`font-mono text-forest ${strong ? "text-[15px] font-medium" : "text-[13px]"}`}
      >
        {value}
      </span>
    </div>
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

function StarIcon({ small }: { small?: boolean }) {
  return (
    <svg
      width={small ? 10 : 14}
      height={small ? 10 : 14}
      viewBox="0 0 20 20"
      fill="var(--color-persimmon)"
      aria-hidden
    >
      <path d="M10 0l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7L3.8 19l1.6-7L0 7.3l7.1-.7z" />
    </svg>
  );
}
