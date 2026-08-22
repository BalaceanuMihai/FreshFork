import { Nav } from "@/components/marketplace/Nav";
import { Pill } from "@/components/marketplace/Pill";

const TIMELINE: { label: string; time: string; state: "done" | "active" | "pending" }[] = [
  { label: "Placed", time: "4:12 PM", state: "done" },
  { label: "Accepted", time: "4:14 PM", state: "done" },
  { label: "Preparing", time: "NOW", state: "active" },
  { label: "Ready", time: "~6:30 PM", state: "pending" },
  { label: "Picked up", time: "—", state: "pending" },
];

const PAST_ORDERS = [
  {
    date: "SEP 18",
    vendor: "Wei L.",
    dish: "1× Mapo Tofu bowl · 2× Cucumber salad",
    total: "$28.00",
    rating: "5.0",
    gradient: "linear-gradient(180deg, #c76633 0%, #4d221e 100%)",
    reviewCta: true,
  },
  {
    date: "SEP 14",
    vendor: "Jonah B.",
    dish: "1× Sesame bagels (x6)",
    total: "$13.44",
    rating: "4.8",
    gradient: "linear-gradient(180deg, #e6c78c 0%, #8c6b3d 100%)",
    reviewCta: false,
  },
  {
    date: "SEP 09",
    vendor: "Rosa M.",
    dish: "1× Mole Coloradito · 1× Rice",
    total: "$22.40",
    rating: "5.0",
    gradient: "linear-gradient(180deg, #9e5938 0%, #47241a 100%)",
    reviewCta: false,
  },
  {
    date: "SEP 03",
    vendor: "Amina T.",
    dish: "2× Doro Wat + Injera",
    total: "$35.84",
    rating: "5.0",
    gradient: "linear-gradient(180deg, #d9a06a 0%, #522e24 100%)",
    reviewCta: true,
  },
  {
    date: "AUG 27",
    vendor: "Marisol V.",
    dish: "1× Adobo + Garlic Rice",
    total: "$16.80",
    rating: "4.9",
    gradient: "linear-gradient(180deg, #b88c59 0%, #593823 100%)",
    reviewCta: false,
  },
];

const FAVOURITES = [
  { name: "Amina T.", cuisine: "Ethiopian", orders: 6, gradient: "linear-gradient(180deg, #d9a06a 0%, #522e24 100%)" },
  { name: "Wei L.", cuisine: "Sichuan", orders: 4, gradient: "linear-gradient(180deg, #c76633 0%, #4d221e 100%)" },
  { name: "Jonah B.", cuisine: "Bagel micro-bakery", orders: 3, gradient: "linear-gradient(180deg, #e6c78c 0%, #8c6b3d 100%)" },
  { name: "Rosa M.", cuisine: "Oaxacan", orders: 2, gradient: "linear-gradient(180deg, #9e5938 0%, #47241a 100%)" },
];

export default function OrdersPage() {
  return (
    <div className="flex flex-col flex-1">
      <Nav variant="account" />
      <PageHead />
      <div className="flex items-start gap-12 px-16 pb-24">
        <OrdersList />
        <SidePanel />
      </div>
    </div>
  );
}

function PageHead() {
  return (
    <div className="flex flex-col gap-6 px-16 pt-12 pb-6">
      <h1 className="font-display text-[44px] font-semibold tracking-[-0.03em] text-forest">
        Your orders
      </h1>
      <div className="inline-flex w-fit items-center gap-1 rounded-full border border-line bg-card p-1">
        <Pill tone="solid" className="py-2.5">
          Active · 1
        </Pill>
        <span className="px-5 py-2.5 text-[13px] font-medium text-forest">Past · 12</span>
        <span className="px-5 py-2.5 text-[13px] font-medium text-forest">
          Reviews to leave · 2
        </span>
      </div>
    </div>
  );
}

function OrdersList() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <ActiveOrder />
      <PastOrdersHead />
      {PAST_ORDERS.map((order) => (
        <PastOrderRow key={order.date + order.vendor} order={order} />
      ))}
    </div>
  );
}

function ActiveOrder() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex items-center justify-between bg-forest px-6 py-3.5 text-buttermilk">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-persimmon" aria-hidden />
          <span className="font-mono text-[11px] tracking-[0.2em]">PREPARING NOW</span>
          <span className="h-3.5 w-px bg-buttermilk/35" aria-hidden />
          <span className="text-[13px] font-medium">Ready 6:30–7:00 pm tonight</span>
        </div>
        <span className="font-mono text-xs tracking-[0.06em]">Order #FF-24081</span>
      </div>

      <div className="flex items-start gap-6 p-6">
        <div
          className="h-[160px] w-[160px] shrink-0 rounded-xl"
          style={{ background: "linear-gradient(180deg, #d9a06a 0%, #522e24 100%)" }}
        />
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-[22px] font-semibold tracking-[-0.01em] text-forest">
              Amina Tesfaye
            </span>
            <Pill tone="ghost" className="text-[11px] px-2.5 py-1">
              Verified
            </Pill>
          </div>
          <span className="text-[13px] text-ink-70">
            215 DeKalb Ave · 0.6 mi from you · Pickup only
          </span>
          <div className="flex flex-col gap-1.5 pt-2">
            <OrderItem qty={1} name="Doro Wat + Injera" price="$16" />
            <OrderItem qty={2} name="Yemisir Wot" price="$24" />
            <OrderItem qty={1} name="Injera roll x6" price="$8" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-[10px] tracking-[0.16em] text-ink-50">
              TOTAL
            </span>
            <span className="font-display text-[28px] font-semibold tracking-[-0.02em] text-forest">
              $53.76
            </span>
            <span className="text-[11px] text-ink-50">Paid · Visa •• 4242</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              className="rounded-full bg-forest px-4 py-2.5 text-xs font-semibold text-buttermilk"
            >
              Get directions
            </button>
            <button
              type="button"
              className="rounded-full border border-forest px-4 py-2.5 text-xs font-medium text-forest"
            >
              Message Amina
            </button>
          </div>
        </div>
      </div>

      <Timeline />
    </div>
  );
}

