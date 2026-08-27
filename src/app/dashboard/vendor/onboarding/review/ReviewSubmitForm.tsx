"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ChevronRight } from "lucide-react";

import { submitForReview } from "@/lib/actions/vendor-onboarding";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/lib/supabase/database.types";

export function ReviewSubmitForm({ vendor }: { vendor: Vendor }) {
  const [state, formAction, pending] = useActionState(submitForReview, {});

  const missing: { label: string; href: string }[] = [];
  if (!vendor.cuisine) missing.push({ label: "Business details", href: "/dashboard/vendor/onboarding/business" });
  if (!vendor.location) missing.push({ label: "Pickup address", href: "/dashboard/vendor/onboarding/address" });
  if (!vendor.cert_doc_path) missing.push({ label: "Certification", href: "/dashboard/vendor/onboarding/cert" });

  const canSubmit = missing.length === 0 && (vendor.status === "draft" || vendor.status === "changes_requested");

  return (
    <div className="space-y-3">
      {missing.length > 0 ? (
        <div className="bg-secondary rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium">Still needed before we can review:</p>
          <ul className="space-y-1">
            {missing.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-primary hover:underline flex items-center gap-1">
                  {item.label} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      {canSubmit ? (
        <form action={formAction}>
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Submitting…" : "Submit for review"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
