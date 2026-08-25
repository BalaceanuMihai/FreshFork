import Link from "next/link";

import { getOwnVendor } from "@/lib/vendors-data";
import type { Vendor } from "@/lib/supabase/database.types";

const STEPS = [
  { slug: "business", label: "Business", href: "/dashboard/vendor/onboarding/business" },
  { slug: "address", label: "Pickup", href: "/dashboard/vendor/onboarding/address" },
  { slug: "cert", label: "Certification", href: "/dashboard/vendor/onboarding/cert" },
  { slug: "windows", label: "Hours", href: "/dashboard/vendor/onboarding/windows" },
  { slug: "payouts", label: "Payouts", href: "/dashboard/vendor/onboarding/payouts" },
  { slug: "review", label: "Review", href: "/dashboard/vendor/onboarding/review" },
] as const;

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

export default async function OnboardingLayout({ children }: LayoutProps<"/dashboard/vendor/onboarding">) {
  const vendor = await getOwnVendor();
  const done = completedSteps(vendor);

  return (
    <div>
      <p>Set up your kitchen</p>
      <ol>
        {STEPS.map((step) => (
          <li key={step.slug}>
            <Link href={step.href}>
              {done.has(step.slug) ? "✓ " : ""}
              {step.label}
            </Link>
          </li>
        ))}
      </ol>
      {children}
    </div>
  );
}
