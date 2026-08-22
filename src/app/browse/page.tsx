import Link from "next/link";
import { SiteNav } from "@/components/marketplace/SiteNav";
import { Pill } from "@/components/marketplace/Pill";

type BrowseDish = {
  name: string;
  cook: string;
  distance: string;
  price: string;
  tags: string[];
  prep: string;
  gradient: string;
  href?: string;
};

const DISHES: BrowseDish[] = [
  {
    name: "Doro Wat + Injera",
    cook: "Amina T.",
    distance: "0.6 mi",
    price: "$16",
    tags: ["GF"],
    prep: "4 LEFT · 6 PM",
    gradient: "linear-gradient(180deg, #d97148 0%, #6b2c1e 100%)",
    href: "/vendor/amina-tesfaye",
  },
  {
    name: "Mapo Tofu bowl",
    cook: "Wei L.",
    distance: "0.9 mi",
    price: "$14",
    tags: ["Vegetarian option"],
    prep: "7 LEFT · 7 PM",
    gradient: "linear-gradient(180deg, #c76633 0%, #4d221e 100%)",
  },
  {
    name: "Mole Coloradito",
    cook: "Rosa M.",
    distance: "1.2 mi",
    price: "$18",
    tags: ["DF", "Nut-free"],
    prep: "ORDER BY 3 PM",
    gradient: "linear-gradient(180deg, #9e5938 0%, #47241a 100%)",
  },
  {
    name: "Sesame Bagels x6",
    cook: "Jonah B.",
    distance: "0.4 mi",
    price: "$12",
    tags: ["Vegan"],
    prep: "SAT 9–11",
    gradient: "linear-gradient(180deg, #e6c78c 0%, #8c6b3d 100%)",
  },
  {
    name: "Adobo + Rice",
    cook: "Marisol V.",
    distance: "1.4 mi",
    price: "$15",
    tags: ["GF"],
    prep: "9 LEFT · 6 PM",
    gradient: "linear-gradient(180deg, #b88c59 0%, #593823 100%)",
  },
  {
    name: "Khinkali (dozen)",
    cook: "Nino K.",
    distance: "1.8 mi",
    price: "$22",
    tags: ["Pork"],
    prep: "2 LEFT · 7 PM",
    gradient: "linear-gradient(180deg, #d9b884 0%, #735933 100%)",
  },
  {
    name: "Sourdough loaf",
    cook: "Jonah B.",
    distance: "0.4 mi",
    price: "$9",
    tags: ["Vegan"],
    prep: "SUN 8–10",
    gradient: "linear-gradient(180deg, #e0b87a 0%, #805c33 100%)",
  },
  {
    name: "Butter Chicken",
    cook: "Priya R.",
    distance: "1.0 mi",
    price: "$17",
    tags: ["GF"],
    prep: "12 LEFT · 6 PM",
    gradient: "linear-gradient(180deg, #d17039 0%, #612c1a 100%)",
  },
  {
    name: "Pupusas (4)",
    cook: "Elena G.",
    distance: "0.7 mi",
    price: "$11",
    tags: ["Vegetarian option", "GF"],
    prep: "8 LEFT · 5 PM",
    gradient: "linear-gradient(180deg, #c7a66b 0%, #735129 100%)",
  },
];

const FILTER_GROUPS: {
  title: string;
  headRight?: string;
  options: [string, boolean, number][];
}[] = [
  {
    title: "Availability",
    headRight: "1 ON",
    options: [
      ["Ready today", true, 24],
      ["Ready this week", false, 86],
      ["Preorder open", false, 12],
    ],
  },
  {
    title: "Cuisine",
    headRight: "8 OF 48",
    options: [
      ["Ethiopian", false, 8],
      ["Sichuan", false, 11],
      ["Oaxacan", false, 6],
      ["Filipino", false, 5],
      ["Neapolitan", false, 7],
      ["Bengali", false, 4],
      ["Levantine", false, 9],
      ["Georgian", false, 3],
    ],
  },
  {
    title: "Dietary",
    options: [
      ["Vegetarian option", true, 42],
      ["Vegan", false, 18],
      ["Gluten-free", false, 26],
      ["Halal", false, 14],
      ["Kosher", false, 6],
    ],
  },
  {
    title: "Price",
    options: [
      ["Under $10", false, 9],
      ["$10–$15", false, 34],
      ["$15–$25", true, 31],
      ["$25+", false, 12],
    ],
  },
  {
    title: "Pickup window",
    options: [
      ["Lunch (11–2)", false, 18],
      ["Dinner (5–8)", true, 52],
      ["Late (8–10)", false, 7],
    ],
  },
];

