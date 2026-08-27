import Link from "next/link";
import Image from "next/image";
import { Award, BadgeCheck, Leaf, Package, Search, Shield, ShoppingBag } from "lucide-react";

import { getDiscoveryStats, getLiveCities } from "@/lib/discovery";
import { buttonClasses } from "@/components/ui/button";

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "Find a cook near you",
    body: "Search by cuisine or dish. Browse vetted home cooks with full menus, pickup schedules, and verified food-safety certifications.",
  },
  {
    icon: ShoppingBag,
    title: "Order and pay securely",
    body: "Pick a pickup time slot, add a note to the kitchen, and pay via Stripe. Your card details never touch FreshFork servers.",
  },
  {
    icon: Package,
    title: "Pick up your meal",
    body: "Get a pickup code. Collect your meal at the agreed time, then leave a review — the cook can reply.",
  },
];

const TRUST_SIGNALS = [
  {
    icon: Shield,
    title: "Verified food-safety certs",
    body: "Every cook submits their local food-handler certification before going live. Our team reviews each application.",
  },
  {
    icon: BadgeCheck,
    title: "Secure payments via Stripe",
    body: "Your payment is held until you confirm pickup. Full refund if the cook cancels. No card data stored on FreshFork.",
  },
  {
    icon: Leaf,
    title: "Honest allergen labelling",
    body: "Every dish lists its allergens clearly. If something's wrong, you can report it instantly — our safety team responds fast.",
  },
];

export default async function Home() {
  const [stats, cities] = await Promise.all([getDiscoveryStats(null, null), getLiveCities()]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#2c1810] min-h-[480px] flex items-center">
        <Image
          src="https://images.unsplash.com/photo-1731316392480-292c584d943e?w=1400&h=700&fit=crop&auto=format"
          alt="Vibrant street food market in Europe"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-50"
        />
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 bg-primary/20 text-white text-xs font-medium px-3 py-1 rounded-full border border-primary/30 backdrop-blur-sm">
              <Award className="w-3 h-3" /> {stats.vendors} verified {stats.vendors === 1 ? "cook" : "cooks"} ·{" "}
              {stats.cuisines} {stats.cuisines === 1 ? "cuisine" : "cuisines"}
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-semibold text-white leading-tight">
              Real kitchens.
              <br />
              Real cooks.
              <br />
              <span className="text-[#e8a882]">Real food.</span>
            </h1>
            <p className="text-white/80 text-lg max-w-xl">
              FreshFork connects you with verified home cooks in your neighborhood. Order for pickup, meet the
              person who made it, eat something honest.
            </p>
            <div className="flex gap-3">
              <Link href="/browse" className={buttonClasses("primary", "px-6 py-3 text-base")}>
                Find cooks near you
              </Link>
              <Link
                href="/signup"
                className={buttonClasses("outline", "px-6 py-3 text-base border-white/40 text-white hover:bg-white/10 hover:text-white")}
              >
                Cook with us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live cities */}
      {cities.length > 0 ? (
        <section className="bg-secondary border-y border-border py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 max-w-4xl mx-auto">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest whitespace-nowrap">
              Now live in
            </span>
            <span className="text-border hidden sm:inline">·</span>
            {cities.map((city, i) => (
              <span key={city} className="flex items-center gap-2 text-sm font-medium text-foreground whitespace-nowrap">
                {city}
                {i < cities.length - 1 ? <span className="text-border hidden sm:inline select-none ml-4">·</span> : null}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* How it works */}
      <section className="bg-secondary border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="font-display text-3xl font-semibold text-center mb-10">How FreshFork works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step {i + 1}</div>
                <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="font-display text-2xl font-semibold mb-8">Every cook is real. Every kitchen is checked.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TRUST_SIGNALS.map((t) => (
            <div key={t.title} className="bg-card rounded-xl border border-border p-5 space-y-2">
              <t.icon className="w-6 h-6 text-primary" />
              <h4 className="font-medium text-foreground">{t.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-4 py-16 text-center">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="font-display text-3xl font-semibold text-primary-foreground">Ready to eat well?</h2>
          <p className="text-primary-foreground/80">Find a cook near you in seconds.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className={buttonClasses("outline", "bg-primary-foreground text-foreground border-0 hover:bg-primary-foreground/90")}
            >
              Sign up free
            </Link>
            <Link
              href="/pricing"
              className={buttonClasses("ghost", "text-primary-foreground hover:bg-white/10 border border-white/30")}
            >
              See pricing plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-display font-semibold text-foreground">FreshFork</span>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/browse" className="hover:text-foreground">
              Browse
            </Link>
          </div>
          <span>© {new Date().getFullYear()} FreshFork · Amsterdam</span>
        </div>
      </footer>
    </div>
  );
}
