import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <TopNav />
      <UtilityStrip />
      <Hero />
      <TrustStrip />
      <Footer />
    </div>
  );
}

function TopNav() {
  return (
    <nav className="flex items-center gap-10 px-16 py-5 bg-buttermilk">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-persimmon" aria-hidden />
        <span className="font-display text-[22px] font-semibold tracking-tight text-forest">
          FreshFork
        </span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-forest px-3 py-1.5 text-xs font-medium text-forest">
        Brooklyn, NY · 3 mi ⌄
      </span>
      <div className="flex flex-1 items-center justify-center gap-8 text-sm font-medium text-forest">
        <NavTab label="Discover" active />
        <NavTab label="Browse" />
        <NavTab label="Orders" />
        <NavTab label="Saved" />
      </div>
      <div className="flex items-center gap-5">
        <Link href="#" className="text-sm font-medium text-forest">
          Sign in
        </Link>
        <Link
          href="#"
          className="rounded-full bg-forest px-4 py-2.5 text-[13px] font-semibold text-buttermilk"
        >
          Cook with us
        </Link>
      </div>
    </nav>
  );
}

function NavTab({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={active ? "font-semibold" : ""}>{label}</span>
      <span
        className={`h-0.5 w-5 rounded-full ${active ? "bg-persimmon" : "bg-transparent"}`}
        aria-hidden
      />
    </div>
  );
}

function UtilityStrip() {
  return (
    <div className="flex items-center gap-4 bg-forest px-16 py-3 text-buttermilk">
      <div className="flex flex-1 items-center gap-3">
        <span className="font-mono text-[11px] tracking-[0.12em]">
          WEEK OF SEP 22
        </span>
        <span className="h-3 w-px bg-buttermilk/35" aria-hidden />
        <span className="text-[13px]">
          24 verified cooks within 3 mi of Fort Greene
        </span>
      </div>
      <span className="text-xs font-medium">
        Pickup only · See what your neighbors are cooking →
      </span>
    </div>
  );
}

function Hero() {
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
        <div className="flex items-center gap-2 self-start rounded-full border border-line bg-card p-1.5">
          <div className="flex items-center gap-2.5 px-5 py-3">
            <span className="h-2 w-2 rounded-full bg-persimmon" aria-hidden />
            <span className="text-[15px] font-medium text-forest">
              215 DeKalb Ave, Brooklyn
            </span>
            <span className="text-sm text-ink-50">
              &nbsp;&nbsp;|&nbsp;&nbsp;Tonight · Pickup 6–8 pm
            </span>
          </div>
          <button
            type="button"
            className="rounded-full bg-forest px-7 py-3.5 text-sm font-semibold text-buttermilk"
          >
            Find cooks
          </button>
        </div>
        <div className="flex items-center gap-10 pt-2">
          <Stat num="312" label="Verified cooks" />
          <Stat num="48" label="Cuisines" />
          <Stat num="4.9" label="Avg cook rating" />
        </div>
      </div>
      <div className="flex flex-col items-end -space-y-12">
        <FeatureCard size="lg" />
        <FeatureCard size="sm" />
      </div>
    </section>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[28px] tracking-tight text-forest">
        {num}
      </span>
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
          background:
            "linear-gradient(180deg, #dba073 0%, #593323 100%)",
        }}
      >
        <div className="absolute inset-x-6 bottom-5 flex items-center gap-3.5 rounded-xl bg-card/95 px-5 py-4">
          <div className="h-11 w-11 rounded-full bg-persimmon" aria-hidden />
          <div className="flex flex-1 flex-col">
            <span className="font-display text-[17px] font-semibold text-forest">
              Amina&apos;s Lamb Berbere
            </span>
            <span className="text-xs text-ink-50">
              Amina T. · Fort Greene · 0.6 mi
            </span>
          </div>
          <span className="font-mono text-[15px] font-medium text-forest">
            $16
          </span>
        </div>
      </div>
    );
  }
  return (
    <div
      className="h-[300px] w-[240px] rounded-2xl border border-line"
      style={{
        background:
          "linear-gradient(135deg, #efd88c 0%, #8ea56b 100%)",
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
        <TrustCol num="01" title="Food-handler cert" body="Uploaded, checked, and displayed on every profile." />
        <TrustCol num="02" title="Allergens labeled" body="Structured — never buried in the description." />
        <TrustCol num="03" title="Verified badge" body="Only after our team reviews the paperwork." />
      </div>
    </section>
  );
}

function TrustCol({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col gap-3.5">
      <span className="font-mono text-[11px] tracking-[0.2em] text-persimmon">
        {num}
      </span>
      <h3 className="font-display text-[20px] font-semibold tracking-tight">
        {title}
      </h3>
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