const ACTIVE_FILTERS = ["3 mi radius", "Ready today", "Under $20", "Vegetarian option"];

export default function BrowsePage() {
  return (
    <div className="flex flex-col flex-1">
      <SiteNav />
      <PageHead />
      <div className="border-b border-line" />
      <div className="flex items-start gap-12 px-16 py-8 pb-24">
        <FilterRail />
        <Results />
      </div>
    </div>
  );
}

function PageHead() {
  return (
    <div className="flex flex-col gap-6 px-16 pt-12 pb-6">
      <div className="flex items-center gap-2 text-xs">
        <Link href="/" className="text-ink-50">
          Discover
        </Link>
        <span className="text-ink-50">/</span>
        <span className="font-medium text-forest">Browse near Brooklyn, NY</span>
      </div>

      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[44px] font-semibold tracking-[-0.03em] text-forest">
            Cooking near you
          </h1>
          <p className="text-sm text-ink-70">
            86 dishes · 32 verified cooks · updated 4 min ago
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2.5">
            <span className="text-xs text-ink-50">Sort</span>
            <span className="text-sm font-medium text-forest">Closest first ⌄</span>
          </div>
          <div className="flex items-center gap-0 rounded-full border border-line bg-card p-1">
            <Pill tone="solid">Grid</Pill>
            <span className="px-4 py-2 text-xs font-medium text-forest">Map</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {ACTIVE_FILTERS.map((f) => (
          <Pill key={f} tone="solid">
            {f} ×
          </Pill>
        ))}
        <button type="button" className="text-xs font-medium text-persimmon">
          Clear all
        </button>
      </div>
    </div>
  );
}

function FilterRail() {
  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-8">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-forest">
            Distance
          </span>
          <span className="font-mono text-[11px] tracking-[0.08em] text-persimmon">
            3 MI
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-line" />
        <div className="flex justify-between font-mono text-[10px] text-ink-50">
          {["0.5", "1", "2", "3", "5", "10 mi"].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
      </div>

      {FILTER_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-forest">
              {group.title}
            </span>
            {group.headRight && (
              <span className="font-mono text-[11px] tracking-[0.08em] text-ink-50">
                {group.headRight}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            {group.options.map(([label, checked, count]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-3.5 w-3.5 rounded-[3px] border ${
                      checked ? "border-forest bg-forest" : "border-line bg-buttermilk"
                    }`}
                    aria-hidden
                  />
                  <span
                    className={`text-[13px] ${checked ? "font-medium" : ""} text-forest`}
                  >
                    {label}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-ink-50">{count}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function Results() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-forest">
          Showing {DISHES.length} of 86 · Within 3 mi
        </span>
        <div className="flex items-center gap-2 rounded-full border border-line bg-card py-2 pl-3 pr-4">
          <span className="h-2.5 w-2.5 rounded-full bg-persimmon" aria-hidden />
          <span className="text-xs font-medium text-forest">Open map view</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {DISHES.map((dish) => (
          <DishCard key={dish.name} dish={dish} />
        ))}
      </div>

      <div className="flex justify-center gap-3 pt-4">
        {["1", "2", "3", "4", "→"].map((p, i) => (
          <Pill key={p} tone={i === 0 ? "solid" : "outline"}>
            {p}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function DishCard({ dish }: { dish: BrowseDish }) {
  const card = (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-card p-4.5">
      <div
        className="relative h-[200px] w-full overflow-hidden rounded-xl"
        style={{ background: dish.gradient }}
      >
        <div className="absolute left-3 top-[166px] flex items-center gap-1.5 rounded-full bg-forest/90 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
          <span className="font-mono text-[10px] tracking-[0.1em] text-buttermilk">
            {dish.prep}
          </span>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[18px] font-semibold tracking-[-0.01em] text-forest">
            {dish.name}
          </span>
          <span className="text-xs text-ink-70">
            {dish.cook} · {dish.distance}
          </span>
        </div>
        <span className="font-mono text-[15px] font-medium text-forest">
          {dish.price}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {dish.tags.map((tag) => (
          <Pill key={tag} tone="ghost" className="text-[10px] px-2 py-1">
            {tag}
          </Pill>
        ))}
      </div>
    </div>
  );

  return dish.href ? (
    <Link href={dish.href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