function OrderItem({ qty, name, price }: { qty: number; name: string; price: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[13px] font-medium text-persimmon">{qty}×</span>
        <span className="text-[13px] text-forest">{name}</span>
      </div>
      <span className="font-mono text-[13px] text-forest">{price}</span>
    </div>
  );
}

function Timeline() {
  return (
    <div className="flex items-start px-6 pb-7">
      {TIMELINE.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-start">
          <div className="flex flex-1 flex-col items-center gap-2.5">
            <span
              className={`h-3.5 w-3.5 rounded-full border-2 ${
                step.state === "pending"
                  ? "border-line bg-buttermilk"
                  : step.state === "active"
                    ? "border-persimmon bg-persimmon"
                    : "border-forest bg-forest"
              }`}
              aria-hidden
            />
            <span
              className={`text-xs ${step.state === "pending" ? "text-ink-50" : "font-semibold text-forest"}`}
            >
              {step.label}
            </span>
            <span className="font-mono text-[10px] tracking-[0.06em] text-ink-50">
              {step.time}
            </span>
          </div>
          {i < TIMELINE.length - 1 && (
            <div
              className={`mt-[7px] h-0.5 flex-1 ${
                i < 2 ? "bg-forest" : i === 2 ? "bg-persimmon" : "bg-line"
              }`}
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PastOrdersHead() {
  return (
    <div className="flex items-end justify-between pt-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-forest">
          Past orders
        </h2>
        <p className="text-[13px] text-ink-70">
          You&apos;ve ordered from 8 different cooks. Rebook a favourite in one tap.
        </p>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2">
        <span className="text-xs font-medium text-forest">This month ⌄</span>
      </div>
    </div>
  );
}

function PastOrderRow({ order }: { order: (typeof PAST_ORDERS)[number] }) {
  const [month, day] = order.date.split(" ");
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-col items-center">
        <span className="font-mono text-[11px] tracking-[0.08em] text-persimmon">{month}</span>
        <span className="font-display text-[22px] font-semibold tracking-[-0.01em] text-forest">
          {day}
        </span>
      </div>
      <div className="h-[60px] w-px bg-line" />
      <div className="h-[72px] w-[72px] shrink-0 rounded-xl" style={{ background: order.gradient }} />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-display text-[16px] font-semibold tracking-[-0.01em] text-forest">
          {order.vendor}
        </span>
        <span className="text-xs text-ink-70">{order.dish}</span>
      </div>
      {order.reviewCta ? (
        <button
          type="button"
          className="rounded-full bg-persimmon px-3.5 py-2 text-xs font-semibold text-buttermilk"
        >
          Leave review
        </button>
      ) : (
        <span className="flex items-center gap-1.5">
          <StarIcon />
          <span className="font-mono text-xs text-forest">{order.rating}</span>
        </span>
      )}
      <span className="font-mono text-sm text-forest">{order.total}</span>
      <button
        type="button"
        className="rounded-full border border-forest px-3.5 py-2 text-xs font-medium text-forest"
      >
        Reorder
      </button>
    </div>
  );
}

function SidePanel() {
  return (
    <aside className="flex w-[340px] shrink-0 flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-forest p-6 text-buttermilk">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-persimmon" aria-hidden />
          <span className="font-mono text-[11px] tracking-[0.18em]">UP NEXT · TONIGHT</span>
        </div>
        <h3 className="font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">
          Pick up from
          <br />
          Amina at 6:30 pm.
        </h3>
        <p className="text-[13px] leading-[1.5]">
          215 DeKalb Ave, Brooklyn — a 3-minute walk from your apartment. Bring a bag; Amina
          always sends extra injera.
        </p>
        <div className="border-t border-buttermilk/25" />
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.16em]">COUNTDOWN</span>
          <span className="font-mono text-[13px] font-medium text-persimmon">2 h 18 min</span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-card p-6">
        <span className="font-display text-[17px] font-semibold tracking-[-0.01em] text-forest">
          Cooks you order most
        </span>
        {FAVOURITES.map((f) => (
          <div key={f.name} className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full" style={{ background: f.gradient }} />
            <div className="flex flex-1 flex-col">
              <span className="text-[13px] font-semibold text-forest">{f.name}</span>
              <span className="text-[11px] text-ink-50">{f.cuisine}</span>
            </div>
            <span className="font-mono text-xs text-forest">{f.orders}×</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-buttermilk p-5">
        <span className="text-[13px] font-semibold text-forest">
          Something wrong with an order?
        </span>
        <p className="text-xs leading-[1.5] text-ink-70">
          Report it within 24 hours — we refund fast and follow up with the cook.
        </p>
        <span className="text-xs font-medium text-persimmon">Contact FreshFork support →</span>
      </div>
    </aside>
  );
}

function StarIcon() {
  return (
    <svg width={11} height={11} viewBox="0 0 20 20" fill="var(--color-persimmon)" aria-hidden>
      <path d="M10 0l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7L3.8 19l1.6-7L0 7.3l7.1-.7z" />
    </svg>
  );
}
