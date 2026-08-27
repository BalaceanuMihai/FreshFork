import Link from "next/link";
import { Check } from "lucide-react";

import { getOwnVendor } from "@/lib/vendors-data";
import { cn } from "@/lib/cn";
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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">Set up your kitchen</p>
        <ol className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((step, i) => {
            const isDone = done.has(step.slug);
            return (
              <li key={step.slug} className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    isDone
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {isDone ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 text-center leading-3">{i + 1}</span>}
                  {step.label}
                </Link>
                {i < STEPS.length - 1 ? <span className="w-3 h-px bg-border shrink-0" /> : null}
              </li>
            );
          })}
        </ol>
      </div>
      {children}
    </div>
  );
}
