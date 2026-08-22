import Link from "next/link";
import type { ReactNode } from "react";

import type { Vendor } from "@/lib/supabase/database.types";

export const ONBOARDING_STEPS = [
  { slug: "business", label: "Business", href: "/dashboard/vendor/onboarding/business" },
  { slug: "address", label: "Pickup", href: "/dashboard/vendor/onboarding/address" },
  { slug: "cert", label: "Certification", href: "/dashboard/vendor/onboarding/cert" },
  { slug: "windows", label: "Hours", href: "/dashboard/vendor/onboarding/windows" },
  { slug: "payouts", label: "Payouts", href: "/dashboard/vendor/onboarding/payouts" },
  { slug: "review", label: "Review", href: "/dashboard/vendor/onboarding/review" },
] as const;

export type StepSlug = (typeof ONBOARDING_STEPS)[number]["slug"];

/** Steps the vendor has already saved, derived from the row itself. */
function completedSteps(vendor: Vendor | null): Set<string> {
  const done = new Set<string>();
  if (!vendor) return done;
  if (vendor.cuisine) done.add("business");
  if (vendor.location) done.add("address");
  if (vendor.cert_doc_path) done.add("cert");
  if (vendor.stripe_connect_status === "complete") done.add("payouts");
  if (vendor.status !== "draft") done.add("review");
  return done;
}

export function OnboardingShell({
  vendor,
  current,
  title,
  intro,
  children,
}: {
  vendor: Vendor | null;
  current: StepSlug;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const done = completedSteps(vendor);

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-14">
      <div className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
        <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
          SET UP YOUR KITCHEN
        </span>
      </div>

      <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-3">
        {ONBOARDING_STEPS.map((step, index) => {
          const isCurrent = step.slug === current;
          const isDone = done.has(step.slug) && !isCurrent;
          return (
            <li key={step.slug} className="flex items-center gap-2">
              <Link
                href={step.href}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium ${
                  isCurrent
                    ? "border-transparent bg-forest text-buttermilk"
                    : isDone
                      ? "border-sage bg-transparent text-forest"
                      : "border-line bg-transparent text-ink-50"
                }`}
              >
                <span className="font-mono text-[10px] tracking-[0.1em]">
                  {isDone ? "✓" : String(index + 1).padStart(2, "0")}
                </span>
                {step.label}
              </Link>
              {index < ONBOARDING_STEPS.length - 1 ? (
                <span className="h-px w-4 bg-line" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>

      <h1 className="mt-10 font-display text-[42px] font-semibold leading-[1.06] tracking-[-0.02em] text-forest">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-[16px] leading-[1.55] text-ink-70">{intro}</p>

      <div className="mt-10 rounded-3xl border border-line bg-card p-8">{children}</div>
    </div>
  );
}
