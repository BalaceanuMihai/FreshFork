import Link from "next/link";

import { SiteNav } from "@/components/marketplace/SiteNav";
import { Pill } from "@/components/marketplace/Pill";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { displayName, requireViewer } from "@/lib/auth";
import { getMyMembership } from "@/lib/membership";
import { openBillingPortal } from "@/lib/actions/membership";
import { features } from "@/lib/env";

export const metadata = { title: "Your account · FreshFork" };

const ROLE_COPY: Record<string, { label: string; blurb: string; cta?: { href: string; label: string } }> = {
  customer: {
    label: "Customer",
    blurb: "Order from verified cooks nearby and pick up on your way home.",
    cta: { href: "/browse", label: "Browse tonight's kitchens" },
  },
  vendor: {
    label: "Cook",
    blurb:
      "Your kitchen tools land in Phase 2 — listings, pickup windows, and payouts.",
    cta: { href: "/browse", label: "See how other cooks list" },
  },
  admin: {
    label: "Admin",
    blurb: "Platform moderation and vendor verification.",
  },
};

export default async function AccountPage(props: PageProps<"/account">) {
  const params = await props.searchParams;
  const viewer = await requireViewer("/account");
  const role = viewer.profile?.role ?? "customer";
  const copy = ROLE_COPY[role];
  const denied = params.denied === "1";
  const welcome = typeof params.welcome === "string";
  const upgraded = params.upgraded === "1";
  const membership = await getMyMembership();

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <section className="mx-auto w-full max-w-[880px] px-6 py-16">
        {denied ? (
          <p
            role="alert"
            className="mb-8 rounded-xl border border-persimmon/40 bg-persimmon/10 px-4 py-3 text-sm text-cocoa"
          >
            That area is for a different kind of account.
          </p>
        ) : null}
        {welcome ? (
          <p className="mb-8 rounded-xl border border-sage bg-sage/15 px-4 py-3 text-sm text-forest">
            Welcome to FreshFork. Your account is live.
          </p>
        ) : null}
        {upgraded ? (
          <p className="mb-8 rounded-xl border border-sage bg-sage/15 px-4 py-3 text-sm text-forest">
            You&apos;re on FreshFork Plus. Special offers will show up on
            future orders.
          </p>
        ) : null}

        <div className="flex items-start justify-between gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
              <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
                YOUR ACCOUNT
              </span>
            </div>
            <h1 className="font-display text-[46px] font-semibold leading-[1.06] tracking-[-0.02em] text-forest">
              Hi, {displayName(viewer)}.
            </h1>
            <p className="max-w-lg text-[16px] leading-[1.55] text-ink-70">
              {copy.blurb}
            </p>
          </div>
          <SignOutButton />
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
          <Row label="Email" value={viewer.user.email ?? "—"} />
          <Row label="Role" value={<Pill tone="ghost">{copy.label}</Pill>} />
          <Row
            label="Name"
            value={viewer.profile?.full_name ?? "Not set yet"}
          />
          <Row
            label="Member since"
            value={new Date(viewer.user.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        </dl>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] tracking-[0.12em] text-ink-50">
                MEMBERSHIP
              </span>
              <span className="font-display text-[20px] font-semibold text-forest">
                {membership?.plan === "plus" ? "FreshFork Plus" : "Free"}
              </span>
              {membership?.plan === "plus" && membership.current_period_end ? (
                <span className="text-[13px] text-ink-50">
                  {membership.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                  {new Date(membership.current_period_end).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              ) : null}
            </div>
            <Pill tone={membership?.plan === "plus" ? "solid" : "outline"}>
              {membership?.plan === "plus" ? "Plus" : "Free"}
            </Pill>
          </div>

          {membership?.plan === "plus" ? (
            features.membership ? (
              <form action={openBillingPortal}>
                <button
                  type="submit"
                  className="self-start rounded-full border border-line px-5 py-2.5 text-[13px] font-medium text-forest"
                >
                  Manage billing
                </button>
              </form>
            ) : null
          ) : (
            <Link
              href="/pricing"
              className="self-start rounded-full bg-persimmon px-5 py-2.5 text-[13px] font-semibold text-buttermilk"
            >
              Upgrade to Plus →
            </Link>
          )}
        </div>

        {copy.cta ? (
          <Link
            href={copy.cta.href}
            className="mt-6 inline-flex rounded-full bg-forest px-7 py-3.5 text-sm font-semibold text-buttermilk"
          >
            {copy.cta.label}
          </Link>
        ) : null}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 bg-card px-6 py-5">
      <dt className="font-mono text-[11px] tracking-[0.12em] text-ink-50">
        {label.toUpperCase()}
      </dt>
      <dd className="text-[15px] text-forest">{value}</dd>
    </div>
  );
}
